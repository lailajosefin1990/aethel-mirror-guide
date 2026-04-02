import { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

export interface Client {
  id: string;
  client_name: string;
  client_email: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  notes: string | null;
  created_at: string;
}

export interface Practitioner {
  id: string;
  display_name: string;
}

const MAX_CLIENTS = 20;

export function usePractitionerClients(user: User | null) {
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      let { data: prac } = await supabase
        .from("practitioners")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!prac) {
        const { data: newPrac } = await supabase
          .from("practitioners")
          .insert({ user_id: user.id, display_name: user.email?.split("@")[0] || "Practitioner" })
          .select("id, display_name")
          .single();
        prac = newPrac;
      }

      if (prac) {
        setPractitioner(prac);
        const { data: clientList } = await supabase
          .from("practitioner_clients")
          .select("*")
          .eq("practitioner_id", prac.id)
          .order("created_at", { ascending: false });
        setClients(clientList || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const addClient = useCallback(async (form: {
    name: string; email: string; birthDate: string; birthTime: string;
    birthTimeUnknown: boolean; birthPlace: string; notes: string;
  }) => {
    if (!practitioner || !form.name.trim()) return false;
    if (clients.length >= MAX_CLIENTS) return "limit";

    const { data, error } = await supabase
      .from("practitioner_clients")
      .insert({
        practitioner_id: practitioner.id,
        client_name: form.name.trim(),
        client_email: form.email.trim() || null,
        birth_date: form.birthDate || null,
        birth_time: form.birthTimeUnknown ? null : (form.birthTime || null),
        birth_place: form.birthPlace.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();

    if (!error && data) {
      setClients((prev) => [data as Client, ...prev]);
      toast.success("Client added");
      return true;
    }
    return false;
  }, [practitioner, clients.length]);

  const updateClient = useCallback(async (clientId: string, form: {
    name: string; email: string; birthDate: string; birthTime: string;
    birthTimeUnknown: boolean; birthPlace: string; notes: string;
  }) => {
    if (!form.name.trim()) return false;

    const { error } = await supabase
      .from("practitioner_clients")
      .update({
        client_name: form.name.trim(),
        client_email: form.email.trim() || null,
        birth_date: form.birthDate || null,
        birth_time: form.birthTimeUnknown ? null : (form.birthTime || null),
        birth_place: form.birthPlace.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq("id", clientId);

    if (!error) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                client_name: form.name.trim(),
                client_email: form.email.trim() || null,
                birth_date: form.birthDate || null,
                birth_time: form.birthTimeUnknown ? null : (form.birthTime || null),
                birth_place: form.birthPlace.trim() || null,
                notes: form.notes.trim() || null,
              }
            : c
        )
      );
      toast.success("Client updated");
      return true;
    }
    return false;
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    await supabase.from("practitioner_clients").delete().eq("id", id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    toast.success("Client removed");
  }, []);

  return {
    practitioner,
    clients,
    loading,
    maxClients: MAX_CLIENTS,
    addClient,
    updateClient,
    deleteClient,
  };
}

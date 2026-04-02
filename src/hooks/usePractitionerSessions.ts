import { useState, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReadingData } from "@/lib/reading";
import type { Client, Practitioner } from "./usePractitionerClients";

export interface PractitionerReading {
  id: string;
  domain: string;
  question: string;
  reading_json: ReadingData;
  created_at: string;
}

const DOMAINS = [
  "Work & money",
  "Love & people",
  "Visibility",
  "Body & health",
  "Everything at once",
];

export function usePractitionerSessions(practitioner: Practitioner | null) {
  const [clientReadings, setClientReadings] = useState<PractitionerReading[]>([]);
  const [expandedReadingId, setExpandedReadingId] = useState<string | null>(null);
  const [readingDomain, setReadingDomain] = useState(DOMAINS[0]);
  const [readingQuestion, setReadingQuestion] = useState("");
  const [readingData, setReadingData] = useState<ReadingData | null>(null);

  const loadClientReadings = useCallback(async (clientId: string) => {
    if (!practitioner) return;
    const { data } = await supabase
      .from("practitioner_readings")
      .select("*")
      .eq("client_id", clientId)
      .eq("practitioner_id", practitioner.id)
      .order("created_at", { ascending: false });
    setClientReadings((data || []) as unknown as PractitionerReading[]);
    setExpandedReadingId(null);
  }, [practitioner]);

  const generateReading = useCallback(async (client: Client) => {
    const { data, error } = await supabase.functions.invoke("generate-reading", {
      body: {
        domain: readingDomain,
        question: readingQuestion,
        mode: "Both",
        birthDate: client.birth_date
          ? new Date(client.birth_date).toLocaleDateString("en-GB")
          : "unknown",
        birthPlace: client.birth_place || "unknown",
        birthTime: client.birth_time || "unknown",
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    setReadingData(data as ReadingData);
  }, [readingDomain, readingQuestion]);

  const saveReading = useCallback(async (clientId: string) => {
    if (!practitioner || !readingData) return;

    await supabase.from("practitioner_readings").insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      domain: readingDomain,
      question: readingQuestion,
      reading_json: readingData as any,
    });

    toast.success("Reading saved to client file");
  }, [practitioner, readingData, readingDomain, readingQuestion]);

  const resetReading = useCallback(() => {
    setReadingQuestion("");
    setReadingDomain(DOMAINS[0]);
    setReadingData(null);
  }, []);

  return {
    domains: DOMAINS,
    clientReadings,
    expandedReadingId,
    setExpandedReadingId,
    readingDomain,
    setReadingDomain,
    readingQuestion,
    setReadingQuestion,
    readingData,
    loadClientReadings,
    generateReading,
    saveReading,
    resetReading,
  };
}

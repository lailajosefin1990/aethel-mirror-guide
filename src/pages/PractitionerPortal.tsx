import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, X, User, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { ReadingData } from "@/lib/reading";
import ReadingOutput from "@/components/ReadingOutput";
import ReadingLoader from "@/components/ReadingLoader";

interface Client {
  id: string;
  client_name: string;
  client_email: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  notes: string | null;
  created_at: string;
}

interface PractitionerReading {
  id: string;
  domain: string;
  question: string;
  reading_json: ReadingData;
  created_at: string;
}

type PortalView = "clients" | "add_client" | "edit_client" | "client_detail" | "new_reading" | "loading" | "reading_result";

const MAX_CLIENTS = 20;

const DOMAINS = [
  "Work & money",
  "Love & people",
  "Visibility",
  "Body & health",
  "Everything at once",
];

const PractitionerPortal = () => {
  const { user, subscriptionTier } = useAuth();
  const navigate = useNavigate();
  const [practitioner, setPractitioner] = useState<{ id: string; display_name: string } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [view, setView] = useState<PortalView>("clients");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientReadings, setClientReadings] = useState<PractitionerReading[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formBirthTime, setFormBirthTime] = useState("");
  const [formBirthPlace, setFormBirthPlace] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Reading state
  const [readingDomain, setReadingDomain] = useState(DOMAINS[0]);
  const [readingQuestion, setReadingQuestion] = useState("");
  const [readingData, setReadingData] = useState<ReadingData | null>(null);

  const sectionLabel = "font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3";
  const inputClass = "w-full px-4 py-3 rounded-sm bg-background text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300";

  // Load practitioner profile and clients
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check/create practitioner record
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

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormBirthDate("");
    setFormBirthTime("");
    setFormBirthPlace("");
    setFormNotes("");
  };

  const handleAddClient = async () => {
    if (!practitioner || !formName.trim()) return;
    if (clients.length >= MAX_CLIENTS) {
      toast.error(`Maximum ${MAX_CLIENTS} clients reached`);
      return;
    }

    const { data, error } = await supabase
      .from("practitioner_clients")
      .insert({
        practitioner_id: practitioner.id,
        client_name: formName.trim(),
        client_email: formEmail.trim() || null,
        birth_date: formBirthDate || null,
        birth_time: formBirthTime || null,
        birth_place: formBirthPlace.trim() || null,
        notes: formNotes.trim() || null,
      })
      .select()
      .single();

    if (!error && data) {
      setClients((prev) => [data as Client, ...prev]);
      resetForm();
      setView("clients");
      toast.success("Client added");
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient || !formName.trim()) return;

    const { error } = await supabase
      .from("practitioner_clients")
      .update({
        client_name: formName.trim(),
        client_email: formEmail.trim() || null,
        birth_date: formBirthDate || null,
        birth_time: formBirthTime || null,
        birth_place: formBirthPlace.trim() || null,
        notes: formNotes.trim() || null,
      })
      .eq("id", selectedClient.id);

    if (!error) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id
            ? { ...c, client_name: formName.trim(), client_email: formEmail.trim() || null, birth_date: formBirthDate || null, birth_time: formBirthTime || null, birth_place: formBirthPlace.trim() || null, notes: formNotes.trim() || null }
            : c
        )
      );
      setView("client_detail");
      toast.success("Client updated");
    }
  };

  const handleDeleteClient = async (id: string) => {
    await supabase.from("practitioner_clients").delete().eq("id", id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    setView("clients");
    toast.success("Client removed");
  };

  const openClientDetail = async (client: Client) => {
    setSelectedClient(client);
    if (!practitioner) return;
    const { data } = await supabase
      .from("practitioner_readings")
      .select("*")
      .eq("client_id", client.id)
      .eq("practitioner_id", practitioner.id)
      .order("created_at", { ascending: false });
    setClientReadings((data || []) as PractitionerReading[]);
    setView("client_detail");
  };

  const openEditClient = (client: Client) => {
    setSelectedClient(client);
    setFormName(client.client_name);
    setFormEmail(client.client_email || "");
    setFormBirthDate(client.birth_date || "");
    setFormBirthTime(client.birth_time || "");
    setFormBirthPlace(client.birth_place || "");
    setFormNotes(client.notes || "");
    setView("edit_client");
  };

  const startReading = () => {
    setReadingQuestion("");
    setReadingDomain(DOMAINS[0]);
    setView("new_reading");
  };

  const generateReading = useCallback(async () => {
    if (!selectedClient) throw new Error("No client selected");

    const { data, error } = await supabase.functions.invoke("generate-reading", {
      body: {
        domain: readingDomain,
        question: readingQuestion,
        mode: "Both",
        birthDate: selectedClient.birth_date
          ? new Date(selectedClient.birth_date).toLocaleDateString("en-GB")
          : "unknown",
        birthPlace: selectedClient.birth_place || "unknown",
        birthTime: selectedClient.birth_time || "unknown",
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    setReadingData(data as ReadingData);
  }, [selectedClient, readingDomain, readingQuestion]);

  const handleSaveReading = async () => {
    if (!practitioner || !selectedClient || !readingData) return;

    await supabase.from("practitioner_readings").insert({
      practitioner_id: practitioner.id,
      client_id: selectedClient.id,
      domain: readingDomain,
      question: readingQuestion,
      reading_json: readingData as any,
    });

    toast.success("Reading saved to client file");
    openClientDetail(selectedClient);
  };

  if (!user) {
    navigate("/");
    return null;
  }

  if (subscriptionTier !== "practitioner" && subscriptionTier !== "mirror_pro") {
    return (
      <section className="min-h-screen px-5 py-8">
        <div className="w-full max-w-app mx-auto text-center pt-20">
          <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-6">
            P R A C T I T I O N E R &nbsp; P O R T A L
          </p>
          <h2 className="font-display text-[22px] text-foreground mb-4">
            Built for coaches, astrologers, and therapists.
          </h2>
          <p className="font-body text-[14px] text-muted-foreground mb-8 leading-relaxed">
            Run readings for your clients, manage their profiles, and build a deeper practice — all in one place.
          </p>
          <button
            onClick={() => navigate("/")}
            className="h-[48px] px-8 rounded-sm border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300"
          >
            ← Back to mirror
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <p className="font-body text-[14px] text-muted-foreground">Loading...</p>
      </section>
    );
  }

  return (
    <section className="min-h-screen px-5 py-8">
      <div className="w-full max-w-app mx-auto">
        <AnimatePresence mode="wait">
          {/* ─── Client List ─── */}
          {view === "clients" && (
            <motion.div key="clients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate("/")} className="text-foreground/50 hover:text-foreground/70 transition-colors">
                  <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <p className="font-display text-[14px] tracking-[0.35em] text-primary">
                  C L I E N T S
                </p>
                <span className="font-body text-[12px] text-muted-foreground">
                  {clients.length}/{MAX_CLIENTS}
                </span>
              </div>

              {clients.length === 0 ? (
                <div className="text-center pt-16">
                  <User className="w-10 h-10 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
                  <p className="font-body text-[14px] text-muted-foreground mb-6">No clients yet</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => openClientDetail(client)}
                      className="w-full bg-card border border-border rounded-md p-4 flex items-center justify-between hover:border-foreground/20 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-card-foreground">{client.client_name}</p>
                        {client.birth_place && (
                          <p className="font-body text-[12px] text-muted-foreground">{client.birth_place}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => { resetForm(); setView("add_client"); }}
                disabled={clients.length >= MAX_CLIENTS}
                className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                Add client
              </button>
            </motion.div>
          )}

          {/* ─── Add / Edit Client Form ─── */}
          {(view === "add_client" || view === "edit_client") && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                onClick={() => view === "edit_client" && selectedClient ? openClientDetail(selectedClient) : setView("clients")}
                className="mb-8 text-foreground/50 hover:text-foreground/70 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>

              <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-8">
                {view === "add_client" ? "N E W  C L I E N T" : "E D I T  C L I E N T"}
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <p className={sectionLabel}>N A M E *</p>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Client name" className={inputClass} />
                </div>
                <div>
                  <p className={sectionLabel}>E M A I L</p>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Optional" className={inputClass} />
                </div>
                <div>
                  <p className={sectionLabel}>B I R T H &nbsp; D A T E</p>
                  <input type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={sectionLabel}>B I R T H &nbsp; T I M E</p>
                  <input type="time" value={formBirthTime} onChange={(e) => setFormBirthTime(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={sectionLabel}>B I R T H &nbsp; P L A C E</p>
                  <input value={formBirthPlace} onChange={(e) => setFormBirthPlace(e.target.value)} placeholder="City, country" className={inputClass} />
                </div>
                <div>
                  <p className={sectionLabel}>N O T E S</p>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Session notes, context..." rows={3} className={`${inputClass} resize-none`} />
                </div>
              </div>

              <button
                onClick={view === "add_client" ? handleAddClient : handleUpdateClient}
                disabled={!formName.trim()}
                className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300 disabled:opacity-50"
              >
                {view === "add_client" ? "Add client" : "Save changes"}
              </button>

              {view === "edit_client" && selectedClient && (
                <button
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  className="w-full h-[48px] mt-3 rounded-sm border border-destructive/30 text-destructive font-body text-[14px] hover:bg-destructive/10 transition-all duration-300"
                >
                  Remove client
                </button>
              )}
            </motion.div>
          )}

          {/* ─── Client Detail ─── */}
          {view === "client_detail" && selectedClient && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => setView("clients")} className="mb-8 text-foreground/50 hover:text-foreground/70 transition-colors">
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-[22px] text-foreground">{selectedClient.client_name}</h2>
                  {selectedClient.birth_place && (
                    <p className="font-body text-[12px] text-muted-foreground">{selectedClient.birth_place}</p>
                  )}
                </div>
                <button
                  onClick={() => openEditClient(selectedClient)}
                  className="font-body text-[12px] text-primary hover:text-primary/80 transition-colors"
                >
                  Edit
                </button>
              </div>

              {/* Birth info */}
              {selectedClient.birth_date && (
                <div className="bg-card border border-border rounded-md p-4 mb-6">
                  <p className={sectionLabel}>B I R T H &nbsp; D A T A</p>
                  <p className="font-body text-[13px] text-card-foreground">
                    {new Date(selectedClient.birth_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    {selectedClient.birth_time && ` at ${selectedClient.birth_time}`}
                    {selectedClient.birth_place && ` — ${selectedClient.birth_place}`}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedClient.notes && (
                <div className="bg-card border border-border rounded-md p-4 mb-6">
                  <p className={sectionLabel}>N O T E S</p>
                  <p className="font-body text-[13px] text-card-foreground whitespace-pre-wrap">{selectedClient.notes}</p>
                </div>
              )}

              {/* Past readings */}
              <p className={`${sectionLabel} mb-4`}>R E A D I N G S &nbsp; ({clientReadings.length})</p>
              {clientReadings.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {clientReadings.map((r) => (
                    <div key={r.id} className="bg-card border border-border rounded-md p-4">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="font-body text-[11px] uppercase tracking-wider text-primary">{r.domain}</span>
                        <span className="font-body text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="font-body text-[13px] text-card-foreground mb-1">{r.question}</p>
                      <p className="font-body text-[12px] text-muted-foreground italic">
                        {(r.reading_json as any)?.third_way?.slice(0, 80)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-[13px] text-muted-foreground mb-6">No readings yet for this client.</p>
              )}

              <button
                onClick={startReading}
                className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Run a reading for {selectedClient.client_name.split(" ")[0]}
              </button>
            </motion.div>
          )}

          {/* ─── New Reading ─── */}
          {view === "new_reading" && selectedClient && (
            <motion.div key="new_reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => openClientDetail(selectedClient)} className="mb-8 text-foreground/50 hover:text-foreground/70 transition-colors">
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>

              <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-2">
                R E A D I N G &nbsp; F O R
              </p>
              <p className="font-display text-[18px] text-foreground mb-8">{selectedClient.client_name}</p>

              <div className="space-y-4 mb-8">
                <div>
                  <p className={sectionLabel}>D O M A I N</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DOMAINS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setReadingDomain(d)}
                        className={`px-3 py-2.5 rounded-sm border font-body text-[13px] transition-all duration-200 ${
                          readingDomain === d
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground/60 hover:border-foreground/30"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className={sectionLabel}>Q U E S T I O N</p>
                  <textarea
                    value={readingQuestion}
                    onChange={(e) => setReadingQuestion(e.target.value)}
                    placeholder="What is the client sitting with?"
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              <button
                onClick={() => setView("loading")}
                disabled={!readingQuestion.trim()}
                className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300 disabled:opacity-50"
              >
                Generate reading
              </button>
            </motion.div>
          )}

          {/* ─── Loading ─── */}
          {view === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReadingLoader
                onComplete={() => setView("reading_result")}
                onError={() => { toast.error("Reading failed"); setView("new_reading"); }}
                generateReading={generateReading}
              />
            </motion.div>
          )}

          {/* ─── Reading Result ─── */}
          {view === "reading_result" && readingData && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReadingOutput
                domain={readingDomain}
                question={readingQuestion}
                reading={readingData}
                onSave={handleSaveReading}
                onBack={() => setView("new_reading")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default PractitionerPortal;

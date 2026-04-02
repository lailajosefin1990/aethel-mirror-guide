import { useState, useEffect, useCallback, useRef } from "react";
import * as Sentry from "@sentry/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, X, User, ChevronRight, Sparkles, FileText, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { ReadingData } from "@/lib/reading";
import { CONFIDENCE_MESSAGES } from "@/lib/reading";
import ReadingLoader from "@/components/ReadingLoader";
import { STRIPE_TIERS } from "@/lib/stripe";
import { track } from "@/lib/posthog";

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

// ─── Practitioner Reading Output ───
const PractitionerReadingOutput = ({
  reading,
  domain,
  clientName,
  practitionerName,
  onSave,
  onBack,
}: {
  reading: ReadingData;
  domain: string;
  clientName: string;
  practitionerName: string;
  onSave: () => void;
  onBack: () => void;
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const sectionLabel = "font-body text-[11px] uppercase tracking-[0.35em] text-muted-foreground mb-4";
  const confidenceText = CONFIDENCE_MESSAGES[reading.confidence_level] || CONFIDENCE_MESSAGES.medium;

  const handlePrint = () => {
    track("practitioner_pdf_exported");
    window.print();
  };

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #practitioner-print, #practitioner-print * { visibility: visible; }
          #practitioner-print {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; color: black !important;
            padding: 40px;
          }
          #practitioner-print .no-print { display: none !important; }
          #practitioner-print .print-header { display: block !important; }
          #practitioner-print .print-footer { display: block !important; }
          #practitioner-print p, #practitioner-print span, #practitioner-print h2 {
            color: black !important;
          }
          #practitioner-print .text-primary { color: #666 !important; }
          #practitioner-print .text-muted-foreground { color: #888 !important; }
          #practitioner-print .border-primary\\/40 { border-color: #ccc !important; }
        }
      `}</style>

      <div id="practitioner-print" ref={printRef}>
        {/* Print header */}
        <div className="print-header hidden mb-8">
          <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{practitionerName}</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Session prep — {clientName}</p>
          <p style={{ fontSize: 11, color: "#888" }}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        {/* Back */}
        <button onClick={onBack} className="mb-4 text-foreground/50 hover:text-foreground/70 transition-colors no-print">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Session prep banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-md px-4 py-3 mb-6">
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-primary mb-1">S E S S I O N &nbsp; P R E P</p>
          <p className="font-display text-[16px] text-foreground">{clientName}</p>
        </div>

        {/* Domain */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-[11px] uppercase tracking-[0.2em] text-primary mb-10">
          {domain}
        </motion.p>

        {/* Stars */}
        <div className="mb-10">
          <p className={sectionLabel}>W H A T &nbsp; Y O U R &nbsp; S T A R S &nbsp; S A Y</p>
          <p className="font-display text-[16px] leading-[1.6] text-foreground">{reading.astrology_reading}</p>
        </div>

        {/* Design */}
        <div className="mb-10">
          <p className={sectionLabel}>W H A T &nbsp; Y O U R &nbsp; D E S I G N &nbsp; S A Y S</p>
          <div className="space-y-4">
            {reading.design_insights.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-primary mt-1 shrink-0">—</span>
                <span className="font-display text-[16px] leading-[1.6] text-foreground">{item.replace(/^—\s*/, "")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence */}
        <p className="font-body text-[13px] italic text-primary/80 mb-10">{confidenceText}</p>

        {/* Third Way */}
        <div className="border-t-2 border-primary/40 pt-8 mb-10">
          <p className={`${sectionLabel} text-center`}>Y O U R &nbsp; T H I R D &nbsp; W A Y</p>
          <p className="font-display text-[22px] sm:text-[24px] leading-[1.4] text-foreground text-center font-medium">
            {reading.third_way}
          </p>
        </div>

        {/* Journal */}
        <div className="bg-card border border-border rounded-md p-5 mb-8">
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">J O U R N A L</p>
          <p className="font-display text-[16px] leading-[1.6] text-card-foreground">{reading.journal_prompt}</p>
        </div>

        {/* Print footer */}
        <div className="print-footer hidden mt-12 pt-4 border-t border-gray-200">
          <p style={{ fontSize: 10, color: "#aaa", textAlign: "center" }}>Prepared with Aethel Mirror</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 pb-10 no-print">
          <button onClick={onSave}
            className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300">
            Save to client file
          </button>
          <button onClick={handlePrint}
            className="w-full h-[48px] rounded-sm border border-primary text-primary font-body text-[14px] hover:bg-primary/10 transition-all duration-300 flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" strokeWidth={1.5} />
            Export as PDF
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Main Portal ───
const PractitionerPortal = () => {
  const { user, subscriptionTier } = useAuth();
  const navigate = useNavigate();
  const [practitioner, setPractitioner] = useState<{ id: string; display_name: string } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [view, setView] = useState<PortalView>("clients");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientReadings, setClientReadings] = useState<PractitionerReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [expandedReadingId, setExpandedReadingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formBirthTime, setFormBirthTime] = useState("");
  const [formBirthTimeUnknown, setFormBirthTimeUnknown] = useState(false);
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
    setFormBirthTimeUnknown(false);
    setFormBirthPlace("");
    setFormNotes("");
  };

  const handleAddClient = async () => {
    if (!practitioner || !formName.trim()) return;
    if (clients.length >= MAX_CLIENTS) {
      setLimitModalOpen(true);
      return;
    }

    const { data, error } = await supabase
      .from("practitioner_clients")
      .insert({
        practitioner_id: practitioner.id,
        client_name: formName.trim(),
        client_email: formEmail.trim() || null,
        birth_date: formBirthDate || null,
        birth_time: formBirthTimeUnknown ? null : (formBirthTime || null),
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
        birth_time: formBirthTimeUnknown ? null : (formBirthTime || null),
        birth_place: formBirthPlace.trim() || null,
        notes: formNotes.trim() || null,
      })
      .eq("id", selectedClient.id);

    if (!error) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id
            ? { ...c, client_name: formName.trim(), client_email: formEmail.trim() || null, birth_date: formBirthDate || null, birth_time: formBirthTimeUnknown ? null : (formBirthTime || null), birth_place: formBirthPlace.trim() || null, notes: formNotes.trim() || null }
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
    setClientReadings((data || []) as unknown as PractitionerReading[]);
    setExpandedReadingId(null);
    setView("client_detail");
  };

  const openEditClient = (client: Client) => {
    setSelectedClient(client);
    setFormName(client.client_name);
    setFormEmail(client.client_email || "");
    setFormBirthDate(client.birth_date || "");
    setFormBirthTime(client.birth_time || "");
    setFormBirthTimeUnknown(!client.birth_time);
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

  // Practitioner checkout
  const handlePractitionerCheckout = async () => {
    track("practitioner_checkout_clicked");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_TIERS.practitioner.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      Sentry.captureException(err);
    }
  };

  if (!user) {
    navigate("/");
    return null;
  }

  if (subscriptionTier !== "practitioner" && subscriptionTier !== "mirror_pro") {
    return (
      <section className="min-h-screen px-5 py-8">
        <div className="w-full max-w-app mx-auto text-center pt-16">
          <button onClick={() => navigate("/")} className="absolute left-5 top-8 text-foreground/50 hover:text-foreground/70 transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-6">
            P R A C T I T I O N E R
          </p>
          <h2 className="font-display text-[24px] leading-[1.3] text-foreground mb-4">
            Run readings for your clients.
          </h2>
          <p className="font-body text-[14px] text-muted-foreground mb-2 leading-relaxed">
            Prepare deeper sessions.
          </p>
          <p className="font-body text-[14px] text-muted-foreground mb-10 leading-relaxed">
            Let the mirror do the groundwork.
          </p>

          <ul className="text-left space-y-3 mb-10 px-4">
            {STRIPE_TIERS.practitioner.features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="text-primary mt-0.5 shrink-0">✓</span>
                <span className="font-body text-[14px] text-foreground/80">{f}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handlePractitionerCheckout}
            className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300"
          >
            Start Practitioner — £49/month
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors mt-4"
          >
            Maybe later
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
                  Y O U R &nbsp; C L I E N T S
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
                  {clients.map((client) => {
                    // Find latest reading for this client from the cached data
                    return (
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
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => {
                  if (clients.length >= MAX_CLIENTS) {
                    setLimitModalOpen(true);
                    return;
                  }
                  resetForm();
                  setView("add_client");
                }}
                className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2"
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
                {view === "add_client" ? "N E W &nbsp; C L I E N T" : "E D I T &nbsp; C L I E N T"}
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
                  {!formBirthTimeUnknown && (
                    <input type="time" value={formBirthTime} onChange={(e) => setFormBirthTime(e.target.value)} className={`${inputClass} mb-2`} />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formBirthTimeUnknown}
                      onChange={(e) => {
                        setFormBirthTimeUnknown(e.target.checked);
                        if (e.target.checked) setFormBirthTime("");
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="font-body text-[13px] text-muted-foreground">Unknown</span>
                  </label>
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
                    {selectedClient.birth_time ? ` at ${selectedClient.birth_time}` : " — time unknown"}
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
                  {clientReadings.map((r) => {
                    const isExpanded = expandedReadingId === r.id;
                    const rd = r.reading_json as any;
                    return (
                      <div key={r.id} className="bg-card border border-border rounded-md p-4">
                        <button
                          onClick={() => setExpandedReadingId(isExpanded ? null : r.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="font-body text-[11px] uppercase tracking-wider text-primary">{r.domain}</span>
                            <span className="font-body text-[11px] text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <p className="font-body text-[13px] text-card-foreground mb-1">{r.question}</p>
                          {!isExpanded && (
                            <p className="font-body text-[12px] text-muted-foreground italic">
                              {rd?.third_way?.slice(0, 80)}...
                            </p>
                          )}
                          <ChevronDown className={`w-4 h-4 text-muted-foreground mx-auto mt-2 transition-transform ${isExpanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
                        </button>

                        {isExpanded && rd && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-border space-y-4">
                            <div>
                              <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Stars</p>
                              <p className="font-body text-[13px] text-card-foreground">{rd.astrology_reading}</p>
                            </div>
                            {rd.design_insights?.map((insight: string, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-primary shrink-0">—</span>
                                <span className="font-body text-[13px] text-card-foreground">{insight.replace(/^—\s*/, "")}</span>
                              </div>
                            ))}
                            <div className="border-t border-primary/20 pt-3">
                              <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Third Way</p>
                              <p className="font-display text-[15px] text-card-foreground font-medium">{rd.third_way}</p>
                            </div>
                            <div>
                              <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Journal</p>
                              <p className="font-body text-[13px] text-card-foreground italic">{rd.journal_prompt}</p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
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

              <div className="bg-primary/10 border border-primary/20 rounded-md px-4 py-3 mb-6">
                <p className="font-body text-[11px] uppercase tracking-[0.2em] text-primary">Reading for</p>
                <p className="font-display text-[16px] text-foreground">{selectedClient.client_name}</p>
              </div>

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
                Find my Third Way →
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
          {view === "reading_result" && readingData && selectedClient && practitioner && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PractitionerReadingOutput
                reading={readingData}
                domain={readingDomain}
                clientName={selectedClient.client_name}
                practitionerName={practitioner.display_name}
                onSave={handleSaveReading}
                onBack={() => setView("new_reading")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Client Limit Modal ─── */}
      <AnimatePresence>
        {limitModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-5"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-app bg-card border border-border rounded-md p-6 relative"
            >
              <button onClick={() => setLimitModalOpen(false)} className="absolute top-4 right-4 text-foreground/50 hover:text-foreground/70 transition-colors">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <p className="font-display text-[18px] text-card-foreground mb-3">Client limit reached</p>
              <p className="font-body text-[14px] text-muted-foreground leading-relaxed mb-6">
                You've reached the 20 client limit. Reply to{" "}
                <a href="mailto:hello@aethelmirror.com" className="text-primary hover:underline">
                  hello@aethelmirror.com
                </a>{" "}
                to discuss an expanded plan.
              </p>
              <button
                onClick={() => setLimitModalOpen(false)}
                className="w-full h-[44px] rounded-sm border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default PractitionerPortal;

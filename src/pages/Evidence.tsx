import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/posthog";

interface EvidenceData {
  total_outcomes: number;
  positive_rate: number;
  followed_rate: { yes: number; partially: number; no: number };
  by_domain: Record<string, number>;
  recent_quotes: { text: string; domain: string }[];
  insufficient_data: boolean;
}

const Evidence = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<EvidenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke("evidence");
        if (error) throw error;
        if (result?.insufficient_data || result?.total_outcomes < 20) {
          setNotReady(true);
        } else {
          setData(result as EvidenceData);
          track("evidence_page_viewed", { total_outcomes_shown: result.total_outcomes });
        }
      } catch {
        setNotReady(true);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <p className="font-body text-[14px] text-muted-foreground">Loading...</p>
      </section>
    );
  }

  if (notReady || !data) {
    return (
      <section className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center">
          <p className="font-display text-[18px] text-foreground mb-4">Not enough data yet</p>
          <p className="font-body text-[14px] text-muted-foreground mb-8">
            We need more logged outcomes before we can share results. Come back soon.
          </p>
          <button
            onClick={() => navigate("/")}
            className="h-[48px] px-8 rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300"
          >
            Get my Third Way →
          </button>
        </div>
      </section>
    );
  }

  const domainEntries = Object.entries(data.by_domain);
  const showDomains = domainEntries.length >= 3;

  return (
    <section className="min-h-screen px-5 py-12">
      <div className="w-full max-w-[600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="font-display text-[14px] tracking-[0.4em] text-primary mb-4">
            D O E S &nbsp; I T &nbsp; W O R K ?
          </p>
          <p className="font-body text-[14px] text-muted-foreground leading-relaxed">
            We track outcomes. Here's what the mirror has shown.
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card border border-border rounded-md p-5 text-center"
          >
            <p className="font-display text-[32px] text-foreground font-semibold mb-1">
              {data.followed_rate.yes + data.followed_rate.partially}%
            </p>
            <p className="font-body text-[13px] text-foreground/80 mb-2">acted on their Third Way</p>
            <p className="font-body text-[11px] text-muted-foreground">
              based on {data.total_outcomes} logged outcomes
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card border border-border rounded-md p-5 text-center"
          >
            <p className="font-display text-[32px] text-foreground font-semibold mb-1">
              {data.total_outcomes}
            </p>
            <p className="font-body text-[13px] text-foreground/80 mb-2">decisions logged</p>
            <p className="font-body text-[11px] text-muted-foreground">
              across all domains
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card border border-border rounded-md p-5 text-center"
          >
            <p className="font-display text-[32px] text-foreground font-semibold mb-1">
              {data.positive_rate}%
            </p>
            <p className="font-body text-[13px] text-foreground/80 mb-2">reported a positive outcome</p>
            <p className="font-body text-[11px] text-muted-foreground">
              based on {data.total_outcomes} logged outcomes
            </p>
          </motion.div>
        </div>

        {/* Domain breakdown */}
        {showDomains && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-12"
          >
            <p className="font-body text-[11px] uppercase tracking-[0.35em] text-muted-foreground mb-5">
              B Y &nbsp; D O M A I N
            </p>
            <div className="space-y-4">
              {domainEntries
                .sort((a, b) => b[1] - a[1])
                .map(([domain, rate]) => (
                  <div key={domain}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="font-body text-[13px] text-foreground">{domain}</span>
                      <span className="font-body text-[13px] text-primary font-medium">{rate}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Anonymous quotes */}
        {data.recent_quotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-12"
          >
            <p className="font-body text-[11px] uppercase tracking-[0.35em] text-muted-foreground mb-5">
              F R O M &nbsp; T H E &nbsp; M I R R O R
            </p>
            <div className="space-y-4">
              {data.recent_quotes.map((quote, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-md p-5 border-l-2 border-l-primary"
                >
                  <p className="font-display text-[15px] leading-[1.6] text-card-foreground mb-3">
                    "{quote.text}"
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-sm bg-primary/10 font-body text-[11px] uppercase tracking-wider text-primary">
                    {quote.domain}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center pb-10"
        >
          <button
            onClick={() => navigate("/")}
            className="w-full max-w-[320px] h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300"
          >
            Get your Third Way →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Evidence;

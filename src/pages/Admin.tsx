import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/posthog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Navigate } from "react-router-dom";

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").filter(Boolean);

interface Stats {
  totalReadings: number;
  totalOutcomes: number;
  consentRate: number;
  avgQuality: number;
  distribution: { bucket: string; count: number }[];
  recentHigh: any[];
  trainingCount: number;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [exporting, setExporting] = useState(false);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    const [readingsRes, outcomesRes] = await Promise.all([
      supabase.from("readings").select("id", { count: "exact", head: true }),
      supabase.from("outcomes").select("*"),
    ]);

    const outcomes = outcomesRes.data || [];
    const totalReadings = readingsRes.count || 0;
    const totalOutcomes = outcomes.length;
    const withConsent = outcomes.filter((o: any) => o.consent_to_share).length;
    const consentRate = totalOutcomes > 0 ? Math.round((withConsent / totalOutcomes) * 100) : 0;

    const qualityScores = outcomes.filter((o: any) => o.quality_score != null).map((o: any) => o.quality_score);
    const avgQuality = qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length)
      : 0;

    const buckets = [
      { bucket: "0–25", count: 0 },
      { bucket: "26–50", count: 0 },
      { bucket: "51–70", count: 0 },
      { bucket: "71–100", count: 0 },
    ];
    for (const s of qualityScores) {
      if (s <= 25) buckets[0].count++;
      else if (s <= 50) buckets[1].count++;
      else if (s <= 70) buckets[2].count++;
      else buckets[3].count++;
    }

    const recentHigh = outcomes
      .filter((o: any) => o.quality_score != null && o.quality_score >= 70)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    const trainingCount = outcomes.filter(
      (o: any) => o.consent_to_share && o.outcome_sentiment && o.followed && o.outcome_text && o.outcome_text.length > 15
    ).length;

    setStats({
      totalReadings,
      totalOutcomes,
      consentRate,
      avgQuality,
      distribution: buckets,
      recentHigh,
      trainingCount,
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-training-data`,
        {
          headers: {
            "x-admin-key": import.meta.env.VITE_ADMIN_EXPORT_KEY || "",
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "training_data.jsonl";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const barColors = ["hsl(var(--destructive))", "hsl(var(--muted-foreground))", "hsl(var(--primary) / 0.6)", "hsl(var(--primary))"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[14px] tracking-[0.35em] text-primary mb-10"
        >
          A E T H E L &nbsp; · &nbsp; I N T E L L I G E N C E
        </motion.p>

        {stats && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: "Readings generated", value: stats.totalReadings },
                { label: "Outcomes logged", value: stats.totalOutcomes },
                { label: "Consent rate", value: `${stats.consentRate}%` },
                { label: "Avg quality score", value: stats.avgQuality },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-md p-4">
                  <p className="font-display text-[24px] text-card-foreground">{s.value}</p>
                  <p className="font-body text-[12px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quality distribution chart */}
            <div className="bg-card border border-border rounded-md p-5 mb-8">
              <p className="font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Q U A L I T Y &nbsp; D I S T R I B U T I O N
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 4,
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.distribution.map((_, i) => (
                      <Cell key={i} fill={barColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Export */}
            <div className="bg-card border border-border rounded-md p-5 mb-8 flex items-center justify-between">
              <div>
                <p className="font-body text-[14px] text-card-foreground">Export training data</p>
                <p className="font-body text-[12px] text-muted-foreground">
                  {stats.trainingCount} training-ready examples
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-5 py-2.5 rounded-sm bg-primary text-primary-foreground font-body text-[13px] hover:brightness-110 transition-all disabled:opacity-50"
              >
                {exporting ? "..." : "Download JSONL"}
              </button>
            </div>

            {/* Recent high quality */}
            <div className="bg-card border border-border rounded-md p-5">
              <p className="font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                R E C E N T &nbsp; H I G H &nbsp; Q U A L I T Y
              </p>
              {stats.recentHigh.length === 0 ? (
                <p className="font-body text-[13px] text-muted-foreground">No high-quality readings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="font-body text-[11px] text-muted-foreground border-b border-border">
                        <th className="pb-2 pr-3">Domain</th>
                        <th className="pb-2 pr-3">Score</th>
                        <th className="pb-2 pr-3">Followed</th>
                        <th className="pb-2 pr-3">Sentiment</th>
                        <th className="pb-2">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentHigh.map((r: any) => (
                        <tr key={r.id} className="font-body text-[13px] text-card-foreground border-b border-border/50">
                          <td className="py-2 pr-3">{r.domain || "—"}</td>
                          <td className="py-2 pr-3">{r.quality_score}</td>
                          <td className="py-2 pr-3 capitalize">{r.followed}</td>
                          <td className="py-2 pr-3 capitalize">{r.outcome_sentiment || "—"}</td>
                          <td className="py-2">{r.time_to_outcome != null ? `${r.time_to_outcome}h` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;

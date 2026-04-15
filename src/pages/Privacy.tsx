import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Privacy Policy — Guidance Journal";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-2xl text-primary mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 2 April 2026</p>

        <div className="space-y-6 font-body text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-foreground mb-2">1. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Account data:</strong> Email address (for authentication)</li>
              <li><strong className="text-foreground">Birth data:</strong> Date of birth, time of birth, and place of birth (for personalised readings)</li>
              <li><strong className="text-foreground">Reading data:</strong> Decision questions you submit and AI-generated readings</li>
              <li><strong className="text-foreground">Journal data:</strong> Outcome notes you log in your Decision Journal</li>
              <li><strong className="text-foreground">Memory data:</strong> AI-extracted themes and patterns from your readings</li>
              <li><strong className="text-foreground">Preferences:</strong> Language, notification settings, consent preferences</li>
              <li><strong className="text-foreground">Analytics:</strong> Anonymous usage data (pages visited, features used)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">2. Legal Basis for Processing (UK GDPR / EU GDPR)</h2>
            <p><strong className="text-foreground">Legitimate interests:</strong> We process your birth data and decision questions to deliver the core app functionality — personalised reflective guidance.</p>
            <p className="mt-2"><strong className="text-foreground">Contract performance:</strong> Processing necessary to provide paid subscription services.</p>
            <p className="mt-2"><strong className="text-foreground">Explicit consent:</strong> When you choose to share your outcome data anonymously (via the consent checkbox), this is processed on the basis of your explicit consent. You may withdraw this consent at any time.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To generate personalised readings using your birth data and question</li>
              <li>To build your memory profile (recurring themes and patterns) for deeper personalisation</li>
              <li>To display your decision journal and track outcomes</li>
              <li>To send notifications (daily nudges, outcome reminders) if you opt in</li>
              <li>To improve the service through anonymous, aggregated analytics</li>
              <li>To display anonymised outcomes on our Evidence page (only with your explicit consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">4. Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Lovable Cloud (Supabase):</strong> Database, authentication, and backend functions. Data stored in EU region.</li>
              <li><strong className="text-foreground">Stripe:</strong> Payment processing for subscriptions. Stripe handles all payment card data directly — we never see or store your card details.</li>
              <li><strong className="text-foreground">PostHog:</strong> Anonymous product analytics. No personally identifiable information is collected.</li>
              <li><strong className="text-foreground">AI Services:</strong> Your questions are sent to AI services (via Lovable AI gateway) for reading generation. Questions are processed in real-time and are not stored by the AI provider beyond the immediate request.</li>
              <li><strong className="text-foreground">Resend:</strong> Transactional email delivery (welcome emails, outcome reminders).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">5. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Readings and outcome data are retained until you delete your account.</li>
              <li>Birth data (date, time, place) is retained until you delete your account.</li>
              <li>Memory tags (themes and patterns) are retained until you delete your account.</li>
              <li>Analytics data is retained for up to 24 months in anonymised form.</li>
              <li>You may request deletion of all your data at any time from Settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">6. Your Rights</h2>
            <p>Under UK GDPR and EU GDPR, you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Right of access:</strong> Request a copy of all data we hold about you. Use "Export my data" in Settings.</li>
              <li><strong className="text-foreground">Right to rectification:</strong> Update your birth data, email, or preferences in Settings.</li>
              <li><strong className="text-foreground">Right to erasure:</strong> Delete your account and all associated data from Settings. This is immediate and irreversible.</li>
              <li><strong className="text-foreground">Right to data portability:</strong> Export your data in JSON format from Settings.</li>
              <li><strong className="text-foreground">Right to object:</strong> Contact us to object to any processing based on legitimate interests.</li>
              <li><strong className="text-foreground">Right to withdraw consent:</strong> You may withdraw consent for anonymous sharing at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">7. Data Security</h2>
            <p>Your data is stored securely in our cloud database infrastructure hosted in EU regions. All data is encrypted in transit (TLS) and at rest. Access to production data is restricted to essential personnel only.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">8. Children's Privacy</h2>
            <p>Guidance Journal is not intended for use by anyone under the age of 18. We do not knowingly collect data from minors. If you believe a minor has created an account, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">9. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. Material changes will be communicated via email to registered users. Continued use of the service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">10. Contact</h2>
            <p>For privacy enquiries, data requests, or to exercise your rights, contact us at: <a href="mailto:privacy@aethelmirror.com" className="text-primary hover:underline">privacy@aethelmirror.com</a></p>
          </section>

          <section className="bg-card border border-border rounded-md p-4">
            <p className="text-muted-foreground italic">This app provides reflective guidance only and does not constitute medical, psychological, or professional advice.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default Privacy;

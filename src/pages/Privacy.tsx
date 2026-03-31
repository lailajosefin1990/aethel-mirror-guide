import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-2xl text-primary mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 31 March 2026</p>

        <div className="space-y-6 font-body text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-foreground mb-2">1. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email address (for authentication)</li>
              <li>Date of birth, time of birth, and place of birth (for personalised readings)</li>
              <li>Decision questions you submit</li>
              <li>Outcome notes you log in your Decision Journal</li>
              <li>Consent preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">2. Legal Basis for Processing (UK GDPR)</h2>
            <p><strong className="text-foreground">Legitimate interests:</strong> We process your birth data and decision questions to deliver the core app functionality — personalised reflective guidance.</p>
            <p className="mt-2"><strong className="text-foreground">Explicit consent:</strong> When you choose to share your outcome data anonymously (via the consent checkbox), this is processed on the basis of your explicit consent. You may withdraw this consent at any time.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">3. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Readings and outcome data are retained for up to 2 years from creation.</li>
              <li>Birth data (date, time, place) is retained until you delete your account.</li>
              <li>You may request deletion of all your data at any time from Settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">4. Right to Deletion</h2>
            <p>You can delete all your personal data from the Settings screen within the app. Upon deletion, all readings, outcomes, birth data, and profile information are permanently removed.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">5. Data Storage & Processing</h2>
            <p>Your data is stored securely in our database infrastructure hosted in EU regions. AI-powered readings are generated using third-party AI services. Your questions are sent to these services for processing but are not stored by them beyond the immediate request.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">6. Contact</h2>
            <p>For privacy enquiries, contact us at: <a href="mailto:privacy@aethelmirror.com" className="text-primary hover:underline">privacy@aethelmirror.com</a></p>
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

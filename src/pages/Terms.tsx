import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-2xl text-primary mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 31 March 2026</p>

        <div className="space-y-6 font-body text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-foreground mb-2">1. Age Requirement</h2>
            <p>You must be 18 years of age or older to use Aethel Mirror. By creating an account, you confirm that you meet this requirement.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">2. Nature of the Service</h2>
            <p>Aethel Mirror is a reflective tool. It is <strong className="text-foreground">not</strong> a substitute for professional medical, psychological, financial, or legal advice. The readings, guidance, and "Third Way" recommendations are intended for personal reflection only.</p>
            <p className="mt-2">You should always consult qualified professionals for matters relating to your health, mental wellbeing, finances, or legal situation.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">3. Subscriptions & Cancellation</h2>
            <p>Paid subscriptions (Mirror and Mirror Pro) are billed monthly via Stripe. You may cancel your subscription at any time through the customer portal, accessible from the Settings screen.</p>
            <p className="mt-2">Upon cancellation, you retain access to your paid tier until the end of your current billing period. No refunds are provided for partial months.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">4. Limitation of Liability</h2>
            <p>Aethel Mirror and its creators accept no liability for any decisions you make based on readings or guidance provided by the app. All actions taken as a result of using this service are taken at your own risk and discretion.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">5. User Content</h2>
            <p>Questions, outcome notes, and other content you submit remain yours. If you opt in to anonymous sharing, your outcome data may be used in aggregated, anonymised form to improve the service and display on our Evidence page.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">6. Account Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account and all associated data at any time from the Settings screen.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;

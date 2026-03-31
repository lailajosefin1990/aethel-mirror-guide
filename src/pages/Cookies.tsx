import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Cookies = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-2xl text-primary mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 31 March 2026</p>

        <div className="space-y-6 font-body text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-foreground mb-2">1. What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit a website or use a web application. They help provide core functionality and improve your experience.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">2. Cookies We Use</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Essential cookies:</strong> Required for authentication and session management. These cannot be disabled as the app will not function without them.</li>
              <li><strong className="text-foreground">Analytics cookies:</strong> We use PostHog for anonymous usage analytics to understand how people use the app and improve the experience. No personally identifiable information is collected through analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">3. Third-Party Cookies</h2>
            <p>Our payment processor (Stripe) may set cookies when you interact with the subscription checkout or customer portal. These are governed by Stripe's own cookie policy.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">4. Managing Cookies</h2>
            <p>You can manage or delete cookies through your browser settings. Please note that disabling essential cookies will prevent you from using the app.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">5. Contact</h2>
            <p>For questions about our cookie practices, contact: <a href="mailto:privacy@aethelmirror.com" className="text-primary hover:underline">privacy@aethelmirror.com</a></p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default Cookies;

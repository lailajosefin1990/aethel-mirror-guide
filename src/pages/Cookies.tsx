import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Cookies = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Cookie Policy — Guidance Journal";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-2xl text-primary mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 2 April 2026</p>

        <div className="space-y-6 font-body text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-foreground mb-2">1. What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit a website or use a web application. They help provide core functionality and improve your experience.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">2. Cookies We Use</h2>

            <h3 className="font-display text-base text-foreground mt-4 mb-2">Essential Cookies</h3>
            <p>Required for authentication and session management. These cannot be disabled as the app will not function without them.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Authentication session:</strong> Maintained by our backend (Lovable Cloud) to keep you signed in. Expires when you sign out or after 7 days of inactivity.</li>
              <li><strong className="text-foreground">Consent preferences:</strong> Records whether you've accepted the age and disclaimer consent gate.</li>
            </ul>

            <h3 className="font-display text-base text-foreground mt-4 mb-2">Analytics Cookies</h3>
            <p>We use PostHog for anonymous usage analytics to understand how people use the app and improve the experience.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>No personally identifiable information is collected through analytics</li>
              <li>Analytics data is used to understand feature usage, identify bugs, and improve the user experience</li>
              <li>You can disable analytics by using your browser's "Do Not Track" setting</li>
            </ul>

            <h3 className="font-display text-base text-foreground mt-4 mb-2">No Advertising Cookies</h3>
            <p>Guidance Journal does <strong className="text-foreground">not</strong> use any advertising or tracking cookies. We do not serve ads, sell data to advertisers, or use retargeting pixels.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">3. Third-Party Cookies</h2>
            <p>Our payment processor (Stripe) may set cookies when you interact with the subscription checkout or customer portal. These are governed by <a href="https://stripe.com/cookie-settings" target="_blank" rel="noopener" className="text-primary hover:underline">Stripe's cookie policy</a>.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">4. Local Storage</h2>
            <p>In addition to cookies, we use browser local storage for:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Persisting your authentication session</li>
              <li>Storing push notification dismissal preferences</li>
              <li>Caching anonymous reading data before account creation</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">5. Managing Cookies</h2>
            <p>You can manage or delete cookies through your browser settings. Please note that disabling essential cookies will prevent you from using the app. Clearing local storage will sign you out.</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-foreground mb-2">6. Contact</h2>
            <p>For questions about our cookie practices, contact: <a href="mailto:privacy@aethelmirror.com" className="text-primary hover:underline">privacy@aethelmirror.com</a></p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default Cookies;

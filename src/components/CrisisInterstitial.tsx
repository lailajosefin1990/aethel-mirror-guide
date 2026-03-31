import { motion } from "framer-motion";
import { Heart, Phone, MessageSquare, Search } from "lucide-react";

interface CrisisInterstitialProps {
  onReturn: () => void;
}

const CrisisInterstitial = ({ onReturn }: CrisisInterstitialProps) => {
  const resources = [
    {
      label: "Talk to someone now",
      detail: "Samaritans: 116 123 (UK)",
      href: "tel:116123",
      icon: Phone,
    },
    {
      label: "Crisis text line",
      detail: "Text SHOUT to 85258 (UK)",
      href: "sms:85258?body=SHOUT",
      icon: MessageSquare,
    },
    {
      label: "Find a therapist",
      detail: "bacp.co.uk/search",
      href: "https://www.bacp.co.uk/search/Therapists",
      icon: Search,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md text-center"
      >
        <Heart className="w-8 h-8 text-primary mx-auto mb-6" />

        <h2 className="font-display text-2xl text-foreground mb-4">We see you.</h2>
        <p className="font-body text-sm text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
          What you're sitting with sounds like more than a decision. 
          Aethel Mirror is a reflective tool — for what you're describing, 
          you deserve real human support.
        </p>

        <div className="space-y-3 mb-8">
          {resources.map((r) => (
            <a
              key={r.label}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-card border border-border rounded-md p-4 hover:border-primary/30 transition-colors"
            >
              <r.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="font-body text-sm text-foreground">{r.label}</p>
                <p className="font-body text-xs text-muted-foreground">{r.detail}</p>
              </div>
            </a>
          ))}
        </div>

        <p className="font-body text-xs text-muted-foreground mb-6 italic">
          Your mirror will be here when you're ready.
        </p>

        <button
          onClick={onReturn}
          className="w-full h-[48px] rounded-sm border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300"
        >
          Return to mirror
        </button>
      </motion.div>
    </div>
  );
};

export default CrisisInterstitial;

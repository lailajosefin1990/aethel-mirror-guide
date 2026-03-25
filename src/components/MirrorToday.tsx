import { motion } from "framer-motion";
import { User } from "lucide-react";

interface MirrorTodayProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const mockDaily = {
  headline: "Let the decision breathe today.",
  reflection:
    "Your chart shows Mercury squaring Saturn — not a day for final answers. The pressure you feel to decide is real, but it's not yours. It belongs to someone else's timeline. Today, gather one more piece of information and sit with it overnight.",
  nudge: "Write down what you'd do if no one was watching. That's closer to the truth than you think.",
};

const tabs = [
  { id: "mirror", label: "Mirror", icon: "mirror" },
  { id: "journey", label: "Journey", icon: "journey" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const TabIcon = ({ id, active }: { id: string; active: boolean }) => {
  const color = active ? "hsl(30,60%,50%)" : "currentColor";
  const size = 20;
  const stroke = 1.5;

  if (id === "mirror") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18" opacity="0.4" />
      </svg>
    );
  }
  if (id === "journey") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20" />
        <path d="M12 2a10 10 0 0 1 0 20" opacity="0.4" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
};

const MirrorToday = ({ activeTab, onTabChange }: MirrorTodayProps) => {
  return (
    <section className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <p className="font-body text-[11px] uppercase tracking-[0.3em] text-foreground">
          Aethel Mirror
        </p>
        <button className="w-8 h-8 rounded-full border border-foreground/20 flex items-center justify-center">
          <User className="w-4 h-4 text-foreground/60" strokeWidth={1.5} />
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-md mx-auto"
        >
          {/* Daily card */}
          <div className="bg-foreground rounded-none p-6">
            <p className="font-body text-[11px] uppercase tracking-[0.25em] text-background/50 mb-4">
              Today
            </p>

            <h2 className="font-display text-[20px] leading-[1.4] font-normal text-background mb-4">
              {mockDaily.headline}
            </h2>

            <p className="font-display text-[15px] leading-[1.6] text-background/80 mb-6">
              {mockDaily.reflection}
            </p>

            <div className="border-t border-[hsl(30,60%,50%)] pt-4">
              <p className="font-body text-[11px] uppercase tracking-[0.15em] text-background/50 mb-2">
                Little nudge:
              </p>
              <p className="font-display text-[15px] leading-[1.6] italic text-background/90">
                {mockDaily.nudge}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom tab bar */}
      <nav className="border-t border-foreground/10 px-6 py-3">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center gap-1 py-1 transition-colors"
              >
                <TabIcon id={tab.id} active={isActive} />
                <span
                  className={`font-body text-[11px] ${
                    isActive ? "text-secondary" : "text-foreground/60"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </section>
  );
};

export default MirrorToday;

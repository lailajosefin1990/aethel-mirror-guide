import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useState } from "react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  subscriptionTier?: string;
}

const TabIcon = ({ id, active }: { id: string; active: boolean }) => {
  const color = active ? "hsl(43,50%,54%)" : "currentColor";
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
        <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
        <path d="M4 19h16" />
        <path d="M12 3v12" opacity="0.4" />
      </svg>
    );
  }
  if (id === "calendar") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <circle cx="12" cy="16" r="1" fill={color} opacity="0.4" />
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

const BottomNav = ({ activeTab, onTabChange, subscriptionTier = "free" }: BottomNavProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const isPaid = subscriptionTier !== "free";

  const tabs = [
    { id: "mirror", label: "Mirror" },
    { id: "journey", label: "Journey" },
    { id: "calendar", label: "Transits", locked: !isPaid },
    { id: "settings", label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm z-50" role="navigation" aria-label="Main navigation">
      <div className="max-w-app mx-auto flex items-center justify-around px-4 py-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isLocked = tab.locked;

          return (
            <div key={tab.id} className="relative">
              <button
                onClick={() => {
                  if (isLocked) {
                    setShowTooltip(true);
                    setTimeout(() => setShowTooltip(false), 2500);
                    return;
                  }
                  onTabChange(tab.id);
                }}
                aria-current={isActive && !isLocked ? "page" : undefined}
                aria-label={tab.label}
                className={`flex flex-col items-center gap-1 py-1 transition-colors duration-300 ${
                  isLocked ? "opacity-40" : ""
                }`}
              >
                <div className="relative">
                  <TabIcon id={tab.id} active={isActive && !isLocked} />
                  {isLocked && (
                    <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-muted-foreground" strokeWidth={2} />
                  )}
                </div>
                <span
                  className={`font-body text-[11px] transition-colors duration-300 ${
                    isActive && !isLocked ? "text-primary" : "text-foreground/60"
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && !isLocked && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px h-[2px] w-8 bg-primary rounded-full"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                )}
              </button>

              {/* Locked tooltip */}
              {isLocked && showTooltip && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-card border border-border font-body text-[11px] text-muted-foreground whitespace-nowrap pointer-events-none z-50">
                  Unlock with Mirror — £11/month
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

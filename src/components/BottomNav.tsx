import { Lock } from "lucide-react";
import { useState } from "react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  subscriptionTier?: string;
}

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
                  isLocked ? "opacity-30" : ""
                }`}
              >
                <div className="relative flex items-center">
                  {isLocked && (
                    <Lock className="w-2.5 h-2.5 text-muted-foreground mr-1" strokeWidth={2} />
                  )}
                </div>
                <span
                  className={`font-body text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${
                    isActive && !isLocked ? "text-foreground" : "text-foreground/40"
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && !isLocked && (
                  <div className="absolute -bottom-3 h-px w-8 bg-foreground" />
                )}
              </button>

              {isLocked && showTooltip && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 border border-border bg-card font-body text-[11px] text-muted-foreground whitespace-nowrap pointer-events-none z-50">
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

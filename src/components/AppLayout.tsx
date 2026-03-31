import { ReactNode } from "react";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  subscriptionTier?: string;
}

const AppLayout = ({ children, showNav = false, activeTab = "mirror", onTabChange, subscriptionTier }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={`max-w-app mx-auto px-5 ${showNav ? "pb-20" : ""}`}>
        {children}
      </main>
      {showNav && onTabChange && (
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} subscriptionTier={subscriptionTier} />
      )}
    </div>
  );
};

export default AppLayout;

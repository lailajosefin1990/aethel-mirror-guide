import { ReactNode, useState, useEffect } from "react";
import BottomNav from "./BottomNav";
import { useTranslation } from "react-i18next";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  subscriptionTier?: string;
}

const AppLayout = ({ children, showNav = false, activeTab = "mirror", onTabChange, subscriptionTier }: AppLayoutProps) => {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-center py-2 font-body text-[13px]">
          {t("offline_banner")}
        </div>
      )}
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

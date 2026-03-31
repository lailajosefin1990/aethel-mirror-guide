import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionTier } from "@/lib/stripe";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionTier: SubscriptionTier;
  monthlyReadingCount: number;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  refreshReadingCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [monthlyReadingCount, setMonthlyReadingCount] = useState(0);

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) return;
      if (data?.tier) {
        setSubscriptionTier(data.tier as SubscriptionTier);
      }
    } catch {
      // silent fail
    }
  }, []);

  const refreshReadingCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc("get_monthly_reading_count", {
        p_user_id: user.id,
      });
      if (!error && data !== null) {
        setMonthlyReadingCount(data);
      }
    } catch {
      // silent fail
    }
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSubscriptionTier("free");
    setMonthlyReadingCount(0);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check subscription when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
      refreshReadingCount();
    }
  }, [user, checkSubscription, refreshReadingCount]);

  return (
    <AuthContext.Provider value={{
      user, session, loading, subscriptionTier,
      monthlyReadingCount, signOut, checkSubscription, refreshReadingCount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { Sentry } from "@/lib/sentry";
import Index from "./pages/Index.tsx";
import PractitionerPortal from "./pages/PractitionerPortal.tsx";
import Evidence from "./pages/Evidence.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Cookies from "./pages/Cookies.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const SentryErrorBoundary = Sentry.withErrorBoundary;

const App = () => (
  <SentryErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">Something went wrong. Please refresh.</div>}>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/practitioner" element={<PractitionerPortal />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

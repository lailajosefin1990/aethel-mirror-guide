import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { Sentry } from "@/lib/sentry";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const PractitionerPortal = React.lazy(() => import("./pages/PractitionerPortal.tsx"));
const Evidence = React.lazy(() => import("./pages/Evidence.tsx"));
const Privacy = React.lazy(() => import("./pages/Privacy.tsx"));
const Terms = React.lazy(() => import("./pages/Terms.tsx"));
const Cookies = React.lazy(() => import("./pages/Cookies.tsx"));
const Admin = React.lazy(() => import("./pages/Admin.tsx"));

const queryClient = new QueryClient();

const LazyFallback = () => <div className="min-h-screen" />;

const App = () => (
  <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">Something went wrong. Please refresh.</div>}>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ask" element={<Index />} />
            <Route path="/auth" element={<Index />} />
            <Route path="/birth" element={<Index />} />
            <Route path="/reading" element={<Index />} />
            <Route path="/mirror" element={<Index />} />
            <Route path="/mirror/:tab" element={<Index />} />
            <Route path="/practitioner" element={<Suspense fallback={<LazyFallback />}><PractitionerPortal /></Suspense>} />
            <Route path="/evidence" element={<Suspense fallback={<LazyFallback />}><Evidence /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<LazyFallback />}><Privacy /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<LazyFallback />}><Terms /></Suspense>} />
            <Route path="/cookies" element={<Suspense fallback={<LazyFallback />}><Cookies /></Suspense>} />
            <Route path="/admin" element={<Suspense fallback={<LazyFallback />}><Admin /></Suspense>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;

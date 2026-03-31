import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/lib/i18n";
import { initPostHog } from "@/lib/posthog";
import { registerServiceWorker } from "@/lib/push";

initPostHog();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

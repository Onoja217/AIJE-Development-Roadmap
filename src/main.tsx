import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

import { CommunityIntegrationProvider } from "@/contexts/CommunityIntegrationContext";

createRoot(document.getElementById("root")!).render(
  <CommunityIntegrationProvider>
    <App />
  </CommunityIntegrationProvider>
);
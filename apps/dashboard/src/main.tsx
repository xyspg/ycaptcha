import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>yCAPTCHA Dashboard</h1>
      <p>Phase 0 stub — full SPA arrives in Phase 3.</p>
    </main>
  </StrictMode>,
);

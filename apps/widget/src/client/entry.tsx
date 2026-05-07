import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WidgetApp } from "./widget-app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
const siteKey = root.getAttribute("data-sitekey");
if (!siteKey) throw new Error("missing data-sitekey");

createRoot(root).render(
  <StrictMode>
    <WidgetApp siteKey={siteKey} />
  </StrictMode>,
);

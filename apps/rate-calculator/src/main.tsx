import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyTheme, useCalculatorStore } from "./store";
import "@tigawanna/credit/styles.css";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root was not found");

// The inline script in index.html already paints the saved theme; this keeps the
// store and the DOM in sync once the app takes over.
applyTheme(useCalculatorStore.getState().theme);

// One explicit kickoff instead of a mount effect — the store owns the request.
void useCalculatorStore.getState().refreshRates();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

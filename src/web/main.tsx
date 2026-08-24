import "@fortawesome/fontawesome-svg-core/styles.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./tokens.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

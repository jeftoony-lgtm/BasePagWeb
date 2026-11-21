// =====================================================================
//  INMOBILIARIA PANEL · Arranque
// =====================================================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/base.css";
import "../styles/card.css";
import "../styles/admin.css";
import { ToastProvider } from "./ui.jsx";
import { AdminApp } from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <AdminApp />
    </ToastProvider>
  </StrictMode>,
);

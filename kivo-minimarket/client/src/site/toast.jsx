// =====================================================================
//  KIVO · Mensajito que aparece abajo unos segundos
//  Uso: const toast = useToast(); toast("¡Listo!");
// =====================================================================

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const toast = useCallback((text) => {
    setMessage(text);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 1800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`toast${visible ? " show" : ""}`} id="toast" role="status">{message}</div>
    </ToastContext.Provider>
  );
}

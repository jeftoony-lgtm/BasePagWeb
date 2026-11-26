// =====================================================================
//  LUZ SERENA PANEL · Piezas de interfaz que usan todas las secciones
//  Avisos (toast), ventana emergente (modal), interruptor, botón de
//  guardar y el sonido de "consulta nueva".
// =====================================================================

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/* ---------- Avisos ---------- */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ text: "", error: false, show: false });
  const timer = useRef(null);

  const show = useCallback((text, error = false) => {
    setToast({ text, error, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${toast.show ? " show" : ""}${toast.error ? " error" : ""}`} id="toast" role="status">{toast.text}</div>
    </ToastContext.Provider>
  );
}

/** Muestra un error en rojo: const showError = useShowError(); showError(error) */
export function useShowError() {
  const toast = useToast();
  return useCallback((error) => {
    console.error(error);
    toast(error.message || "Algo salió mal", true);
  }, [toast]);
}

/* ---------- Ventana emergente ---------- */
const ModalContext = createContext(null);
export const useModal = () => useContext(ModalContext);

function ConfirmDialog({ title, text, confirmLabel, onAnswer }) {
  return (
    <>
      <div className="sheet-head"><h3>{title}</h3></div>
      <p className="muted">{text}</p>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={() => onAnswer(false)}>Volver</button>
        <button className="btn" style={{ background: "var(--red)", color: "#fff" }} onClick={() => onAnswer(true)}>{confirmLabel}</button>
      </div>
    </>
  );
}

export function ModalProvider({ children }) {
  const [content, setContent] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const opened = useRef(0);

  // Cada apertura es una ventana nueva (key distinta): no se arrastra lo escrito en la anterior
  const open = useCallback((node) => {
    opened.current += 1;
    setContent(<Fragment key={opened.current}>{node}</Fragment>);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  /** Pregunta "¿Seguro?" y devuelve true o false */
  const confirm = useCallback((title, text, confirmLabel) => new Promise((resolve) => {
    const answer = (yes) => { setIsOpen(false); resolve(yes); };
    open(<ConfirmDialog title={title} text={text} confirmLabel={confirmLabel} onAnswer={answer} />);
  }), [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [close]);

  const value = useMemo(() => ({ open, close, confirm, isOpen }), [open, close, confirm, isOpen]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      <div className={`modal${isOpen ? " open" : ""}`} id="modal" onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="sheet" id="sheet">{content}</div>
      </div>
    </ModalContext.Provider>
  );
}

/** Encabezado de la ventana con la ✕ para cerrar */
export function SheetHead({ title }) {
  const { close } = useModal();
  return <div className="sheet-head"><h3>{title}</h3><button className="close-btn" aria-label="Cerrar" onClick={close}>✕</button></div>;
}

/* ---------- Interruptor (switch) ---------- */
export function Switch({ label = "", checked, onChange, ...rest }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} {...rest} />
      <span className="track"></span>{label}
    </label>
  );
}

/** Botón "Guardar" con el cartelito "Guardado ✓". onSave devuelve true si se guardó */
export function SaveBar({ label, onSave }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onClick() {
    setBusy(true);
    const ok = await onSave();
    setBusy(false);
    if (!ok) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="savebar">
      <span className={`saved${saved ? " show" : ""}`}>Guardado ✓</span>
      <button className="btn btn-gold" disabled={busy} onClick={onClick}>{label}</button>
    </div>
  );
}

/* ---------- Sonido de "consulta nueva" (tres notitas) ---------- */
export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175, 1568].forEach((frequency, i) => {
      const start = ctx.currentTime + i * 0.18;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
  } catch { /* algunos navegadores no dejan sonar sin tocar la pantalla antes */ }
}

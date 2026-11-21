// =====================================================================
//  INMOBILIARIA PANEL · Piezas de interfaz que usan todas las secciones
//  Avisos (toast), ventana emergente (modal), interruptor, botón de
//  guardar.
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

/** Cartel "¿Estás seguro?" en el medio de la pantalla. Va en su propia capa, encima de
 *  cualquier ventana abierta: preguntar no cierra el formulario ni borra lo escrito. */
function ConfirmDialog({ title, text, confirmLabel, danger, onAnswer }) {
  return (
    <div className="confirm-layer" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle"
      onClick={(e) => e.target === e.currentTarget && onAnswer(false)}>
      <div className="confirm-box">
        <div className={`confirm-icon${danger ? " danger" : ""}`} aria-hidden="true">{danger ? "!" : "?"}</div>
        <h3 id="confirmTitle">{title}</h3>
        {text && <p className="muted">{text}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={() => onAnswer(false)}>Volver</button>
          <button type="button" className={`btn ${danger ? "btn-danger" : "btn-green"}`} autoFocus onClick={() => onAnswer(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function ModalProvider({ children }) {
  const [content, setContent] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState(null); // el "¿Estás seguro?" abierto (o null)
  const opened = useRef(0);

  // Cada apertura es una ventana nueva (key distinta): no se arrastra lo escrito en la anterior
  const open = useCallback((node) => {
    opened.current += 1;
    setContent(<Fragment key={opened.current}>{node}</Fragment>);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  /** Pregunta "¿Seguro?" en el medio de la pantalla y devuelve true o false.
   *  danger = botón rojo (para borrar); con false queda verde (para guardar) */
  const confirm = useCallback((title, text, confirmLabel, danger = true) => new Promise((resolve) => {
    setQuestion({
      title, text, confirmLabel, danger,
      answer: (yes) => { setQuestion(null); resolve(yes); },
    });
  }), []);

  // Escape: si hay una pregunta abierta, la cancela; si no, cierra la ventana
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (question) question.answer(false);
      else close();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [close, question]);

  const value = useMemo(() => ({ open, close, confirm, isOpen }), [open, close, confirm, isOpen]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      <div className={`modal${isOpen ? " open" : ""}`} id="modal" onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="sheet" id="sheet">{content}</div>
      </div>
      {question && <ConfirmDialog {...question} onAnswer={question.answer} />}
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

/** Botón "Guardar" con el cartelito "Guardado ✓". onSave devuelve true si se guardó.
 *  Antes de guardar pregunta "¿Estás seguro?" en el medio de la pantalla (confirmText = la aclaración).
 *  dirty = hay algo cambiado (si no, el botón queda apagado). children = lo que va a la izquierda. */
export function SaveBar({ label, onSave, dirty = true, disabled = false, confirmText = "Se van a guardar los cambios.", confirmLabel = "Sí, guardar", children }) {
  const { confirm } = useModal();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onClick() {
    if (!(await confirm("¿Estás seguro?", confirmText, confirmLabel, false))) return;
    setBusy(true);
    const ok = await onSave();
    setBusy(false);
    if (!ok) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="savebar">
      {children}
      {saved ? <span className="saved show">Guardado ✓</span> : dirty && <span className="unsaved">● Cambios sin guardar</span>}
      <button type="button" className="btn btn-green" disabled={busy || disabled || !dirty} onClick={onClick}>
        {busy ? "Guardando…" : label}
      </button>
    </div>
  );
}

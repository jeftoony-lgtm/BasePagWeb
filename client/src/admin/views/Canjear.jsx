// =====================================================================
//  KIVO PANEL · Canjear código de la ruleta
//  Cada código sirve una sola vez y vence a los 7 días.
// =====================================================================

import { useState } from "react";
import { api } from "../../api.js";
import { formatDate } from "../../lib/format.js";
import { useShowError, beep } from "../ui.jsx";

const RESULTS = {
  ok:          (r) => ["r-ok",   "✅", "¡Código válido!", <>Entregale a <b>{r.nombre}</b>:<br /><b style={{ fontSize: 19 }}>{r.premio}</b></>],
  ya_canjeado: (r) => ["r-warn", "⚠️", "Ya fue usado", <>Este código de {r.nombre} se canjeó el {formatDate(r.fecha, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. No lo entregues de nuevo.</>],
  vencido:     (r) => ["r-warn", "⌛", "Código vencido", <>Era de {r.nombre} y venció el {formatDate(r.fecha, { day: "numeric", month: "short" })}.</>],
  no_existe:   ()  => ["r-bad",  "❌", "Ese código no existe", "Revisá que esté bien escrito."],
};

export function Canjear() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const showError = useShowError();

  async function onSubmit(event) {
    event.preventDefault();
    let clean = code.trim().toUpperCase().replace(/\s/g, "");
    if (!clean) return;
    if (!clean.startsWith("KIVO-")) clean = "KIVO-" + clean.replace(/^KIVO/, ""); // se puede escribir solo el final

    try {
      const answer = await api.redeem(clean);
      setResult(answer);
      if (answer.estado === "ok") {
        setCode("");
        beep();
      }
    } catch (error) {
      showError(error);
    }
  }

  const [style, icon, title, text] = result ? RESULTS[result.estado](result) : [];

  return (
    <>
      <div className="view-head">
        <div><h2>Canjear código</h2><p>Cuando un cliente muestra su código de la ruleta, escribilo acá. Cada código sirve una sola vez.</p></div>
      </div>
      <form className="card redeem" noValidate onSubmit={onSubmit}>
        <input className="input" placeholder="KIVO-XXXXX" autoComplete="off" autoCapitalize="characters" spellCheck="false" aria-label="Código"
          autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn btn-orange" style={{ width: "100%", marginTop: 12 }}>Canjear</button>
        <div>
          {result && <div className={`result ${style}`}><div className="big">{icon}</div><h3>{title}</h3><p>{text}</p></div>}
        </div>
      </form>
    </>
  );
}

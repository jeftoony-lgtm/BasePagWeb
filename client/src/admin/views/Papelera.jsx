// =====================================================================
//  INMOBILIARIA PANEL · Papelera (solo dueño)
//  Las publicaciones que se "eliminan" no se borran: quedan acá (borrado
//  lógico). No se ven en la página ni en Publicaciones. Desde acá se
//  restauran o se eliminan definitivamente (se borran los datos y las fotos).
// =====================================================================

import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { price, OPERACIONES, TIPOS, lugar, refCode, timeAgo } from "../../lib/format.js";
import { useAdmin } from "../state.js";
import { useModal, useToast, useShowError } from "../ui.jsx";

export function Papelera() {
  const { setProperties, settings } = useAdmin();
  const { confirm } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [list, setList] = useState(null); // null = cargando
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.trash().then(setList).catch((e) => { setList([]); showError(e); });
  }, [showError]);

  async function restore(p) {
    setBusy(p.id);
    try {
      const restored = await api.restoreProperty(p.id);
      setList((l) => l.filter((x) => x.id !== p.id));
      setProperties((l) => [restored, ...l]);
      toast(`“${p.titulo}” volvió a Publicaciones${restored.publicada ? " y ya se ve en la página" : ""}`);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  }

  async function purge(p) {
    const ok = await confirm(`¿Eliminar definitivamente “${p.titulo}”?`,
      "Se borran para siempre todos sus datos y sus fotos. Esto no se puede deshacer.", "Eliminar para siempre");
    if (!ok) return;
    setBusy(p.id);
    try {
      await api.purgeProperty(p.id);
      setList((l) => l.filter((x) => x.id !== p.id));
      toast("Eliminada definitivamente");
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="view-head"><div>
        <h2>Papelera</h2>
        <p>Lo que se elimina en Publicaciones queda acá: no se ve en la página, pero se puede recuperar.</p>
      </div></div>

      {list === null ? (
        <div className="empty">Cargando…</div>
      ) : !list.length ? (
        <div className="empty"><div>🗑️</div>La papelera está vacía.</div>
      ) : (
        <div className="prop-list">
          {list.map((p) => (
            <div className="prop-row trashed" key={p.id}>
              <div className="prop-thumb">
                {p.fotos[0] ? <img src={p.fotos[0]} alt="" /> : <svg aria-hidden="true"><use href="#logo" /></svg>}
              </div>
              <div className="prop-main">
                <h4>{p.titulo}</h4>
                <div className="sub">
                  {p.ref != null && <><b className="ref-code">{refCode(p, settings.inmobiliaria?.nombre)}</b> · </>}
                  {OPERACIONES[p.operacion]} · {TIPOS[p.tipo]}{lugar(p) ? ` · ${lugar(p)}` : ""}
                </div>
                <div className="price">{price(p)}</div>
                <div className="small muted">
                  Eliminada {p.eliminada_at ? timeAgo(p.eliminada_at) : ""}{p.eliminada_por ? ` por ${p.eliminada_por.nombre || p.eliminada_por.email}` : ""}
                </div>
              </div>
              <div className="prop-ctrl">
                <button className="btn btn-green btn-sm" disabled={busy === p.id} onClick={() => restore(p)}>♻️ Restaurar</button>
                <button className="btn btn-red btn-sm" disabled={busy === p.id} onClick={() => purge(p)}>Eliminar definitivamente</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

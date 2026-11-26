// =====================================================================
//  LUZ SERENA PANEL · Blog
//  Escribir lo que hacen (con foto sacada desde el celular) y que
//  aparezca al instante en la página. Se puede dejar como borrador.
// =====================================================================

import { useState } from "react";
import { api } from "../../api.js";
import { dayKey } from "../../lib/format.js";
import { useAdmin, POST_CATEGORIES, niceDay } from "../state.js";
import { useModal, useToast, useShowError, SheetHead, Switch } from "../ui.jsx";
import { preparePhoto } from "../photo.js";

function PostForm({ post }) {
  const { setPosts } = useAdmin();
  const { close, confirm } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [form, setForm] = useState({ titulo: "", categoria: POST_CATEGORIES[0], fecha: dayKey(new Date()), foto_url: null, texto: "", publicado: true, ...post });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const field = (key) => ({ value: form[key] || "", onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  async function onPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.uploadPhoto(await preparePhoto(file));
      setForm((f) => ({ ...f, foto_url: url }));
    } catch (e) { showError(e); }
    setUploading(false);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.titulo.trim()) return toast("Poné un título", true);
    setBusy(true);
    try {
      const saved = await api.savePost(form);
      setPosts((list) => (post?.id ? list.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...list]));
      close();
      toast(saved.publicado ? "¡Publicado! Ya se ve en la página ✓" : "Guardado como borrador");
    } catch (e) { showError(e); setBusy(false); }
  }

  async function remove() {
    if (!(await confirm("¿Borrar la publicación?", `«${post.titulo}» deja de verse en la página.`, "Borrar"))) return;
    try {
      await api.deletePost(post.id);
      setPosts((list) => list.filter((p) => p.id !== post.id));
      toast("Publicación borrada");
    } catch (e) { showError(e); }
  }

  return (
    <>
      <SheetHead title={post?.id ? "Editar publicación" : "Nueva publicación"} />
      <form noValidate onSubmit={onSubmit}>
        <div className="field"><label>Foto</label>
          <div className="drop">
            {form.foto_url ? <img src={form.foto_url} alt="" /> : <p>📷 Tocá para elegir una foto<br /><small className="muted">Desde el celular podés sacarla en el momento</small></p>}
            {uploading && <p className="small">Subiendo foto…</p>}
            <input type="file" accept="image/*" aria-label="Elegir foto" onChange={onPhoto} />
          </div>
        </div>
        <div className="field"><label htmlFor="pTitulo">Título</label><input id="pTitulo" placeholder="Ej.: Taller de baile con música de los 60" {...field("titulo")} /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="pCat">Categoría</label><select id="pCat" {...field("categoria")}>{POST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="pFecha">Fecha</label><input id="pFecha" type="date" {...field("fecha")} /></div>
        </div>
        <div className="field"><label htmlFor="pTexto">¿Qué hicieron?</label>
          <textarea id="pTexto" rows="6" placeholder="Contalo como se lo contarías a una familia. Dejá una línea en blanco para separar párrafos." {...field("texto")} /></div>
        <div className="field"><Switch label={form.publicado ? "Se ve en la página" : "Borrador (no se ve en la página)"} checked={form.publicado} onChange={(publicado) => setForm({ ...form, publicado })} /></div>
        <div className="row">
          <button className="btn btn-gold" type="submit" disabled={busy || uploading}>{post?.id ? "Guardar" : "Publicar"}</button>
          {post?.id && <button type="button" className="btn btn-ghost danger-text" onClick={remove}>Borrar</button>}
        </div>
      </form>
    </>
  );
}

export function Blog() {
  const { posts } = useAdmin();
  const { open } = useModal();
  const sorted = [...posts].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <>
      <div className="view-head">
        <div><h2>Blog</h2><p>Contá lo que hacen: aparece al instante en la página.</p></div>
        <button className="btn btn-gold btn-sm" onClick={() => open(<PostForm />)}>+ Nueva publicación</button>
      </div>
      {sorted.map((p) => (
        <div className="blog-row" key={p.id}>
          {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="noimg">📷</span>}
          <div><h4>{p.titulo}</h4>
            <small className="muted">{p.categoria} · {niceDay(p.fecha)} · {p.lecturas} lecturas · </small>
            {p.publicado ? <small className="ok-text">Publicada</small> : <small className="danger-text">Borrador</small>}
          </div>
          <button className="mini-btn" onClick={() => open(<PostForm post={p} />)}>Editar</button>
        </div>
      ))}
      {!sorted.length && <div className="empty">Todavía no hay publicaciones. ¡Contá la primera actividad!</div>}
    </>
  );
}

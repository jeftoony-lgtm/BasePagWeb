// =====================================================================
//  LUZ SERENA · Blog
//  - BlogPreview: las 3 últimas novedades en el inicio
//  - BlogPage: todas, con filtro por categoría (#blog)
//  - PostModal: la publicación abierta, con botón para compartir
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { formatDate } from "../lib/format.js";
import { useSite } from "./store.jsx";
import { SectionHead } from "./Sections.jsx";
import { WaIcon } from "./icons.jsx";

const niceDate = (fecha) => formatDate(`${fecha}T12:00:00`, { day: "numeric", month: "long" });

function PostCard({ post, onOpen }) {
  return (
    <button className="post" onClick={() => onOpen(post)}>
      <div className="im">{post.foto_url && <img src={post.foto_url} alt="" loading="lazy" />}</div>
      <div className="bd">
        <span className="tag">{post.categoria}</span>
        <h3>{post.titulo}</h3>
        <p>{post.texto}</p>
        <time>{niceDate(post.fecha)}</time>
      </div>
    </button>
  );
}

export function BlogPreview({ onOpen }) {
  const { posts } = useSite();
  return (
    <section className="sec" id="novedades" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <SectionHead eyebrow="Novedades" title={<>Lo que <em>vivimos</em> juntos.</>} text="Talleres, celebraciones y momentos del día a día, contados por nuestro equipo." />
        <div className="posts">
          {posts.length ? posts.slice(0, 3).map((p) => <PostCard key={p.id} post={p} onOpen={onOpen} />) : <div className="empty">Pronto vas a ver novedades acá.</div>}
        </div>
        <div style={{ textAlign: "center", marginTop: 28 }}><a className="btn btn-ghost" href="#blog">Ver todas las novedades</a></div>
      </div>
    </section>
  );
}

export function BlogPage({ onOpen }) {
  const { posts } = useSite();
  const [category, setCategory] = useState("Todas");
  const categories = ["Todas", ...new Set(posts.map((p) => p.categoria))];
  const list = posts.filter((p) => category === "Todas" || p.categoria === category);

  return (
    <main>
      <section className="sec blog-page">
        <div className="wrap">
          <a href="#inicio" className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>← Volver al inicio</a>
          <div className="sec-head"><p className="eyebrow">Blog</p><h2>Novedades de <em>Luz Serena</em>.</h2><p>Lo que hacemos, celebramos y aprendemos cada semana.</p></div>
          <div className="chips">
            {categories.map((c) => <button key={c} aria-pressed={c === category} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
          <div className="posts">
            {list.length ? list.map((p) => <PostCard key={p.id} post={p} onOpen={onOpen} />) : <div className="empty">No hay novedades en esta categoría.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}

export function PostModal({ post, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!post) return;
    api.readPost(post.id);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", onKey); };
  }, [post, onClose]);

  if (!post) return null;
  const share = `${post.titulo} — Luz Serena Residencial ${location.origin}/#blog`;

  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-label={post.titulo} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <button className="close" aria-label="Cerrar" ref={closeRef} onClick={onClose}>✕</button>
        {post.foto_url && <div className="im"><img src={post.foto_url} alt="" /></div>}
        <div className="bd">
          <span className="tag">{post.categoria}</span> <time style={{ fontSize: ".8em", color: "var(--muted)" }}>{niceDate(post.fecha)}</time>
          <h2 style={{ marginTop: ".4em" }}>{post.titulo}</h2>
          {post.texto.split(/\n\s*\n/).map((t, i) => <p key={i}>{t}</p>)}
          <div className="share">
            <a className="btn btn-wa btn-sm" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(share)}`}><WaIcon /> Compartir</a>
            <a className="btn btn-ghost btn-sm" href="#visita" onClick={onClose}>Agendar una visita</a>
          </div>
        </div>
      </div>
    </div>
  );
}

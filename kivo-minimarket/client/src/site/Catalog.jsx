// =====================================================================
//  KIVO · Cinta de avisos, combo del día y góndolas
//  Todo se arma con lo que el dueño carga en el panel.
// =====================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { money, normalize, firstEmoji } from "../lib/format.js";
import { api } from "../api.js";
import { useStore } from "./store.jsx";
import { AddButton, useAddToCart } from "./cart.jsx";

/* ---------- Cinta de avisos ---------- */
export function Marquee() {
  const avisos = useStore().settings.avisos || [];
  if (!avisos.length) return null;
  // Se repite dos veces para que el movimiento no tenga cortes
  const spans = [...avisos, ...avisos].map((a, i) => <span key={i}>{a}</span>);
  return <div className="marquee" id="marquee" aria-hidden="true"><div>{spans}</div></div>;
}

/* ---------- Combo del día ---------- */
export function Combo() {
  const combo = useStore().settings.combo;
  const addToCart = useAddToCart();
  if (!combo?.activo) return null;

  // Título: la segunda mitad va resaltada en naranja ("Promo pack <em>Picada Mundial</em>")
  const words = (combo.titulo || "").split(" ");
  const half = Math.ceil(words.length / 2);
  const items = combo.items || [];
  const emojis = items.map(firstEmoji).filter(Boolean).slice(0, 4);

  return (
    <section className="block" id="combo">
      <div className="reveal">
        <span className="eyebrow">Tu combo de hoy</span>
        <h2 className="h2">{words.slice(0, half).join(" ")} <em>{words.slice(half).join(" ")}</em></h2>
      </div>
      <div className="combo reveal">
        <div className="combo-art">
          {emojis.map((e, i) => <div className="item" key={i}>{e}</div>)}
          <div className="price-burst"><div><small>TODO POR</small><strong>{money(combo.precio)}</strong></div></div>
        </div>
        <div className="combo-info">
          {combo.etiqueta && <span className="tag">{combo.etiqueta}</span>}
          <h3>{combo.subtitulo || ""}</h3>
          <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
          <div>
            <button className="btn btn-orange" onClick={(e) => addToCart("combo", e.currentTarget)}>Agregar el pack a la canasta</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Foto o emoji de un producto ---------- */
export function ProductThumb({ product }) {
  return product.foto_url
    ? <img src={product.foto_url} alt="" loading="lazy" />
    : <span>{product.emoji || "🛒"}</span>;
}

function ProductCard({ product: p, index }) {
  const badge = !p.en_stock
    ? <span className="badge out">SIN STOCK</span>
    : p.categoria === "grido" ? <span className="badge">NUEVO</span> : null;
  return (
    <article className={`prod${p.en_stock ? "" : " out"}`} style={{ animation: `pop .45s ${index * 0.04}s both cubic-bezier(.2,1.4,.4,1)` }}>
      <div className="thumb" style={{ background: p.color || "#f4f4f4" }}>{badge}<ProductThumb product={p} /></div>
      <h4>{p.nombre}</h4>
      <div className="meta">{p.detalle}</div>
      <div className="row">
        <span className="price">{money(p.precio)}</span>
        <AddButton id={p.id} label={`Agregar ${p.nombre}`} disabled={!p.en_stock} />
      </div>
    </article>
  );
}

/* ---------- Góndolas: pestañas, estante y buscador ---------- */
export function Shelves() {
  const { products, categories } = useStore();
  const withProducts = useMemo(() => categories.filter((c) => products.some((p) => p.categoria === c.id)), [categories, products]);
  const [category, setCategory] = useState(() => withProducts[0]?.id);
  const [search, setSearch] = useState("");
  const shelfRef = useRef(null);

  const query = normalize(search.trim());
  const list = query
    ? products.filter((p) => normalize(`${p.nombre} ${p.detalle}`).includes(query))
    : products.filter((p) => p.categoria === category);

  // Cada vez que cambia lo que se ve, el estante vuelve al principio
  useEffect(() => { if (shelfRef.current) shelfRef.current.scrollLeft = 0; }, [query, category]);

  // Le avisamos al dueño qué buscan y no hay (aparece en el panel → Resumen)
  const nothingFound = list.length === 0;
  useEffect(() => {
    if (!nothingFound || query.length < 3) return;
    const timer = setTimeout(() => api.logSearch(query), 1500);
    return () => clearTimeout(timer);
  }, [nothingFound, query]);

  const listKey = query || category; // al cambiar, las tarjetas se vuelven a animar

  return (
    <section className="block" id="gondolas" style={{ paddingTop: 20 }}>
      <div className="reveal">
        <span className="eyebrow">Recorré el local</span>
        <h2 className="h2">Las <em>góndolas</em></h2>
        <p className="lead">Deslizá cada estante, tocá <b>+</b> y lo que elijas cae en tu canasta. Al final lo mandás por WhatsApp.</p>
        <label className="search">
          <span>🔎</span>
          <input id="search" type="search" placeholder="Buscar: yerba, coca, figuritas…" aria-label="Buscar productos"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <div className="tabs" role="tablist" id="tabs">
        {withProducts.map((c) => (
          <button key={c.id} className="tab" role="tab" aria-selected={!query && c.id === category}
            onClick={() => { setCategory(c.id); setSearch(""); }}>
            <span>{c.emoji}</span>{c.nombre}
          </button>
        ))}
      </div>
      <div className="shelf-wrap">
        <div className="shelf" id="shelf" ref={shelfRef}>
          {nothingFound
            ? <p className="shelf-empty">No encontramos eso. Probá con otra palabra, preguntale al asistente o pedilo en la nota.</p>
            : list.map((p, i) => <ProductCard key={`${listKey}-${p.id}`} product={p} index={i} />)}
        </div>
        <div className="shelf-board"></div>
      </div>
    </section>
  );
}

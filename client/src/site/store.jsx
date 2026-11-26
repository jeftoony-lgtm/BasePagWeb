// =====================================================================
//  LUZ SERENA · Lo que la página tiene cargado
//  Ajustes (plazas, whatsapp, agenda), publicaciones del blog y una
//  ayuda para armar links de WhatsApp que cuentan el toque.
//  Uso: const { settings, posts, libres, wa } = useSite();
// =====================================================================

import { createContext, useContext } from "react";

export const SiteContext = createContext(null);
export const useSite = () => useContext(SiteContext);

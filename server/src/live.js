// =====================================================================
//  KIVO · Pedidos en vivo
//  El panel deja una conexión abierta (Server-Sent Events) y el servidor
//  le avisa cada vez que entra o cambia un pedido.
// =====================================================================

const listeners = new Set();

/** Suma una conexión del panel y la saca sola cuando se cierra */
export function listen(req, res) {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // que los proxies no guarden los mensajes
  });
  res.flushHeaders();
  res.write(": conectado\n\n");

  const ping = setInterval(() => res.write(": ping\n\n"), 25_000); // mantiene viva la conexión
  listeners.add(res);
  req.on("close", () => {
    clearInterval(ping);
    listeners.delete(res);
  });
}

/** Avisa a todos los paneles abiertos: type = "INSERT" | "UPDATE" */
export function broadcast(type, order) {
  const message = `data: ${JSON.stringify({ type, order })}\n\n`;
  for (const res of listeners) res.write(message);
}

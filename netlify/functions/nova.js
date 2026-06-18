// nova.js — limpa a conversa atual (NÃO apaga os fatos aprendidos).
const core = require("./lib/core");

exports.handler = async (event) => {
  if (!core.autorizado(event)) return core.json(401, { erro: "Não autorizado" });
  if (event.httpMethod !== "POST") return core.json(405, { erro: "Método não permitido" });
  try {
    await core.limparConversa();
    return core.json(200, { ok: true });
  } catch (e) {
    return core.json(500, { erro: String(e) });
  }
};

// estado.js — carrega o estado inicial: biblioteca (base + fatos) e conversa salva.
const core = require("./lib/core");

exports.handler = async (event) => {
  if (!core.autorizado(event)) return core.json(401, { erro: "Não autorizado" });
  try {
    await core.semear(); // garante o conhecimento base no banco (1ª vez)
    const [biblioteca, fatos, conversa] = await Promise.all([
      core.construirBiblioteca(),
      core.listarFatos(),
      core.carregarConversa(),
    ]);
    return core.json(200, { biblioteca, fatos, conversa: conversa || null });
  } catch (e) {
    return core.json(500, { erro: String(e) });
  }
};

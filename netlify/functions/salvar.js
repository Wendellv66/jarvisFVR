// salvar.js — salva no cérebro os fatos aprovados (ex.: vindos da confirmação do PDF).
const core = require("./lib/core");

exports.handler = async (event) => {
  if (!core.autorizado(event)) return core.json(401, { erro: "Não autorizado" });
  if (event.httpMethod !== "POST") return core.json(405, { erro: "Método não permitido" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return core.json(400, { erro: "JSON inválido" });
  }

  const fatos = Array.isArray(body.fatos) ? body.fatos : [];
  try {
    const avisos = await core.salvarFatos(fatos);
    const fatosAtuais = await core.listarFatos();
    return core.json(200, { ok: true, salvos: avisos.length, fatos: fatosAtuais });
  } catch (e) {
    return core.json(500, { erro: String(e) });
  }
};

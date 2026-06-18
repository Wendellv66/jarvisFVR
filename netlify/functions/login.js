// login.js — valida usuário/senha e devolve o token de acesso da API.
const { json } = require("./lib/core");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Método não permitido" });
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { erro: "JSON inválido" });
  }
  const usuario = (body.usuario || "").trim();
  const senha = body.senha || "";
  if (usuario === process.env.APP_USUARIO && senha === process.env.APP_SENHA) {
    return json(200, { ok: true, token: process.env.APP_TOKEN });
  }
  return json(401, { ok: false, erro: "Identificação ou código incorretos." });
};

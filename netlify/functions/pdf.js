// pdf.js — recebe um PDF (base64), extrai o texto e propõe fatos (NÃO salva ainda).
const pdfParse = require("pdf-parse");
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

  const base64 = body.arquivo_base64 || "";
  const nome = body.nome || "documento.pdf";
  if (!base64) return core.json(400, { erro: "PDF não enviado" });

  try {
    const buffer = Buffer.from(base64, "base64");
    const dados = await pdfParse(buffer);
    const texto = (dados.text || "").trim();
    if (!texto) {
      return core.json(200, {
        fatos: [],
        aviso: "Não consegui ler texto deste PDF (pode ser escaneado/imagem).",
      });
    }
    const fatos = await core.extrairDocumento(texto, nome);
    return core.json(200, { fatos });
  } catch (e) {
    return core.json(500, { erro: "Falha ao ler o PDF: " + String(e) });
  }
};

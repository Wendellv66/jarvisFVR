// turno.js — processa uma mensagem do Fabio: anota fatos, resume se preciso, responde, persiste.
const core = require("./lib/core");

const JANELA_MANTER = 12; // mensagens recentes mantidas na íntegra
const LIMITE_RESUMIR = 20; // acima disso, resume as mais antigas

exports.handler = async (event) => {
  if (!core.autorizado(event)) return core.json(401, { erro: "Não autorizado" });
  if (event.httpMethod !== "POST") return core.json(405, { erro: "Método não permitido" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return core.json(400, { erro: "JSON inválido" });
  }

  const historico = Array.isArray(body.historico) ? body.historico : [];
  let resumo = body.resumo || "";
  let nResumidas = body.n_resumidas || 0;

  const ultima = historico[historico.length - 1];
  const mensagemFabio = ultima && ultima.role === "user" ? ultima.content : "";

  // 1) Biblioteca atual (base + fatos)
  const biblioteca = await core.construirBiblioteca();

  // 2) Extrair fatos. NOVOS salvam direto; CORREÇÕES pedem confirmação antes de alterar.
  let anotacoes = [];
  let pendentes = [];
  try {
    const fatos = await core.extrair(mensagemFabio, biblioteca);
    const novos = fatos.filter((f) => f.tipo !== "correcao");
    const correcoes = fatos.filter((f) => f.tipo === "correcao");
    anotacoes = await core.salvarFatos(novos);
    for (const c of correcoes) {
      const atual = await core.acharSemelhante(c.assunto, c.conteudo);
      pendentes.push({
        assunto: c.assunto,
        conteudo: c.conteudo,
        atual: atual ? atual.conteudo : null,
      });
    }
  } catch (e) {
    anotacoes = [];
  }

  // 3) Resumo incremental
  const naoResumidas = historico.slice(nResumidas);
  if (naoResumidas.length > LIMITE_RESUMIR) {
    const qtd = naoResumidas.length - JANELA_MANTER;
    const trecho = naoResumidas.slice(0, qtd);
    try {
      resumo = await core.resumir(resumo, trecho);
      nResumidas += qtd;
    } catch (e) {}
  }

  // 4) Resposta do J.A.R.V.I.S. (com a biblioteca já atualizada pelos novos fatos)
  let resposta;
  try {
    const bibAtualizada = await core.construirBiblioteca();
    const histModelo = historico.slice(nResumidas);
    resposta = await core.responder(histModelo, resumo, bibAtualizada);
  } catch (e) {
    resposta = "Desculpe, senhor — tive um problema ao processar agora. Tente novamente.";
  }

  // 5) Atualiza o histórico (anotação + resposta) e persiste
  const novoHistorico = historico.slice();
  if (anotacoes.length) {
    novoHistorico.push({
      role: "assistant",
      content: "__ANOTEI__\n" + anotacoes.map((a) => "- " + a).join("\n"),
    });
  }
  novoHistorico.push({ role: "assistant", content: resposta });

  await core.salvarConversa(novoHistorico, resumo, nResumidas);
  const fatosAtuais = await core.listarFatos();

  return core.json(200, {
    resposta,
    anotacoes,
    pendentes,
    resumo,
    n_resumidas: nResumidas,
    fatos: fatosAtuais,
  });
};

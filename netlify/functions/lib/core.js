// core.js — Lógica compartilhada do J.A.R.V.I.S. (Netlify Functions)
// Usa OpenAI (gpt-4o-mini) + Supabase. As chaves ficam em variáveis de ambiente.

const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const MODELO = "gpt-4o-mini";
const MARCADOR = "## 🆕 Anotações novas (capturadas pelo Entrevistador)";

// --------------------------------------------------------------------------- //
// Biblioteca base (conteúdo fixo do PDF). Os fatos novos vêm do Supabase.      //
// --------------------------------------------------------------------------- //
const BASE_LIBRARY = `# Biblioteca Técnica FVR — Mestre Fabio Vidal

Cérebro do agente da FVR Comercial, alimentado pela experiência do Fabio Vidal.

## 1. O Modelo FVR / JNF
- Perfil de Venda: técnica e consultiva.
- Objetivo: entender o contexto completo do projeto de arquitetura para indicar a ferragem exata.
- Benefício: reduzir erros de especificação e retrabalho a praticamente zero (padrão europeu suíço/alemão).

## 2. Dobradiças: A Linha Mimetizada
Destaque: IN.05.061 (Coplan 150) — dobradiça invisível com regulagem 3D; ferragem de 25mm;
permite portas mimetizadas de 42mm pesando até 80kg; usinagem de 23mm; furação 100% simétrica.
Regra: suporta 30 a 80kg (3 a 4 dobradiças). Portas a partir de 2.100mm de altura = 4 dobradiças.

Família JNF Coplan:
- IN.05.067 (Coplan 97): a menor (16kg com 3 un.); 14mm x 75mm; portas pequenas, quadros, shafts; montantes de 18mm.
- IN.05.066 (Coplan 100): 50kg; 19mm (portas a partir de 25mm); painéis e móveis pequenos e pesados.
- IN.05.064 (Coplan 120): 60 a 80kg; permite sistema FOLDING (camarão); ótimo custo-benefício.
- IN.05.065 (Coplan 145): a mais popular; até 60kg e larguras até 900mm; 22mm; várias cores (prata, preta, branca, cobre, dourada).
- IN.05.062 (Coplan 175): até 120kg; robusta, alto padrão.
- IN.05.063 (Coplan 235): 190kg; projetos especiais que exigem dobradiça.

## 3. Pivôs Hidráulicos
Única gama completa do Brasil para portas de 30kg a 500kg. Padrão da linha: softclosing,
regulagem de velocidade, parada 90° e abertura vai e vem.
- IN.05.211 (até 60kg): portas 30-50mm; altura máx 2.700mm, largura máx 1.200mm.
- IN.05.204 (até 100kg): eixo fixo na extremidade (80mm); portas 40-50mm; altura máx 3.000mm, largura máx 1.000mm.
- IN.05.213 (até 100kg): eixo variável; portas 40-50mm; altura máx 3.000mm, largura máx 1.500mm.
- IN.05.212 (até 200kg): giro 360º, eixo variável/central; portas a partir de 50mm; altura máx 4.000mm, largura máx 3.000mm.
- IN.05.215 (até 350kg): portas grossas (ACM 100-200mm); altura máx 6.000mm, largura máx 3.000mm.
- IN.05.216 (até 500kg, BIG DOORS): portas monumentais ACM; altura máx 6.000mm, largura máx 3.000mm.
Diferenciais: sistema CAM (abre meia tonelada sem esforço) e amortecimento também na abertura aos 90º.
Regras: área interna e externa. Para entrada/muito vento, vender junto o Posicionador Magnético IN.17.012
(exceção: se houver fechadura eletrônica, o IN.17.012 não é necessário).

## 4. Fechaduras
Categorias: convencionais; magnéticas; convencionais p/ correr; magnéticas p/ correr; auxiliares;
"asa de avião" (híbrida); chave tetra; segurança 4 pinos; eletrônica touch; pulse lock.
- 4.1 Convencionais: interna ex. IN.20.845.60; externa ex. IN.20.975.60 (linha 970 JNF). Cilindro europeu ("caveirinha").
  Adaptadores IN.20.AWC (roseta banheiro) e IN.20.AKN (chave gorge). Estoque enxuto: 1 fechadura + componentes baratos.
- 4.2 Magnéticas (giro): IN.20.835 (econômica, interna, perfil alumínio); IN.20.855 (robusta, interna e externa).
- 4.3 Magnética p/ correr: IN.20.925 (Pendulum) — puxador embutido, 100% silenciosa; alto padrão e náutico.
- 4.4 Auxiliar "Asa de Avião": IN.20.500 — gancho duplo; serve correr e giro.
- 4.5 Auxiliar mais pedida: IN.20.973.
- 4.6 Eletrônica Touch: IN.20.860 — pilhas 4x AAA; abre por toque; liberação de emergência.
- 4.7 Pulse Lock: IN.20.165 — trinco magnético + roseta + bloqueio integrado; anti-pânico; aço inox AISI 304;
  funciona com a maioria dos puxadores JNF; permite qualquer maçaneta JNF (liberdade de design).

## 5. Protocolo de Atendimento
Passo 1: identificar perfil. Atende: arquiteto, marcenaria, indústria de móveis/portas de alto padrão.
Não atende: cliente final/varejo (direcionar educadamente para outro canal).
Passo 2 (primeiro contato): nome, região/cidade, como nos encontrou.
Passo 3: escopo — "qual o ambiente e o tipo de porta?" e coletar espessura, peso, altura, largura, material.

## 6. Diretrizes do Agente
- Responder com calma e precisão. Zero alucinação: se não tiver certeza, não inventar — perguntar ou escalar ao Fabio.
- Aprendizado contínuo: toda resposta nova do Fabio deve ser registrada na biblioteca.`;

// --------------------------------------------------------------------------- //
// Clientes                                                                     //
// --------------------------------------------------------------------------- //
let _openai = null;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

let _sb = null;
function supabase() {
  if (!_sb) _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  return _sb;
}

// --------------------------------------------------------------------------- //
// Helpers HTTP / Auth                                                          //
// --------------------------------------------------------------------------- //
function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

function autorizado(event) {
  const token = event.headers["x-app-token"] || event.headers["X-App-Token"];
  return token && token === process.env.APP_TOKEN;
}

// --------------------------------------------------------------------------- //
// Biblioteca = base + fatos do Supabase                                        //
// --------------------------------------------------------------------------- //
async function listarFatos() {
  try {
    const { data } = await supabase().from("fatos").select("*").order("id");
    return data || [];
  } catch (e) {
    return [];
  }
}

function renderFatos(fatos) {
  return fatos
    .map((f) => {
      const tag = f.tipo === "correcao" ? " [CORRIGIDO]" : "";
      return `- [${f.data || ""}] (Fabio)${tag} **${f.assunto || "geral"}**: ${f.conteudo || ""}`;
    })
    .join("\n");
}

async function construirBiblioteca() {
  const fatos = await listarFatos();
  return `${BASE_LIBRARY}\n\n${MARCADOR}\n\n${renderFatos(fatos)}\n`;
}

// --------------------------------------------------------------------------- //
// Prompts                                                                      //
// --------------------------------------------------------------------------- //
function promptEntrevistador(biblioteca) {
  return `Você é o J.A.R.V.I.S., o assistente de inteligência da FVR — inspirado no JARVIS do
Homem de Ferro. Você conversa com o MESTRE FABIO VIDAL, especialista com 25 anos em ferragens
(dobradiças, pivôs hidráulicos, fechaduras FVR/JNF).

Personalidade: elegante, prestativa, precisa e levemente espirituosa. Trate-o por "senhor" ou
"Mestre Fabio".

MISSÃO: entrevistar o Fabio para registrar e expandir a Biblioteca Técnica da FVR (o cérebro do
futuro agente de vendas). Descubra o que ainda NÃO está documentado.

Como agir:
- Identifique LACUNAS na biblioteca (itens citados sem detalhes; produtos sem peso/medida/uso).
- Faça UMA pergunta por vez, objetiva e técnica. Aprofunde um assunto antes de mudar.
- Sempre que o Fabio ensinar algo, confirme em uma frase curta antes da próxima pergunta.
- NUNCA invente especificação. Se ele for vago, peça o número/medida/código exato.
- Responda em português do Brasil.

=== BIBLIOTECA TÉCNICA ATUAL ===
${biblioteca}
=== FIM ===`;
}

const PROMPT_EXTRATOR = `Você extrai conhecimento técnico para a Biblioteca da FVR. Recebe a última
fala do MESTRE FABIO VIDAL e a biblioteca atual.

Extraia APENAS afirmações técnicas concretas e NOVAS ditas pelo Fabio (medidas, pesos, capacidades,
materiais, regras, códigos IN.xx, diferenciais).

Regras (anti-alucinação):
- Use SOMENTE o que está explícito na fala do Fabio. Não complete, não deduza.
- Ignore saudações, perguntas e conversa fiada → lista vazia.
- Se a info já está IDÊNTICA na biblioteca, não repita → lista vazia.
- CORREÇÃO: se a fala CONTRADIZ/ATUALIZA um dado existente, marque "tipo":"correcao". Senão "tipo":"novo".

Responda SOMENTE em JSON:
{"fatos":[{"assunto":"código/tema","conteudo":"o fato em uma frase","tipo":"novo"}]}
Sem nada a extrair: {"fatos":[]}`;

const PROMPT_DOCUMENTO = `Você extrai conhecimento técnico de um DOCUMENTO (catálogo, ficha técnica)
da FVR sobre ferragens. Extraia TODOS os fatos técnicos concretos (códigos IN.xx, medidas, pesos,
capacidades, materiais, usos, regras).
Regras: use SOMENTE o texto fornecido; não invente; cada fato é uma frase curta; ignore índices,
páginas, rodapés e marketing vazio.
Responda SOMENTE em JSON: {"fatos":[{"assunto":"código/tema","conteudo":"o fato"}]}
Sem nada técnico: {"fatos":[]}`;

// --------------------------------------------------------------------------- //
// IA: responder, extrair, resumir, documento                                  //
// --------------------------------------------------------------------------- //
async function responder(historico, resumo, biblioteca) {
  const mensagens = [{ role: "system", content: promptEntrevistador(biblioteca) }];
  if (resumo) {
    mensagens.push({
      role: "system",
      content: "Resumo da conversa anterior (mantenha o contexto):\n" + resumo,
    });
  }
  for (const m of historico) mensagens.push({ role: m.role, content: m.content });

  const r = await openai().chat.completions.create({
    model: MODELO,
    messages: mensagens,
    temperature: 0.5,
  });
  return r.choices[0].message.content.trim();
}

async function extrair(mensagem, biblioteca) {
  const conteudo =
    `=== BIBLIOTECA ATUAL ===\n${biblioteca}\n=== FIM ===\n\n` +
    `=== ÚLTIMA FALA DO FABIO ===\n${mensagem}\n=== FIM ===`;
  const r = await openai().chat.completions.create({
    model: MODELO,
    messages: [
      { role: "system", content: PROMPT_EXTRATOR },
      { role: "user", content: conteudo },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });
  try {
    const dados = JSON.parse(r.choices[0].message.content);
    return (dados.fatos || [])
      .map((f) => ({
        assunto: String(f.assunto || "").trim() || "geral",
        conteudo: String(f.conteudo || "").trim(),
        tipo: String(f.tipo || "").toLowerCase() === "correcao" ? "correcao" : "novo",
      }))
      .filter((f) => f.conteudo);
  } catch (e) {
    return [];
  }
}

async function resumir(resumoAnterior, mensagens) {
  const trecho = mensagens
    .map((m) => `${m.role === "user" ? "Fabio" : "JARVIS"}: ${m.content}`)
    .join("\n");
  const prompt =
    "Você mantém um resumo de uma conversa técnica entre o J.A.R.V.I.S. e o Mestre Fabio sobre " +
    "ferragens. Atualize o resumo incorporando as novas mensagens. Conciso (~200 palavras), " +
    "preserve fatos técnicos, decisões e o que falta perguntar. Não invente.\n\n" +
    `=== RESUMO ATUAL ===\n${resumoAnterior || "(vazio)"}\n\n` +
    `=== NOVAS MENSAGENS ===\n${trecho}\n\n=== NOVO RESUMO ===`;
  const r = await openai().chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  return r.choices[0].message.content.trim();
}

async function extrairDocumento(texto, origem) {
  if (!texto || !texto.trim()) return [];
  const pedacos = [];
  for (let i = 0; i < texto.length; i += 8000) pedacos.push(texto.slice(i, i + 8000));
  const todos = [];
  for (const pedaco of pedacos) {
    try {
      const r = await openai().chat.completions.create({
        model: MODELO,
        messages: [
          { role: "system", content: PROMPT_DOCUMENTO },
          { role: "user", content: pedaco },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      });
      const dados = JSON.parse(r.choices[0].message.content);
      for (const f of dados.fatos || []) {
        let conteudo = String(f.conteudo || "").trim();
        if (!conteudo) continue;
        if (origem) conteudo = `${conteudo} (fonte: ${origem})`;
        todos.push({ assunto: String(f.assunto || "").trim() || "geral", conteudo, tipo: "novo" });
      }
    } catch (e) {
      continue;
    }
  }
  return todos;
}

// --------------------------------------------------------------------------- //
// Salvar fatos (com correção) no Supabase                                      //
// --------------------------------------------------------------------------- //
function hoje() {
  return new Date().toISOString().slice(0, 10);
}

async function salvarFatos(fatos) {
  if (!fatos || !fatos.length) return [];
  const sb = supabase();
  const data = hoje();
  const avisos = [];
  for (const f of fatos) {
    const assunto = f.assunto || "geral";
    const conteudo = f.conteudo;
    if (f.tipo === "correcao") {
      let alvo = null;
      try {
        const { data: existentes } = await sb.from("fatos").select("id,assunto,conteudo");
        for (const row of existentes || []) {
          const campo = `${row.assunto || ""} ${row.conteudo || ""}`.toLowerCase();
          if (campo.includes(assunto.toLowerCase())) {
            alvo = row;
            break;
          }
        }
      } catch (e) {
        alvo = null;
      }
      const registro = { data, assunto, conteudo, tipo: "correcao" };
      try {
        if (alvo) await sb.from("fatos").update(registro).eq("id", alvo.id);
        else await sb.from("fatos").insert(registro);
      } catch (e) {}
      avisos.push(`*(correção)* **${assunto}**: ${conteudo}`);
    } else {
      try {
        await sb.from("fatos").insert({ data, assunto, conteudo, tipo: "novo" });
      } catch (e) {}
      avisos.push(`**${assunto}**: ${conteudo}`);
    }
  }
  return avisos;
}

// --------------------------------------------------------------------------- //
// Conversa (estado) no Supabase                                                //
// --------------------------------------------------------------------------- //
async function carregarConversa() {
  try {
    const { data } = await supabase().from("estado").select("valor").eq("chave", "conversa");
    if (data && data.length) return JSON.parse(data[0].valor);
  } catch (e) {}
  return null;
}

async function salvarConversa(historico, resumo, n_resumidas) {
  try {
    await supabase()
      .from("estado")
      .upsert({ chave: "conversa", valor: JSON.stringify({ historico, resumo, n_resumidas }) });
  } catch (e) {}
}

async function limparConversa() {
  try {
    await supabase().from("estado").delete().eq("chave", "conversa");
  } catch (e) {}
}

module.exports = {
  MARCADOR,
  BASE_LIBRARY,
  json,
  autorizado,
  listarFatos,
  renderFatos,
  construirBiblioteca,
  responder,
  extrair,
  resumir,
  extrairDocumento,
  salvarFatos,
  carregarConversa,
  salvarConversa,
  limparConversa,
};

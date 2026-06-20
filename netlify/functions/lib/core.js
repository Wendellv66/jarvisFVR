// core.js — Lógica compartilhada do J.A.R.V.I.S. (Netlify Functions)
// Usa OpenAI (gpt-4o-mini) + Supabase. As chaves ficam em variáveis de ambiente.

const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const MODELO = "gpt-4o-mini";
const MARCADOR = "## 🆕 Anotações novas (capturadas pelo Entrevistador)";

// --------------------------------------------------------------------------- //
// Introdução fixa + Conhecimento base (semeado no Supabase na 1ª execução).     //
// Após semeado, TUDO vive no banco e é editável (inclusive estes itens).        //
// --------------------------------------------------------------------------- //
const INTRO =
  "# Biblioteca Técnica FVR — Mestre Fabio Vidal\n" +
  "Cérebro do agente da FVR. Itens marcados (Fabio) foram ensinados/atualizados por ele.";

const BASE_FATOS = [
  { assunto: "Modelo FVR/JNF", conteudo: "Venda técnica e consultiva; objetivo é entender o projeto e indicar a ferragem exata; padrão de qualidade europeu (suíço/alemão), reduzindo erros e retrabalho a praticamente zero." },
  // Dobradiças
  { assunto: "IN.05.061 (Coplan 150)", conteudo: "Dobradiça invisível com regulagem 3D; ferragem 25mm; permite portas mimetizadas de 42mm pesando até 80kg; usinagem 23mm; furação 100% simétrica." },
  { assunto: "Regra de dobradiças", conteudo: "Dobradiças suportam 30 a 80kg (3 a 4 unidades); portas a partir de 2.100mm de altura exigem 4 dobradiças." },
  { assunto: "IN.05.067 (Coplan 97)", conteudo: "A menor do mercado; 16kg (3 unidades); 14mm x 75mm; portas pequenas, quadros de energia, shafts; montantes de 18mm." },
  { assunto: "IN.05.066 (Coplan 100)", conteudo: "Dobradiça 50kg; 19mm (portas a partir de 25mm); painéis e móveis pequenos e pesados." },
  { assunto: "IN.05.064 (Coplan 120)", conteudo: "Dobradiça 60 a 80kg; permite sistema folding (camarão); ótimo custo-benefício." },
  { assunto: "IN.05.065 (Coplan 145)", conteudo: "A dobradiça mais popular; até 60kg, larguras até 900mm; 22mm; várias cores (prata, preta, branca, cobre, dourada)." },
  { assunto: "IN.05.062 (Coplan 175)", conteudo: "Dobradiça até 120kg; robusta, alto padrão." },
  { assunto: "IN.05.063 (Coplan 235)", conteudo: "Dobradiça 190kg; projetos especiais que exigem dobradiça." },
  // Pivôs
  { assunto: "Pivôs hidráulicos (linha)", conteudo: "FVR tem a única gama completa do Brasil para portas de 30kg a 500kg; padrão: softclosing, regulagem de velocidade, parada 90° e abertura vai e vem." },
  { assunto: "IN.05.211", conteudo: "Pivô até 60kg; portas 30-50mm; altura máx 2.700mm, largura máx 1.200mm." },
  { assunto: "IN.05.204", conteudo: "Pivô até 100kg; eixo fixo na extremidade (80mm); portas 40-50mm; altura máx 3.000mm, largura máx 1.000mm." },
  { assunto: "IN.05.213", conteudo: "Pivô até 100kg; eixo variável; portas 40-50mm; altura máx 3.000mm, largura máx 1.500mm." },
  { assunto: "IN.05.212", conteudo: "Pivô até 200kg; giro 360°, eixo variável/central; portas a partir de 50mm; altura máx 4.000mm, largura máx 3.000mm." },
  { assunto: "IN.05.215", conteudo: "Pivô até 350kg; portas grossas ACM 100-200mm; altura máx 6.000mm, largura máx 3.000mm." },
  { assunto: "IN.05.216 (BIG DOORS)", conteudo: "Pivô até 500kg; portas monumentais ACM 100-200mm; altura máx 6.000mm, largura máx 3.000mm." },
  { assunto: "Pivôs - diferenciais", conteudo: "Sistema CAM abre porta de meia tonelada sem esforço; amortecimento também na abertura aos 90°." },
  { assunto: "IN.17.012 (Posicionador Magnético)", conteudo: "Obrigatório junto com pivô em portas de entrada/muito vento; dispensável se houver fechadura eletrônica." },
  // Fechaduras
  { assunto: "Fechaduras convencionais", conteudo: "Interna ex. IN.20.845.60; externa ex. IN.20.975.60 (linha 970 JNF); cilindro europeu (caveirinha); adaptadores IN.20.AWC (roseta banheiro) e IN.20.AKN (chave gorge); estoque enxuto." },
  { assunto: "Fechaduras magnéticas (giro)", conteudo: "IN.20.835 econômica (interna, perfil alumínio); IN.20.855 robusta (interna e externa); compatíveis com adaptadores e cilindro europeu." },
  { assunto: "IN.20.925 (Pendulum)", conteudo: "Fechadura magnética para porta de correr; puxador embutido; 100% silenciosa; alto padrão e setor náutico." },
  { assunto: "IN.20.500 (Asa de Avião)", conteudo: "Fechadura auxiliar com gancho duplo; serve tanto para portas de correr quanto de giro." },
  { assunto: "IN.20.973", conteudo: "Fechadura auxiliar mais pedida do catálogo." },
  { assunto: "IN.20.860 (Touch)", conteudo: "Fechadura eletrônica touch; pilhas 4x AAA; abre por toque; possui liberação de emergência." },
  { assunto: "IN.20.165 (Pulse Lock)", conteudo: "Trinco magnético + roseta + bloqueio integrado; anti-pânico; aço inox AISI 304; aceita qualquer maçaneta JNF." },
  // Protocolo e diretrizes
  { assunto: "Protocolo de atendimento", conteudo: "1) Identificar perfil (atende arquiteto/marcenaria/indústria; não atende cliente final/varejo). 2) Cadastro: nome, cidade, como nos encontrou. 3) Escopo: ambiente e tipo de porta, espessura, peso, altura, largura, material." },
  { assunto: "Diretrizes do agente", conteudo: "Responder com calma e precisão; zero alucinação (não inventar; perguntar ou escalar ao Fabio); todo dado novo do Fabio deve ser registrado." },
];

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

// Semeia o conhecimento base no banco (só na 1ª vez). Idempotente.
async function semear() {
  try {
    const { data } = await supabase().from("fatos").select("id").eq("tipo", "base").limit(1);
    if (data && data.length) return { semeado: false };
    const linhas = BASE_FATOS.map((f) => ({ data: "", assunto: f.assunto, conteudo: f.conteudo, tipo: "base" }));
    await supabase().from("fatos").insert(linhas);
    return { semeado: true, qtd: linhas.length };
  } catch (e) {
    return { semeado: false, erro: String(e) };
  }
}

function renderFatos(fatos) {
  return fatos
    .map((f) => {
      if (f.tipo === "base") return `- **${f.assunto || "geral"}**: ${f.conteudo || ""}`;
      const tag = f.tipo === "correcao" ? " [CORRIGIDO]" : "";
      return `- [${f.data || ""}] (Fabio)${tag} **${f.assunto || "geral"}**: ${f.conteudo || ""}`;
    })
    .join("\n");
}

async function construirBiblioteca() {
  const fatos = await listarFatos();
  return `${INTRO}\n\n${renderFatos(fatos)}\n`;
}

// Extrai um código de produto do texto (ex.: IN.05.212, IN.20.AWC, ZZTEST.900).
function extrairCodigo(texto) {
  const m = (texto || "").match(/\b[A-Z][A-Z0-9]*\.[A-Z0-9.]+\b/);
  return m ? m[0] : null;
}

// Acha o fato existente correspondente (para correções), de forma SEGURA:
// prioriza o código do produto; sem código, só casa se o assunto for específico.
async function acharSemelhante(assunto, conteudo) {
  const codigo = extrairCodigo(conteudo) || extrairCodigo(assunto);
  try {
    const { data } = await supabase().from("fatos").select("id,assunto,conteudo,tipo");
    const linhas = data || [];
    if (codigo) {
      const alvo = codigo.toUpperCase();
      for (const row of linhas) {
        if (`${row.assunto || ""} ${row.conteudo || ""}`.toUpperCase().includes(alvo)) return row;
      }
      return null; // tem código mas não achou → não arrisca sobrescrever outro
    }
    // sem código: só casa se o assunto for específico o bastante (evita pegar o registro errado)
    if (assunto && assunto.trim().length >= 6) {
      const alvo = assunto.toLowerCase();
      for (const row of linhas) {
        if (`${row.assunto || ""} ${row.conteudo || ""}`.toLowerCase().includes(alvo)) return row;
      }
    }
  } catch (e) {}
  return null;
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
- No campo "assunto", use SEMPRE o código do produto (ex.: IN.05.212, IN.20.925) quando ele
  existir na fala. Só use um tema genérico se realmente não houver código.

Responda SOMENTE em JSON:
{"fatos":[{"assunto":"código do produto ou tema","conteudo":"o fato em uma frase","tipo":"novo"}]}
Sem nada a extrair: {"fatos":[]}`;

const PROMPT_DOCUMENTO = `Você organiza conhecimento técnico de um DOCUMENTO (catálogo/ficha
técnica) da FVR sobre ferragens, para um agente de vendas.

AGRUPE POR PRODUTO: para cada produto identificado (geralmente por um código IN.xx), gere UM ÚNICO
fato consolidando as informações ÚTEIS de venda numa frase clara: o que é, material/acabamento,
medidas e capacidades relevantes, e uso/aplicação.

IGNORE por completo (não vire fato): códigos de barras/EAN, dimensões e peso de EMBALAGEM,
quantidade por caixa/unidade, número de versão e data do documento, índices, páginas e marketing
vazio.

Use SOMENTE o que está no texto; não invente. No campo "assunto" use o código do produto (IN.xx).

Responda SOMENTE em JSON:
{"fatos":[{"assunto":"IN.xx (nome se houver)","conteudo":"descrição consolidada e útil do produto"}]}
Se não houver produtos claros: {"fatos":[]}`;

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

async function extrairDocumento(texto /* , origem (não usado: mantém limpo) */) {
  if (!texto || !texto.trim()) return [];
  const pedacos = [];
  for (let i = 0; i < texto.length; i += 16000) pedacos.push(texto.slice(i, i + 16000));
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
        const conteudo = String(f.conteudo || "").trim();
        if (!conteudo) continue;
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
      const alvo = await acharSemelhante(assunto, conteudo);
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
  INTRO,
  BASE_FATOS,
  json,
  autorizado,
  semear,
  listarFatos,
  renderFatos,
  construirBiblioteca,
  acharSemelhante,
  responder,
  extrair,
  resumir,
  extrairDocumento,
  salvarFatos,
  carregarConversa,
  salvarConversa,
  limparConversa,
};

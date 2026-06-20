// app.js — Frontend do J.A.R.V.I.S. (chama as Netlify Functions)

const API = "/api";
const TOKEN_KEY = "jarvis_token";

// Avatares (ícones SVG)
const SVG_JARVIS =
  "<svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#4fd2ff' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>" +
  "<rect x='4' y='8' width='16' height='11' rx='2.5'/><circle cx='9' cy='13.5' r='1.3' fill='#4fd2ff' stroke='none'/>" +
  "<circle cx='15' cy='13.5' r='1.3' fill='#4fd2ff' stroke='none'/><path d='M12 4.6v3.4'/><circle cx='12' cy='3.6' r='1.1'/>" +
  "<path d='M4 12.5H2.4M20 12.5h1.6'/></svg>";
const SVG_FABIO =
  "<svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ffd24a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>" +
  "<circle cx='12' cy='8' r='3.6'/><path d='M5.5 20c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6'/></svg>";

// Estado em memória
let estado = { historico: [], resumo: "", n_resumidas: 0, fatos: [], base: "" };

// ---------- Helpers ----------
function token() { return localStorage.getItem(TOKEN_KEY); }
function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function formatar(texto) {
  // escapa HTML, depois aplica **negrito** e quebras de linha
  return escapeHtml(texto).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
}

async function api(rota, metodo, corpo) {
  const resp = await fetch(API + rota, {
    method: metodo || "GET",
    headers: { "Content-Type": "application/json", "x-app-token": token() || "" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resp.status === 401) { sair(); throw new Error("Sessão expirada"); }
  return resp.json();
}

// ---------- Login ----------
$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("login-erro");
  erro.classList.add("hidden");
  try {
    const resp = await fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: $("in-usuario").value, senha: $("in-senha").value }),
    });
    const dados = await resp.json();
    if (dados.ok && dados.token) {
      localStorage.setItem(TOKEN_KEY, dados.token);
      entrarNoApp();
    } else {
      erro.textContent = dados.erro || "Acesso negado.";
      erro.classList.remove("hidden");
    }
  } catch (e) {
    erro.textContent = "Erro ao conectar. Tente novamente.";
    erro.classList.remove("hidden");
  }
});

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  $("tela-app").classList.add("hidden");
  $("tela-login").classList.remove("hidden");
}

// ---------- Entrar e carregar estado ----------
async function entrarNoApp() {
  $("tela-login").classList.add("hidden");
  $("tela-app").classList.remove("hidden");
  try {
    const dados = await api("/estado", "GET");
    estado.fatos = dados.fatos || [];
    if (dados.conversa && dados.conversa.historico && dados.conversa.historico.length) {
      estado.historico = dados.conversa.historico;
      estado.resumo = dados.conversa.resumo || "";
      estado.n_resumidas = dados.conversa.n_resumidas || 0;
    } else {
      estado.historico = [{
        role: "assistant",
        content:
          "Olá, senhor. J.A.R.V.I.S. à disposição. Pode me ensinar qualquer detalhe de um " +
          "produto, enviar um PDF, ou me pedir para revisar o que ainda falta. Por onde deseja começar?",
      }];
    }
    renderChat();
    renderCerebro();
  } catch (e) { /* sair já tratado */ }
}

// ---------- Render do chat ----------
function renderChat() {
  const chat = $("chat");
  chat.innerHTML = "";
  for (const m of estado.historico) chat.appendChild(criarMsg(m));
  chat.scrollTop = chat.scrollHeight;
}

function criarMsg(m) {
  const div = document.createElement("div");
  const ehJarvis = m.role === "assistant";
  div.className = "msg " + (ehJarvis ? "jarvis" : "user");
  const anotei = ehJarvis && m.content.startsWith("__ANOTEI__");
  const nome = ehJarvis ? "J.A.R.V.I.S." : "VOCÊ (FABIO)";
  let bolhaHtml;
  let classeBolha = "bolha";
  if (anotei) {
    classeBolha += " anotei";
    bolhaHtml =
      "<span class='micon'>push_pin</span> <b>Anotei na biblioteca:</b><br>" +
      formatar(m.content.replace("__ANOTEI__\n", ""));
  } else {
    bolhaHtml = formatar(m.content);
  }
  div.innerHTML =
    `<div class='av'>${ehJarvis ? SVG_JARVIS : SVG_FABIO}</div>` +
    `<div class='corpo'><div class='nome'>${nome}</div><div class='${classeBolha}'>${bolhaHtml}</div></div>`;
  return div;
}

// ---------- Render do cérebro (tudo vem do banco) ----------
function linhaFato(f) {
  const tag = f.tipo === "correcao" ? " <span style='color:#ffb86b'>[corrigido]</span>" : "";
  return `<div class='fato-linha'><span class='cod'>${escapeHtml(f.assunto || "")}</span>${tag}: ${escapeHtml(f.conteudo || "")}</div>`;
}
function renderCerebro() {
  const c = $("cerebro");
  const aprendidos = estado.fatos.filter((f) => f.tipo !== "base");
  const base = estado.fatos.filter((f) => f.tipo === "base");
  let html = "";

  if (aprendidos.length) {
    html += `<div style='font-family:Orbitron;color:#ffd24a;margin-bottom:8px'><span class='micon' style='color:#4fd2ff'>fiber_new</span> Aprendido com o Fabio (${aprendidos.length})</div>`;
    html += "<div class='lista-aprendidos'>" + aprendidos.map(linhaFato).join("") + "</div>";
    html += "<hr style='border-color:rgba(255,255,255,0.08);margin:12px 0'>";
  } else {
    html += "<div class='cerebro-novo'><span class='micon'>fiber_new</span> O que o senhor ensinar aparecerá aqui no topo.</div>";
  }

  html += "<div style='font-family:Orbitron;color:#ffd24a;margin:6px 0 8px'><span class='micon' style='color:#4fd2ff'>menu_book</span> Biblioteca base</div>";
  base.forEach((f) => (html += linhaFato(f)));
  c.innerHTML = html;
}

// ---------- Card de confirmação de alteração ----------
function mostrarCardConfirmacao(p) {
  const chat = $("chat");
  const div = document.createElement("div");
  div.className = "msg jarvis";
  const atualTxt = p.atual
    ? `<div style='color:#9fb6c9;margin:4px 0'>Atual: ${escapeHtml(p.atual)}</div>`
    : "<div style='color:#9fb6c9;margin:4px 0'>(não encontrei um registro igual; será adicionado como correção)</div>";
  div.innerHTML =
    `<div class='av'>${SVG_JARVIS}</div><div class='corpo'><div class='nome'>J.A.R.V.I.S.</div>` +
    "<div class='bolha anotei'>" +
    "<b><span class='micon'>edit</span> Confirmar alteração, senhor?</b><br>" +
    `<div style='margin:4px 0'><b>${escapeHtml(p.assunto)}</b></div>` +
    atualTxt +
    `<div style='color:#cfeeff;margin:4px 0'>Novo: ${escapeHtml(p.conteudo)}</div>` +
    "<div style='display:flex;gap:8px;margin-top:8px'>" +
    "<button class='btn' data-acao='sim'><span class='micon'>check</span> Confirmar</button>" +
    "<button class='btn azul' data-acao='nao'><span class='micon'>close</span> Cancelar</button>" +
    "</div></div></div>";
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  div.querySelector("[data-acao=sim]").addEventListener("click", async () => {
    div.querySelector(".bolha").innerHTML =
      "<div class='thinking'><div class='reactor-mini'></div> Alterando...</div>";
    try {
      const dados = await api("/salvar", "POST", {
        fatos: [{ assunto: p.assunto, conteudo: p.conteudo, tipo: "correcao" }],
      });
      estado.fatos = dados.fatos || estado.fatos;
      div.querySelector(".bolha").innerHTML =
        "<span class='micon'>check_circle</span> <b>Alterado:</b> " + escapeHtml(p.conteudo);
      renderCerebro();
    } catch (e) {
      div.querySelector(".bolha").innerHTML = "Não consegui alterar agora, senhor.";
    }
  });
  div.querySelector("[data-acao=nao]").addEventListener("click", () => {
    div.querySelector(".bolha").innerHTML = "<span class='micon'>close</span> Alteração cancelada.";
  });
}

// ---------- Enviar mensagem ----------
async function enviar() {
  const input = $("in-msg");
  const texto = input.value.trim();
  if (!texto) return;
  input.value = "";

  estado.historico.push({ role: "user", content: texto });
  renderChat();

  // indicador "processando"
  const chat = $("chat");
  const pensando = document.createElement("div");
  pensando.className = "msg jarvis";
  pensando.innerHTML =
    `<div class='av'>${SVG_JARVIS}</div><div class='corpo'><div class='nome'>J.A.R.V.I.S.</div>` +
    `<div class='bolha'><div class='thinking'>` +
    `<div class='reactor-mini'></div> processando<span class='dots'><span>.</span><span>.</span><span>.</span></span></div></div></div>`;
  chat.appendChild(pensando);
  chat.scrollTop = chat.scrollHeight;

  let pendentes = [];
  try {
    const dados = await api("/turno", "POST", {
      historico: estado.historico,
      resumo: estado.resumo,
      n_resumidas: estado.n_resumidas,
    });
    estado.resumo = dados.resumo || estado.resumo;
    estado.n_resumidas = dados.n_resumidas || estado.n_resumidas;
    estado.fatos = dados.fatos || estado.fatos;
    pendentes = dados.pendentes || [];
    if (dados.anotacoes && dados.anotacoes.length) {
      estado.historico.push({
        role: "assistant",
        content: "__ANOTEI__\n" + dados.anotacoes.map((a) => "- " + a).join("\n"),
      });
    }
    estado.historico.push({ role: "assistant", content: dados.resposta });
  } catch (e) {
    estado.historico.push({ role: "assistant", content: "Tive um problema ao processar, senhor. Tente novamente." });
  }
  renderChat();
  renderCerebro();
  // Correções detectadas só são aplicadas após o Fabio confirmar
  pendentes.forEach((p) => mostrarCardConfirmacao(p));
}
async function aoEnviar() {
  if (arquivoPdf) await analisarPdf();
  if ($("in-msg").value.trim()) await enviar();
}
$("btn-enviar").addEventListener("click", aoEnviar);
$("in-msg").addEventListener("keydown", (e) => { if (e.key === "Enter") aoEnviar(); });

// ---------- Anexar PDF (dentro do chat) ----------
let arquivoPdf = null;

$("btn-anexar").addEventListener("click", () => $("pdf-file").click());

$("pdf-file").addEventListener("change", () => {
  arquivoPdf = $("pdf-file").files[0] || null;
  if (arquivoPdf) {
    $("anexo-nome").textContent = arquivoPdf.name;
    $("anexo-chip").classList.remove("hidden");
  }
});

$("btn-remover-anexo").addEventListener("click", () => {
  arquivoPdf = null;
  $("pdf-file").value = "";
  $("anexo-chip").classList.add("hidden");
});

async function analisarPdf() {
  const file = arquivoPdf;
  // limpa o anexo da barra
  arquivoPdf = null;
  $("pdf-file").value = "";
  $("anexo-chip").classList.add("hidden");

  const chat = $("chat");
  // mostra "anexo enviado" como mensagem do Fabio
  const msgUser = document.createElement("div");
  msgUser.className = "msg user";
  msgUser.innerHTML =
    `<div class='av'>${SVG_FABIO}</div><div class='corpo'><div class='nome'>VOCÊ (FABIO)</div>` +
    `<div class='bolha'><span class='micon'>picture_as_pdf</span> ${escapeHtml(file.name)}</div></div>`;
  chat.appendChild(msgUser);

  const pensando = document.createElement("div");
  pensando.className = "msg jarvis";
  pensando.innerHTML =
    `<div class='av'>${SVG_JARVIS}</div><div class='corpo'><div class='nome'>J.A.R.V.I.S.</div>` +
    "<div class='bolha'><div class='thinking'><div class='reactor-mini'></div> Lendo o documento<span class='dots'><span>.</span><span>.</span><span>.</span></span></div></div></div>";
  chat.appendChild(pensando);
  chat.scrollTop = chat.scrollHeight;

  const base64 = await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.readAsDataURL(file);
  });

  let dados;
  try {
    dados = await api("/pdf", "POST", { arquivo_base64: base64, nome: file.name });
  } catch (e) {
    dados = { erro: "Falha ao ler o PDF." };
  }
  pensando.remove();

  if (dados.aviso || dados.erro) {
    adicionarMsgJarvis(dados.aviso || dados.erro);
    return;
  }
  const fatos = dados.fatos || [];
  if (!fatos.length) {
    adicionarMsgJarvis("Não encontrei produtos/fatos técnicos neste PDF, senhor.");
    return;
  }
  mostrarCardPdf(file.name, fatos);
}

function adicionarMsgJarvis(texto) {
  estado.historico.push({ role: "assistant", content: texto });
  renderChat();
}

function mostrarCardPdf(nome, fatos) {
  const chat = $("chat");
  const div = document.createElement("div");
  div.className = "msg jarvis";
  let itens = "";
  fatos.forEach((f, i) => {
    itens +=
      `<label class='pdf-fato'><input type='checkbox' checked data-i='${i}' /> ` +
      `<span><b>${escapeHtml(f.assunto)}</b> — ${escapeHtml(f.conteudo)}</span></label>`;
  });
  div.innerHTML =
    `<div class='av'>${SVG_JARVIS}</div><div class='corpo'><div class='nome'>J.A.R.V.I.S.</div>` +
    "<div class='bolha anotei'>" +
    `<b><span class='micon'>fact_check</span> Encontrei ${fatos.length} item(ns) em ${escapeHtml(nome)}. Marque o que salvar:</b>` +
    `<div style='margin:8px 0'>${itens}</div>` +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn' data-acao='salvar'><span class='micon'>save</span> Salvar selecionados</button>" +
    "<button class='btn azul' data-acao='descartar'><span class='micon'>close</span> Descartar</button>" +
    "</div></div></div>";
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  div.querySelector("[data-acao=salvar]").addEventListener("click", async () => {
    const marcados = [...div.querySelectorAll("input[type=checkbox]:checked")].map((cb) => fatos[Number(cb.dataset.i)]);
    div.querySelector(".bolha").innerHTML =
      "<div class='thinking'><div class='reactor-mini'></div> Salvando...</div>";
    try {
      const dados = await api("/salvar", "POST", { fatos: marcados });
      estado.fatos = dados.fatos || estado.fatos;
      div.querySelector(".bolha").innerHTML =
        `<span class='micon'>check_circle</span> <b>${dados.salvos} item(ns) salvos no cérebro.</b>`;
      renderCerebro();
    } catch (e) {
      div.querySelector(".bolha").innerHTML = "Não consegui salvar agora, senhor.";
    }
  });
  div.querySelector("[data-acao=descartar]").addEventListener("click", () => {
    div.querySelector(".bolha").innerHTML = "<span class='micon'>close</span> Descartado.";
  });
}

// ---------- Botões ----------
$("btn-nova").addEventListener("click", async () => {
  if (!confirm("Começar uma nova conversa? (os fatos aprendidos continuam salvos)")) return;
  await api("/nova", "POST", {});
  estado.historico = [];
  estado.resumo = "";
  estado.n_resumidas = 0;
  await entrarNoApp();
});

$("btn-sair").addEventListener("click", sair);

$("btn-baixar").addEventListener("click", () => {
  let txt = "# Biblioteca Técnica FVR — Mestre Fabio Vidal\n\n";
  for (const f of estado.fatos) {
    if (f.tipo === "base") {
      txt += `- **${f.assunto || ""}**: ${f.conteudo || ""}\n`;
    } else {
      const tag = f.tipo === "correcao" ? " [corrigido]" : "";
      txt += `- [${f.data || ""}] (Fabio)${tag} **${f.assunto || ""}**: ${f.conteudo || ""}\n`;
    }
  }
  const blob = new Blob([txt], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "biblioteca_fvr.md";
  a.click();
});

// ---------- Início ----------
if (token()) entrarNoApp();

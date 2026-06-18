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
    estado.base = dados.base || "";
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
    `<div class='${classeBolha}'>${bolhaHtml}</div>`;
  return div;
}

// ---------- Render do cérebro ----------
function renderCerebro() {
  const c = $("cerebro");
  let html = "";
  if (estado.fatos.length) {
    html += "<div style='font-family:Orbitron;color:#ffd24a;margin-bottom:8px'><span class='micon' style='color:#4fd2ff'>fiber_new</span> Anotações novas</div>";
    for (const f of estado.fatos) {
      const tag = f.tipo === "correcao" ? " [corrigido]" : "";
      html += `<div class='fato-linha'><span class='cod'>${escapeHtml(f.assunto || "")}${tag}</span>: ${escapeHtml(f.conteudo || "")}</div>`;
    }
  } else {
    html += "<div class='cerebro-novo'><span class='micon'>fiber_new</span> <b>Anotações novas</b> aparecerão aqui assim que o senhor me ensinar algo.</div>";
  }
  html += "<hr style='border-color:rgba(255,255,255,0.08);margin:12px 0'>";
  html += "<div class='base-texto'>" + escapeHtml(estado.base) + "</div>";
  c.innerHTML = html;
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
    `<div class='av'>${SVG_JARVIS}</div><div class='bolha'><div class='thinking'>` +
    `<div class='reactor-mini'></div> J.A.R.V.I.S. processando<span class='dots'><span>.</span><span>.</span><span>.</span></span></div></div>`;
  chat.appendChild(pensando);
  chat.scrollTop = chat.scrollHeight;

  try {
    const dados = await api("/turno", "POST", {
      historico: estado.historico,
      resumo: estado.resumo,
      n_resumidas: estado.n_resumidas,
    });
    estado.resumo = dados.resumo || estado.resumo;
    estado.n_resumidas = dados.n_resumidas || estado.n_resumidas;
    estado.fatos = dados.fatos || estado.fatos;
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
}
$("btn-enviar").addEventListener("click", enviar);
$("in-msg").addEventListener("keydown", (e) => { if (e.key === "Enter") enviar(); });

// ---------- PDF ----------
let pdfFatos = [];
$("btn-analisar").addEventListener("click", async () => {
  const file = $("pdf-file").files[0];
  const status = $("pdf-status");
  const lista = $("pdf-lista");
  lista.innerHTML = "";
  if (!file) { status.textContent = "Selecione um PDF primeiro."; return; }
  status.innerHTML = "<div class='thinking'><div class='reactor-mini'></div> Lendo o documento...</div>";

  const base64 = await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.readAsDataURL(file);
  });

  try {
    const dados = await api("/pdf", "POST", { arquivo_base64: base64, nome: file.name });
    if (dados.aviso) { status.textContent = dados.aviso; return; }
    pdfFatos = dados.fatos || [];
    if (!pdfFatos.length) { status.textContent = "Não encontrei fatos técnicos neste PDF."; return; }
    status.textContent = `Encontrei ${pdfFatos.length} fatos. Marque os que deseja salvar:`;
    pdfFatos.forEach((f, i) => {
      const row = document.createElement("label");
      row.className = "pdf-fato";
      row.innerHTML =
        `<input type='checkbox' checked data-i='${i}' /> <span><b>${escapeHtml(f.assunto)}</b> — ${escapeHtml(f.conteudo)}</span>`;
      lista.appendChild(row);
    });
    const acoes = document.createElement("div");
    acoes.style.marginTop = "10px";
    acoes.innerHTML =
      "<button class='btn primario' id='btn-salvar-pdf'><span class='micon'>save</span> Salvar selecionados no cérebro</button>";
    lista.appendChild(acoes);
    $("btn-salvar-pdf").addEventListener("click", salvarPdf);
  } catch (e) {
    status.textContent = "Erro ao ler o PDF.";
  }
});

async function salvarPdf() {
  const marcados = [...document.querySelectorAll("#pdf-lista input[type=checkbox]:checked")]
    .map((cb) => pdfFatos[Number(cb.dataset.i)]);
  $("pdf-status").innerHTML = "<div class='thinking'><div class='reactor-mini'></div> Salvando...</div>";
  try {
    const dados = await api("/salvar", "POST", { fatos: marcados });
    estado.fatos = dados.fatos || estado.fatos;
    $("pdf-status").textContent = `${dados.salvos} fatos salvos no cérebro!`;
    $("pdf-lista").innerHTML = "";
    renderCerebro();
  } catch (e) {
    $("pdf-status").textContent = "Erro ao salvar.";
  }
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
  let txt = estado.base + "\n\n## Anotações novas\n\n";
  for (const f of estado.fatos) {
    const tag = f.tipo === "correcao" ? " [corrigido]" : "";
    txt += `- [${f.data || ""}] (Fabio)${tag} **${f.assunto || ""}**: ${f.conteudo || ""}\n`;
  }
  const blob = new Blob([txt], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "biblioteca_fvr.md";
  a.click();
});

// ---------- Início ----------
if (token()) entrarNoApp();

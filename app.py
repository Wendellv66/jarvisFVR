"""
app.py — J.A.R.V.I.S., o Agente Entrevistador da FVR (Streamlit).

Tema "Homem de Ferro": preto + vermelho + dourado, com o brilho azul do reator arc.
- Tela de LOGIN temática antes de entrar.
- No PC (web): conversa e cérebro lado a lado.
- No celular: as colunas empilham automaticamente (responsivo).

Rodar com:  streamlit run app.py
"""

import base64
import os
from pathlib import Path

import streamlit as st

import agente

PASTA = Path(__file__).resolve().parent
ARQ_FAVICON = PASTA / "favicon.png"
ARQ_APPLE = PASTA / "apple icon.png"


def _svg_uri(svg: str) -> str:
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


# Ícone da aba do navegador (favicon)
_page_icon = ":material/smart_toy:"
if ARQ_FAVICON.exists():
    from PIL import Image
    _page_icon = Image.open(ARQ_FAVICON)

st.set_page_config(page_title="J.A.R.V.I.S. — FVR", page_icon=_page_icon, layout="wide")

# apple-touch-icon (ícone ao salvar na tela inicial / compartilhar) — injeta no <head>
if ARQ_APPLE.exists():
    import streamlit.components.v1 as components

    _apple_uri = "data:image/png;base64," + base64.b64encode(ARQ_APPLE.read_bytes()).decode()
    components.html(
        f"""
        <script>
        const head = window.parent.document.head;
        const add = (rel, href, sizes) => {{
            let l = window.parent.document.createElement('link');
            l.rel = rel; l.href = href; if (sizes) l.sizes = sizes;
            head.appendChild(l);
        }};
        add('apple-touch-icon', '{_apple_uri}');
        let og = window.parent.document.createElement('meta');
        og.setAttribute('property', 'og:image'); og.content = '{_apple_uri}';
        head.appendChild(og);
        </script>
        """,
        height=0,
    )

# Permite usar as chaves tanto via .env (local) quanto via Secrets do Streamlit Cloud
try:
    for _k, _v in st.secrets.items():
        os.environ.setdefault(_k, str(_v))
except Exception:  # noqa: BLE001
    pass

MARCADOR = agente.MARCADOR_ANOTACOES
AVATAR_JARVIS = _svg_uri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='42' height='42' viewBox='0 0 24 24' "
    "fill='none' stroke='#4fd2ff' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>"
    "<rect x='4' y='8' width='16' height='11' rx='2.5'/>"
    "<circle cx='9' cy='13.5' r='1.3' fill='#4fd2ff' stroke='none'/>"
    "<circle cx='15' cy='13.5' r='1.3' fill='#4fd2ff' stroke='none'/>"
    "<path d='M12 4.6v3.4'/><circle cx='12' cy='3.6' r='1.1'/>"
    "<path d='M4 12.5H2.4M20 12.5h1.6'/></svg>"
)
AVATAR_FABIO = _svg_uri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='42' height='42' viewBox='0 0 24 24' "
    "fill='none' stroke='#ffd24a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>"
    "<circle cx='12' cy='8' r='3.6'/>"
    "<path d='M5.5 20c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6'/></svg>"
)

USUARIO_OK = os.getenv("APP_USUARIO", "fabio")
SENHA_OK = os.getenv("APP_SENHA", "jarvis")

THINKING_HTML = """
<div class="jarvis-thinking">
  <div class="reactor-mini"></div>
  <span>J.A.R.V.I.S. processando<span class="dots"><i>.</i><i>.</i><i>.</i></span></span>
</div>
"""

# ============================================================================= #
# TEMA HOMEM DE FERRO + RESPONSIVO (CSS)                                         #
# ============================================================================= #
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0');
    .micon { font-family:'Material Symbols Rounded'; font-weight:normal; font-style:normal;
        vertical-align:middle; line-height:1; font-size:1.15em; -webkit-font-feature-settings:'liga';
        -webkit-font-smoothing:antialiased; }

    .stApp {
        background:
            linear-gradient(rgba(79,210,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,210,255,0.06) 1px, transparent 1px),
            radial-gradient(1100px 600px at 50% -10%, rgba(79,210,255,0.13), transparent 60%),
            radial-gradient(900px 500px at 95% 110%, rgba(230,36,41,0.13), transparent 60%),
            linear-gradient(125deg, #0a0a0f 0%, #0c1018 32%, #140a0d 62%, #0a0a0f 100%);
        background-size: 44px 44px, 44px 44px, 100% 100%, 100% 100%, 300% 300%;
        background-attachment: fixed;
        color: #eaeaf0; font-family: 'Rajdhani', sans-serif;
        animation: bgmove 16s linear infinite alternate;
    }
    @keyframes bgmove {
        0%   { background-position: 0 0,    0 0,    50% 0%, 50% 100%, 0% 50%; }
        100% { background-position: 0 44px, 44px 0, 50% 0%, 50% 100%, 100% 50%; }
    }
    /* brilho "scanner" horizontal que cruza a tela de tempos em tempos */
    .stApp::before {
        content:''; position:fixed; left:0; right:0; top:0; height:140px; z-index:0;
        pointer-events:none; opacity:0.5;
        background: linear-gradient(180deg, rgba(79,210,255,0.10), transparent);
        animation: sweep 9s ease-in-out infinite;
    }
    @keyframes sweep { 0%{ transform: translateY(-160px); } 50%{ transform: translateY(105vh); } 100%{ transform: translateY(-160px); } }
    .block-container, section[data-testid="stSidebar"] { position: relative; z-index: 1; }
    .block-container { padding-top: 2.6rem !important; padding-bottom: 7rem !important; max-width: 1180px; }
    header[data-testid="stHeader"] { background: transparent; }

    h1, h2, h3 { font-family: 'Orbitron', sans-serif !important; letter-spacing: 1px; }
    h2, h3 { color: #ffd24a !important; }
    /* subtítulos com linha de brilho embaixo */
    .stApp h3 { padding-bottom: 8px; margin-bottom: 6px;
        border-bottom: 1px solid rgba(255,210,74,0.0);
        background: linear-gradient(90deg, rgba(255,210,74,0.5), rgba(79,210,255,0.4) 40%, transparent 75%) left bottom / 100% 2px no-repeat; }
    .stApp h3 span[data-testid="stIconMaterial"], .stApp h3 .micon { color:#4fd2ff !important; }
    /* caixas de info/sucesso/erro mais elegantes */
    div[data-testid="stAlert"] { border-radius: 12px; border:1px solid rgba(79,210,255,0.2);
        background: rgba(20,24,34,0.6); backdrop-filter: blur(3px); }

    /* ---------- Reator arc (animado) ---------- */
    .arc-reactor {
        width: 60px; height: 60px; border-radius: 50%;
        background: radial-gradient(circle at 50% 50%, #eafcff 0%, #6fe3ff 22%, #18a8e0 45%, #0b3550 75%, #061a28 100%);
        box-shadow: 0 0 18px #4fd2ff, 0 0 38px rgba(79,210,255,0.6), inset 0 0 12px rgba(255,255,255,0.7);
        border: 3px solid #1b6e93; animation: pulse 2.6s ease-in-out infinite; flex: 0 0 auto; position: relative;
    }
    .arc-reactor::before { content:''; position:absolute; inset:8px; border-radius:50%;
        border:2px solid rgba(255,255,255,0.35); border-top-color: rgba(255,255,255,0.9);
        animation: spin 3.5s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse {
        0%,100% { box-shadow: 0 0 16px #4fd2ff, 0 0 30px rgba(79,210,255,0.5), inset 0 0 10px rgba(255,255,255,0.6); }
        50%     { box-shadow: 0 0 26px #4fd2ff, 0 0 60px rgba(79,210,255,0.85), inset 0 0 16px rgba(255,255,255,0.9); }
    }

    .jarvis-header { display:flex; align-items:center; gap:16px; margin: 10px 0 12px 0; }
    .jarvis-title { font-family:'Orbitron'; font-weight:900; font-size:2.2rem; line-height:1.2;
        padding-top:4px; overflow:visible;
        background: linear-gradient(90deg, #ffd24a, #e62429 70%);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .jarvis-sub { font-family:'Rajdhani'; color:#9fb6c9; font-weight:600; letter-spacing:2.5px; font-size:0.78rem; }

    /* ---------- Painéis ---------- */
    div[data-testid="stVerticalBlockBorderWrapper"] {
        background: linear-gradient(180deg, rgba(21,21,31,0.92), rgba(10,10,15,0.92));
        border: 1px solid rgba(255,210,74,0.22) !important; border-radius: 14px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.45), inset 0 0 24px rgba(79,210,255,0.04);
    }

    /* ---------- Balões de chat ---------- */
    div[data-testid="stChatMessage"] {
        background: rgba(20,24,34,0.7); border: 1px solid rgba(79,210,255,0.12);
        border-radius: 14px; animation: fadeUp .35s ease both; margin-bottom: 6px;
    }
    @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }

    /* ---------- Caixa de digitação ---------- */
    div[data-testid="stChatInput"] {
        border: 1.5px solid rgba(79,210,255,0.45) !important; border-radius: 16px !important;
        background: #11151d !important;
        box-shadow: 0 0 18px rgba(79,210,255,0.25), inset 0 0 12px rgba(79,210,255,0.06);
    }
    div[data-testid="stChatInput"] textarea { font-family:'Rajdhani'; font-size:1.08rem; }
    div[data-testid="stChatInput"]:focus-within {
        border-color: #ffd24a !important;
        box-shadow: 0 0 22px rgba(255,210,74,0.45), inset 0 0 14px rgba(255,210,74,0.08); }

    /* ---------- Animação "processando" ---------- */
    .jarvis-thinking { display:flex; align-items:center; gap:10px; font-family:'Rajdhani';
        font-size:1.05rem; color:#7fe3ff; font-weight:600; }
    .reactor-mini { width:20px; height:20px; border-radius:50%;
        background: radial-gradient(circle, #eafcff 0%, #6fe3ff 35%, #18a8e0 60%, #0b3550 100%);
        box-shadow:0 0 10px #4fd2ff; animation: pulse 1.1s ease-in-out infinite; }
    .dots i { animation: blink 1.4s infinite both; font-style:normal; }
    .dots i:nth-child(2){ animation-delay:.2s; } .dots i:nth-child(3){ animation-delay:.4s; }
    @keyframes blink { 0%,80%,100%{ opacity:0; } 40%{ opacity:1; } }

    /* ---------- Sidebar / botões ---------- */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0d0f16, #08090d);
        border-right: 1px solid rgba(230,36,41,0.25); }
    .stButton button, .stDownloadButton button, .stForm button {
        font-family:'Rajdhani'; font-weight:700; letter-spacing:0.5px;
        border:1px solid rgba(255,210,74,0.5); border-radius:10px;
        background: linear-gradient(180deg, #1c1f29, #12141b); color:#ffd24a; transition: all .15s ease; }
    .stButton button:hover, .stDownloadButton button:hover, .stForm button:hover {
        border-color:#e62429; color:#fff; box-shadow:0 0 16px rgba(230,36,41,0.5); }

    /* ====================== TELA DE LOGIN (HUD ANIMADO) ====================== */
    .hud-login {
        position:relative; text-align:center; padding: 30px 18px 24px; margin: 1vh auto 14px;
        border:1px solid rgba(79,210,255,0.28); border-radius:18px; overflow:hidden;
        background:
            radial-gradient(circle at 50% 0%, rgba(79,210,255,0.08), transparent 70%),
            linear-gradient(180deg, rgba(13,16,24,0.85), rgba(8,9,13,0.85));
        box-shadow: inset 0 0 50px rgba(79,210,255,0.06), 0 0 40px rgba(0,0,0,0.5);
    }
    /* grade de fundo em movimento */
    .hud-login::before {
        content:''; position:absolute; inset:-50%; z-index:0; opacity:0.20;
        background-image:
            linear-gradient(rgba(79,210,255,0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,210,255,0.25) 1px, transparent 1px);
        background-size: 34px 34px; animation: gridmove 8s linear infinite;
    }
    @keyframes gridmove { to { transform: translateY(34px); } }
    /* linha de varredura */
    .hud-login::after {
        content:''; position:absolute; left:0; right:0; top:0; height:2px; z-index:2;
        background: linear-gradient(90deg, transparent, #4fd2ff, transparent);
        box-shadow:0 0 12px #4fd2ff; animation: scan 3.6s linear infinite;
    }
    @keyframes scan { 0%{ top:0; opacity:0; } 8%{ opacity:1; } 92%{ opacity:1; } 100%{ top:100%; opacity:0; } }
    .hud-login > * { position:relative; z-index:3; }

    /* cantos HUD */
    .hud-corner { position:absolute; width:26px; height:26px; z-index:4; border:2px solid #ffd24a;
        animation: cornerPulse 2.2s ease-in-out infinite; }
    .hud-corner.tl { top:8px; left:8px; border-right:0; border-bottom:0; }
    .hud-corner.tr { top:8px; right:8px; border-left:0; border-bottom:0; }
    .hud-corner.bl { bottom:8px; left:8px; border-right:0; border-top:0; }
    .hud-corner.br { bottom:8px; right:8px; border-left:0; border-top:0; }
    @keyframes cornerPulse { 0%,100%{ opacity:0.5; } 50%{ opacity:1; box-shadow:0 0 10px #ffd24a; } }

    /* reator com anéis girando */
    .reactor-stack { position:relative; width:170px; height:170px; margin:4px auto 8px;
        display:flex; align-items:center; justify-content:center; }
    .reactor-stack .ring { position:absolute; border-radius:50%; }
    .ring1 { width:168px; height:168px; border:2px solid transparent;
        border-top-color:#4fd2ff; border-bottom-color:#4fd2ff; animation: spin 5s linear infinite; }
    .ring2 { width:130px; height:130px; border:2px dashed rgba(255,210,74,0.55);
        animation: spin 8s linear infinite reverse; }
    .ring3 { width:150px; height:150px; border:1px solid rgba(230,36,41,0.35);
        border-left-color:#e62429; border-right-color:#e62429; animation: spin 3.2s linear infinite; }
    .login-reactor { width:92px; height:92px; margin:0; }

    .login-title { font-family:'Orbitron'; font-weight:900; font-size:2.6rem; line-height:1.25; padding-top:6px;
        background: linear-gradient(90deg, #ffd24a, #e62429 70%);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        animation: titleGlow 2.6s ease-in-out infinite; }
    @keyframes titleGlow {
        0%,100% { filter: drop-shadow(0 0 5px rgba(230,36,41,0.45)); }
        50%     { filter: drop-shadow(0 0 16px rgba(79,210,255,0.75)); } }
    .login-badge { font-family:'Orbitron'; letter-spacing:4px; color:#e62429; font-size:0.85rem;
        margin-top:2px; text-shadow:0 0 14px rgba(230,36,41,0.5);
        animation: flicker 4s linear infinite; }
    @keyframes flicker { 0%,97%,100%{ opacity:1; } 98%{ opacity:0.35; } 99%{ opacity:0.8; } }
    .boot-line { font-family:'Orbitron'; color:#7fe3ff; letter-spacing:2px; font-size:0.74rem;
        overflow:hidden; white-space:nowrap; border-right:2px solid #4fd2ff; width:0;
        margin:12px auto 2px; animation: type 2.8s steps(28) 0.3s forwards, caret .75s step-end infinite; }
    @keyframes type { to { width: 25ch; } }
    @keyframes caret { 50%{ border-color: transparent; } }

    /* campos de login */
    div[data-testid="stForm"] {
        border:1px solid rgba(79,210,255,0.3) !important; border-radius:14px !important;
        background: rgba(12,16,24,0.55) !important;
        box-shadow: 0 0 30px rgba(79,210,255,0.10), inset 0 0 20px rgba(79,210,255,0.04) !important; }
    div[data-testid="stTextInput"] input {
        background:#0c1018 !important; color:#eafcff !important; font-family:'Rajdhani' !important;
        border:1px solid rgba(79,210,255,0.4) !important; border-radius:10px !important; }
    div[data-testid="stTextInput"] input:focus {
        border-color:#ffd24a !important; box-shadow:0 0 14px rgba(255,210,74,0.4) !important; }
    /* esconde o texto "Press Enter to submit form" que sobrepunha o ícone do olho */
    div[data-testid="InputInstructions"] { display: none !important; }

    /* ===================== MOBILE ===================== */
    @media (max-width: 680px) {
        .block-container { padding-left: 0.7rem !important; padding-right: 0.7rem !important; padding-bottom: 6.5rem !important; }
        .jarvis-title { font-size: 1.5rem; }
        .jarvis-sub { font-size: 0.62rem; letter-spacing: 1.5px; }
        .arc-reactor { width: 42px; height: 42px; border-width:2px; }
        .login-reactor { width:90px; height:90px; }
        .login-face { width:100px; height:100px; }
        .login-title { font-size: 2rem; }
        div[data-testid="stChatMessage"] p { font-size: 1.02rem; }
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# ============================================================================= #
# TELA DE LOGIN                                                                  #
# ============================================================================= #
def render_login():
    esq, meio, dir = st.columns([1, 1.4, 1])
    with meio:
        st.markdown(
            """
            <div class='hud-login'>
                <span class='hud-corner tl'></span><span class='hud-corner tr'></span>
                <span class='hud-corner bl'></span><span class='hud-corner br'></span>
                <div class='reactor-stack'>
                    <div class='ring ring1'></div>
                    <div class='ring ring2'></div>
                    <div class='ring ring3'></div>
                    <div class='arc-reactor login-reactor'></div>
                </div>
                <div class='login-title'>J.A.R.V.I.S.</div>
                <div class='login-badge'>◤ ACESSO RESTRITO ◢</div>
                <div class='boot-line'>INICIALIZANDO INTERFACE STARK...</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        with st.form("login_form"):
            usuario = st.text_input(":material/person: Identificação")
            senha = st.text_input(":material/key: Código de acesso", type="password")
            entrar = st.form_submit_button(":material/bolt: INICIAR SISTEMA", use_container_width=True)
        if entrar:
            if usuario.strip() == USUARIO_OK and senha == SENHA_OK:
                st.session_state.autenticado = True
                st.rerun()
            else:
                st.error("Acesso negado. Identificação ou código incorretos, senhor.",
                         icon=":material/block:")
    st.stop()


if not st.session_state.get("autenticado"):
    render_login()


# ============================================================================= #
# APP PRINCIPAL (após login)                                                     #
# ============================================================================= #
def partes_biblioteca():
    """Devolve (corpo_original, anotacoes_novas) separando pelo marcador."""
    texto = agente.ler_biblioteca()
    if MARCADOR in texto:
        corpo, _, resto = texto.partition(MARCADOR)
        linhas = [
            ln for ln in resto.splitlines()
            if ln.strip() and not ln.strip().startswith("<!--") and "-->" not in ln
        ]
        return corpo.strip(), "\n".join(linhas).strip()
    return texto.strip(), ""


# ----------------------------------------------------------------------------- #
# Barra lateral                                                                  #
# ----------------------------------------------------------------------------- #
with st.sidebar:
    st.markdown(
        "<div style='text-align:center'><div class='arc-reactor' style='margin:6px auto 12px'></div>"
        "<div class='jarvis-sub'>SISTEMA ONLINE</div></div>",
        unsafe_allow_html=True,
    )
    st.divider()
    st.success(f"Núcleo de IA ativo:\n\n**{agente.MODELO}**", icon=":material/smart_toy:")
    st.caption("(modelo do ChatGPT — definido em agente.py → MODELO)")
    st.divider()
    if st.button(":material/refresh: Atualizar painel", use_container_width=True):
        st.rerun()
    st.download_button(
        ":material/download: Baixar biblioteca (.md)",
        data=agente.ler_biblioteca(),
        file_name="biblioteca_fvr.md",
        mime="text/markdown",
        use_container_width=True,
    )
    if st.button(":material/restart_alt: Nova conversa", use_container_width=True):
        agente.limpar_conversa()
        for _k in ("historico", "resumo", "n_resumidas"):
            st.session_state.pop(_k, None)
        st.rerun()
    if st.button(":material/logout: Sair", use_container_width=True):
        st.session_state.autenticado = False
        st.rerun()

# ----------------------------------------------------------------------------- #
# Cabeçalho                                                                      #
# ----------------------------------------------------------------------------- #
st.markdown(
    """
    <div class="jarvis-header">
        <div class="arc-reactor"></div>
        <div>
            <div class="jarvis-title">J.A.R.V.I.S.</div>
            <div class="jarvis-sub">JUST A RATHER VERY INTELLIGENT SYSTEM &nbsp;•&nbsp; FVR COMERCIAL</div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)
st.caption(
    "Converse à esquerda, Mestre Fabio. À direita, o cérebro é preenchido em tempo real "
    "— assim o senhor confere se eu estou anotando corretamente. (No celular, as áreas "
    "aparecem uma embaixo da outra.)"
)

# ----------------------------------------------------------------------------- #
# Enviar PDF para o J.A.R.V.I.S. aprender (com confirmação antes de salvar)      #
# ----------------------------------------------------------------------------- #
with st.expander(":material/picture_as_pdf: Enviar um PDF para o J.A.R.V.I.S. aprender"):
    arquivo_pdf = st.file_uploader(
        "Selecione um PDF (catálogo, ficha técnica) — digital, com texto selecionável",
        type=["pdf"],
    )
    if arquivo_pdf is not None and st.button(":material/search: Analisar PDF"):
        with st.spinner("Lendo o documento..."):
            texto_pdf = agente.extrair_texto_pdf(arquivo_pdf.getvalue())
            if not texto_pdf.strip():
                st.warning(
                    "Não consegui ler texto deste PDF. Ele pode ser escaneado (imagem). "
                    "Para esses casos seria necessário adicionar leitura por OCR.",
                    icon=":material/warning:",
                )
                st.session_state.pop("pdf_pendentes", None)
            else:
                st.session_state.pdf_pendentes = agente.extrair_fatos_documento(
                    texto_pdf, origem=arquivo_pdf.name
                )
                st.session_state.pdf_nome = arquivo_pdf.name

    pendentes = st.session_state.get("pdf_pendentes")
    if pendentes:
        st.markdown(
            f"**Encontrei {len(pendentes)} fatos em _{st.session_state.get('pdf_nome', '')}_. "
            "Marque os que deseja salvar:**"
        )
        selecionados = []
        for i, f in enumerate(pendentes):
            if st.checkbox(f"**{f['assunto']}** — {f['conteudo']}", value=True, key=f"pdf_{i}"):
                selecionados.append(f)
        c1, c2 = st.columns(2)
        if c1.button(":material/save: Salvar selecionados no cérebro", type="primary",
                     use_container_width=True):
            agente.salvar_fatos(selecionados)
            st.session_state.pop("pdf_pendentes", None)
            st.success(f"{len(selecionados)} fatos salvos no cérebro!", icon=":material/check_circle:")
            st.rerun()
        if c2.button(":material/cancel: Descartar", use_container_width=True):
            st.session_state.pop("pdf_pendentes", None)
            st.rerun()
    elif pendentes == []:
        st.info("Não encontrei fatos técnicos para extrair deste PDF.")

# ----------------------------------------------------------------------------- #
# Estado da conversa                                                             #
# ----------------------------------------------------------------------------- #
JANELA_MANTER = 12     # nº de mensagens recentes mantidas na íntegra
LIMITE_RESUMIR = 20    # acima disso, resume as mais antigas

if "historico" not in st.session_state:
    salva = agente.carregar_conversa()
    if salva and salva.get("historico"):
        st.session_state.historico = salva["historico"]
        st.session_state.resumo = salva.get("resumo", "")
        st.session_state.n_resumidas = salva.get("n_resumidas", 0)
    else:
        saudacao = (
            "Olá, senhor. J.A.R.V.I.S. à disposição. Estou pronto para registrar tudo na "
            "Biblioteca Técnica da FVR. Pode me ensinar qualquer detalhe de um produto, ou "
            "me pedir para revisar o que ainda está faltando. Por onde deseja começar, "
            "Mestre Fabio?"
        )
        st.session_state.historico = [{"role": "assistant", "content": saudacao}]
        st.session_state.resumo = ""
        st.session_state.n_resumidas = 0

# ----------------------------------------------------------------------------- #
# Layout: lado a lado no PC; empilha no celular (colunas do Streamlit)           #
# ----------------------------------------------------------------------------- #
col_chat, col_cerebro = st.columns([1, 1], gap="large")

with col_chat:
    st.subheader(":material/forum: Conversa")
    caixa_chat = st.container(height=540)
    with caixa_chat:
        for msg in st.session_state.historico:
            avatar = AVATAR_JARVIS if msg["role"] == "assistant" else AVATAR_FABIO
            with st.chat_message(msg["role"], avatar=avatar):
                st.markdown(msg["content"])
    # Caixa de texto SOMENTE na área do chat (não atravessa a tela)
    entrada = st.chat_input("Escreva aqui o que quer ensinar ou perguntar, senhor...")

with col_cerebro:
    st.subheader(":material/neurology: Cérebro (Biblioteca Técnica)")
    corpo, novas = partes_biblioteca()
    if novas:
        st.markdown(
            "<b><span class='micon' style='color:#4fd2ff'>fiber_new</span> "
            "Anotações novas (capturadas nesta jornada)</b>",
            unsafe_allow_html=True,
        )
        st.info(novas)
    else:
        st.markdown(
            "<div style='border:1px dashed rgba(79,210,255,0.35); border-radius:12px; "
            "padding:10px 14px; color:#9fb6c9; background:rgba(79,210,255,0.05); margin-bottom:8px'>"
            "<span class='micon' style='color:#4fd2ff'>fiber_new</span> "
            "<b>Anotações novas</b> aparecerão aqui assim que o senhor me ensinar algo.</div>",
            unsafe_allow_html=True,
        )
    painel = st.container(height=430)
    with painel:
        st.markdown(corpo)

# ----------------------------------------------------------------------------- #
# Processamento da mensagem do Fabio                                            #
# ----------------------------------------------------------------------------- #
if entrada:
    st.session_state.historico.append({"role": "user", "content": entrada})

    with col_chat:
        with caixa_chat:
            with st.chat_message("user", avatar=AVATAR_FABIO):
                st.markdown(entrada)
            with st.chat_message("assistant", avatar=AVATAR_JARVIS):
                st.empty().markdown(THINKING_HTML, unsafe_allow_html=True)

    aviso_anotacao = None
    try:
        fatos = agente.extrair_fatos(entrada)
        linhas = agente.salvar_fatos(fatos)
        if linhas:
            aviso_anotacao = ":material/push_pin: **Anotei na biblioteca:**\n\n" + "\n".join(linhas)
    except Exception as e:  # noqa: BLE001
        aviso_anotacao = f":material/warning: Não consegui anotar agora: {e}"

    # Resumo incremental: se a conversa ficou longa, resume as mensagens mais antigas
    nao_resumidas = st.session_state.historico[st.session_state.n_resumidas:]
    if len(nao_resumidas) > LIMITE_RESUMIR:
        qtd = len(nao_resumidas) - JANELA_MANTER
        trecho = nao_resumidas[:qtd]
        try:
            st.session_state.resumo = agente.resumir(st.session_state.resumo, trecho)
            st.session_state.n_resumidas += qtd
        except Exception:  # noqa: BLE001
            pass

    # Envia ao modelo só a parte não resumida + o resumo (mantém contexto, controla custo)
    hist_modelo = st.session_state.historico[st.session_state.n_resumidas:]
    try:
        resposta = agente.responder_entrevistador(hist_modelo, resumo=st.session_state.resumo)
    except Exception as e:  # noqa: BLE001
        resposta = f":material/warning: Erro ao falar com a IA: {e}"

    if aviso_anotacao:
        st.session_state.historico.append({"role": "assistant", "content": aviso_anotacao})
    st.session_state.historico.append({"role": "assistant", "content": resposta})

    # Salva a conversa em disco (memória entre sessões)
    agente.salvar_conversa(
        st.session_state.historico, st.session_state.resumo, st.session_state.n_resumidas
    )

    st.rerun()

"""
agente.py — Cérebro de IA do Agente Entrevistador da FVR.

Três funções principais:
  - responder_entrevistador(historico): o agente conversa com o Fabio, confirma o que
    entendeu e faz a próxima pergunta para preencher lacunas.
  - extrair_fatos(mensagem_fabio): pega SOMENTE os fatos técnicos concretos que o Fabio
    realmente disse (anti-alucinação). Retorna lista (pode ser vazia).
  - salvar_fatos(fatos): anexa os fatos em biblioteca_fvr.md, datados e atribuídos.

Usa OpenAI gpt-4o-mini.
"""

import os
import json
import datetime
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

MODELO = "gpt-4o-mini"
PASTA = Path(__file__).resolve().parent
ARQUIVO_BIBLIOTECA = PASTA / "biblioteca_fvr.md"
ARQUIVO_CONVERSA = PASTA / "conversa.json"
MARCADOR_ANOTACOES = "## 🆕 Anotações novas (capturadas pelo Entrevistador)"

_cliente = None


def _client() -> OpenAI:
    """Cria o cliente OpenAI sob demanda, com mensagem de erro amigável."""
    global _cliente
    if _cliente is None:
        chave = os.getenv("OPENAI_API_KEY")
        if not chave:
            raise RuntimeError(
                "A chave da OpenAI não foi encontrada. Crie um arquivo .env (copie de "
                ".env.exemplo) e coloque sua OPENAI_API_KEY lá dentro."
            )
        _cliente = OpenAI(api_key=chave)
    return _cliente


# --------------------------------------------------------------------------- #
# Armazenamento: Supabase (se configurado) OU arquivos locais (fallback)       #
# --------------------------------------------------------------------------- #

_sb = None


def usando_db() -> bool:
    """True se as credenciais do Supabase estiverem configuradas."""
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"))


def _supabase():
    """Cliente Supabase sob demanda (ou None se não configurado)."""
    global _sb
    if _sb is None and usando_db():
        from supabase import create_client
        _sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    return _sb


def _ler_base() -> str:
    """Texto base da biblioteca (seções fixas vindas do PDF)."""
    if ARQUIVO_BIBLIOTECA.exists():
        return ARQUIVO_BIBLIOTECA.read_text(encoding="utf-8")
    return ""


def _render_fatos(fatos: list[dict]) -> str:
    linhas = []
    for f in fatos:
        tag = " [CORRIGIDO]" if f.get("tipo") == "correcao" else ""
        linhas.append(
            f"- [{f.get('data', '')}] (Fabio){tag} "
            f"**{f.get('assunto') or 'geral'}**: {f.get('conteudo', '')}"
        )
    return "\n".join(linhas)


def listar_fatos() -> list[dict]:
    """Lista os fatos aprendidos (do Supabase, se ativo)."""
    if usando_db():
        try:
            r = _supabase().table("fatos").select("*").order("id").execute()
            return r.data or []
        except Exception:  # noqa: BLE001
            return []
    return []


def ler_biblioteca() -> str:
    """
    Conteúdo completo do cérebro = base (PDF) + fatos aprendidos.
    - Modo arquivo: lê o .md inteiro (fatos já ficam anexados nele).
    - Modo Supabase: base do .md + fatos vindos do banco.
    """
    base = _ler_base()
    if not usando_db():
        return base
    if MARCADOR_ANOTACOES in base:
        cabeca = base.split(MARCADOR_ANOTACOES)[0].rstrip()
        cabeca += f"\n\n{MARCADOR_ANOTACOES}\n\n"
    else:
        cabeca = base.rstrip() + f"\n\n{MARCADOR_ANOTACOES}\n\n"
    return cabeca + _render_fatos(listar_fatos()) + "\n"


# --------------------------------------------------------------------------- #
# Persistência da conversa (memória entre sessões)                            #
# --------------------------------------------------------------------------- #

def salvar_conversa(historico: list[dict], resumo: str = "", n_resumidas: int = 0) -> None:
    """Salva o histórico da conversa (Supabase ou disco) para retomar depois."""
    dados = {"historico": historico, "resumo": resumo, "n_resumidas": n_resumidas}
    if usando_db():
        try:
            _supabase().table("estado").upsert(
                {"chave": "conversa", "valor": json.dumps(dados, ensure_ascii=False)}
            ).execute()
        except Exception:  # noqa: BLE001
            pass
        return
    try:
        ARQUIVO_CONVERSA.write_text(
            json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except OSError:
        pass


def carregar_conversa() -> dict | None:
    """Carrega a conversa salva (ou None se não houver)."""
    if usando_db():
        try:
            r = _supabase().table("estado").select("valor").eq("chave", "conversa").execute()
            if r.data:
                return json.loads(r.data[0]["valor"])
        except Exception:  # noqa: BLE001
            return None
        return None
    if ARQUIVO_CONVERSA.exists():
        try:
            return json.loads(ARQUIVO_CONVERSA.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None
    return None


def limpar_conversa() -> None:
    """Apaga a conversa salva (para começar do zero). NÃO apaga os fatos aprendidos."""
    if usando_db():
        try:
            _supabase().table("estado").delete().eq("chave", "conversa").execute()
        except Exception:  # noqa: BLE001
            pass
        return
    try:
        ARQUIVO_CONVERSA.unlink(missing_ok=True)
    except OSError:
        pass


# --------------------------------------------------------------------------- #
# Resumo de conversas longas (mantém contexto sem estourar custo)             #
# --------------------------------------------------------------------------- #

def resumir(resumo_anterior: str, novas_mensagens: list[dict]) -> str:
    """Atualiza um resumo conciso da conversa, incorporando as mensagens antigas."""
    trecho = "\n".join(
        f"{'Fabio' if m['role'] == 'user' else 'JARVIS'}: {m['content']}"
        for m in novas_mensagens
    )
    prompt = (
        "Você mantém um resumo de uma conversa técnica entre o J.A.R.V.I.S. e o Mestre "
        "Fabio Vidal sobre ferragens. Atualize o resumo abaixo incorporando as novas "
        "mensagens. Seja conciso (máx. ~200 palavras) e PRESERVE: fatos técnicos citados, "
        "decisões, e o que ainda falta perguntar. Não invente nada.\n\n"
        f"=== RESUMO ATUAL ===\n{resumo_anterior or '(vazio)'}\n\n"
        f"=== NOVAS MENSAGENS ===\n{trecho}\n\n=== NOVO RESUMO ==="
    )
    resp = _client().chat.completions.create(
        model=MODELO,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return resp.choices[0].message.content.strip()


# --------------------------------------------------------------------------- #
# 1. O Entrevistador conversa e faz perguntas                                  #
# --------------------------------------------------------------------------- #

def _prompt_entrevistador(biblioteca: str) -> str:
    return f"""Você é o J.A.R.V.I.S., o assistente de inteligência da FVR — inspirado no
JARVIS do Homem de Ferro (Tony Stark). Você está conversando com o MESTRE FABIO VIDAL,
especialista com 25 anos de experiência em ferragens (dobradiças, pivôs hidráulicos,
fechaduras das linhas FVR/JNF).

Personalidade: elegante, prestativo, preciso e levemente espirituoso, como o JARVIS.
Trate o Fabio com respeito, chamando-o de "senhor" ou "Mestre Fabio".

Sua MISSÃO é entrevistar o Fabio para registrar e expandir a Biblioteca Técnica da FVR
(o "cérebro" do futuro agente de vendas). Você quer descobrir tudo o que ainda NÃO está
documentado.

Como agir:
- Leia a biblioteca atual (abaixo) e identifique LACUNAS — coisas citadas mas não
  detalhadas (ex.: "Fechaduras de Segurança de 4 Pinos" ou "Chave Tetra" estão listadas
  mas sem especificações), ou produtos sem peso/medida/uso.
- Faça UMA pergunta por vez, objetiva e técnica. Vá fundo em um assunto antes de pular
  para outro.
- Sempre que o Fabio te ensinar algo, CONFIRME o que entendeu em uma frase curta antes de
  fazer a próxima pergunta (ex.: "Entendi: o modelo X aguenta Y kg. Certo?").
- NUNCA invente especificação. Se o Fabio for vago, peça o número/medida/código exato.
- Tom calmo, respeitoso e direto. Responda em português do Brasil.
- Não precisa repetir a biblioteca inteira para ele; ele já a conhece.

=== BIBLIOTECA TÉCNICA ATUAL (cérebro) ===
{biblioteca}
=== FIM DA BIBLIOTECA ===
"""


def responder_entrevistador(historico: list[dict], resumo: str = "") -> str:
    """
    historico: lista de {"role": "user"|"assistant", "content": "..."}.
    'user' = falas do Fabio. resumo: resumo opcional da parte antiga da conversa.
    Retorna a resposta do entrevistador.
    """
    biblioteca = ler_biblioteca()
    mensagens = [{"role": "system", "content": _prompt_entrevistador(biblioteca)}]
    if resumo:
        mensagens.append({
            "role": "system",
            "content": "Resumo da conversa anterior com o Fabio (mantenha o contexto):\n"
                       + resumo,
        })
    mensagens.extend(historico)

    resp = _client().chat.completions.create(
        model=MODELO,
        messages=mensagens,
        temperature=0.5,
    )
    return resp.choices[0].message.content.strip()


# --------------------------------------------------------------------------- #
# 2. O Extrator pega só o que o Fabio realmente disse (anti-alucinação)        #
# --------------------------------------------------------------------------- #

_PROMPT_EXTRATOR = """Você é um extrator de conhecimento técnico para a Biblioteca da FVR.
Receberá a última fala do MESTRE FABIO VIDAL e a biblioteca atual.

Sua tarefa: extrair APENAS afirmações técnicas concretas e NOVAS ditas pelo Fabio —
medidas, pesos, capacidades, materiais, regras de aplicação, códigos de produto (IN.xx),
diferenciais.

Regras rígidas (anti-alucinação):
- Extraia SOMENTE o que está explicitamente escrito na fala do Fabio. NÃO complete, NÃO
  deduza, NÃO traga nada que ele não disse.
- Ignore saudações, perguntas, opiniões vagas e conversa fiada → nesses casos retorne
  lista vazia.
- Se a informação já está IDÊNTICA na biblioteca atual, não repita → lista vazia.
- Cada fato deve ser uma frase curta e autossuficiente.

CORREÇÕES: Se a fala do Fabio CONTRADIZ/ATUALIZA um dado que já existe na biblioteca (ex.:
antes dizia 80kg e agora ele diz que são 90kg), marque esse fato com "tipo": "correcao".
Caso contrário, use "tipo": "novo".

Responda SOMENTE em JSON no formato:
{"fatos": [{"assunto": "código ou tema curto", "conteudo": "o fato técnico em uma frase", "tipo": "novo"}]}
Se não houver nada para extrair: {"fatos": []}
"""


def extrair_fatos(mensagem_fabio: str) -> list[dict]:
    """Retorna lista de fatos novos extraídos da fala do Fabio (pode ser vazia)."""
    biblioteca = ler_biblioteca()
    conteudo = (
        f"=== BIBLIOTECA ATUAL ===\n{biblioteca}\n=== FIM ===\n\n"
        f"=== ÚLTIMA FALA DO FABIO ===\n{mensagem_fabio}\n=== FIM ==="
    )
    resp = _client().chat.completions.create(
        model=MODELO,
        messages=[
            {"role": "system", "content": _PROMPT_EXTRATOR},
            {"role": "user", "content": conteudo},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    try:
        dados = json.loads(resp.choices[0].message.content)
        fatos = dados.get("fatos", [])
        # Garante a forma esperada
        return [
            {"assunto": str(f.get("assunto", "")).strip(),
             "conteudo": str(f.get("conteudo", "")).strip(),
             "tipo": "correcao" if str(f.get("tipo", "")).strip().lower() == "correcao"
                     else "novo"}
            for f in fatos
            if str(f.get("conteudo", "")).strip()
        ]
    except (json.JSONDecodeError, AttributeError, TypeError):
        return []


# --------------------------------------------------------------------------- #
# 2b. Ler PDF (digital) e extrair fatos do documento                          #
# --------------------------------------------------------------------------- #

def extrair_texto_pdf(dados: bytes) -> str:
    """Extrai o texto de um PDF digital (não funciona em PDF escaneado/imagem)."""
    import io
    from pypdf import PdfReader

    leitor = PdfReader(io.BytesIO(dados))
    partes = []
    for pagina in leitor.pages:
        t = pagina.extract_text() or ""
        if t.strip():
            partes.append(t)
    return "\n".join(partes)


_PROMPT_DOCUMENTO = """Você extrai conhecimento técnico de um DOCUMENTO (catálogo, ficha
técnica ou tabela) da FVR, sobre ferragens (dobradiças, pivôs, fechaduras).

Extraia TODOS os fatos técnicos concretos e úteis: códigos de produto (IN.xx), medidas,
pesos, capacidades, materiais, usos/aplicações e regras.

Regras rígidas (anti-alucinação):
- Use SOMENTE o que está no texto fornecido. NÃO invente nem complete.
- Cada fato deve ser uma frase curta e autossuficiente.
- Ignore índices, números de página, rodapés e marketing vazio.

Responda SOMENTE em JSON:
{"fatos": [{"assunto": "código ou tema curto", "conteudo": "o fato técnico em uma frase"}]}
Se não houver nada técnico: {"fatos": []}
"""


def extrair_fatos_documento(texto: str, origem: str = "") -> list[dict]:
    """Extrai fatos técnicos de um texto grande (documento), processando por partes."""
    if not texto.strip():
        return []
    pedacos = [texto[i:i + 8000] for i in range(0, len(texto), 8000)]
    todos = []
    for pedaco in pedacos:
        try:
            resp = _client().chat.completions.create(
                model=MODELO,
                messages=[
                    {"role": "system", "content": _PROMPT_DOCUMENTO},
                    {"role": "user", "content": pedaco},
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )
            dados = json.loads(resp.choices[0].message.content)
            for f in dados.get("fatos", []):
                conteudo = str(f.get("conteudo", "")).strip()
                if not conteudo:
                    continue
                if origem:
                    conteudo = f"{conteudo} (fonte: {origem})"
                todos.append({
                    "assunto": str(f.get("assunto", "")).strip() or "geral",
                    "conteudo": conteudo,
                    "tipo": "novo",
                })
        except Exception:  # noqa: BLE001
            continue
    return todos


# --------------------------------------------------------------------------- #
# 3. Salvar os fatos no cérebro                                                #
# --------------------------------------------------------------------------- #

def salvar_fatos(fatos: list[dict]) -> list[str]:
    """
    Grava os fatos em biblioteca_fvr.md sob a seção de anotações novas.
    - tipo "novo": anexa uma linha nova.
    - tipo "correcao": tenta substituir uma anotação anterior do mesmo assunto;
      se não achar, registra uma linha [CORREÇÃO] (que o agente sempre prioriza).
    Retorna bullets para a UI mostrar o que foi anotado.
    """
    if not fatos:
        return []

    data = datetime.date.today().isoformat()

    # ---- Modo Supabase ----
    if usando_db():
        sb = _supabase()
        avisos = []
        for f in fatos:
            assunto = f["assunto"] or "geral"
            conteudo = f["conteudo"]
            if f.get("tipo") == "correcao":
                alvo = None
                try:
                    existentes = sb.table("fatos").select("id,assunto,conteudo").execute().data or []
                    for row in existentes:
                        campo = f"{row.get('assunto', '')} {row.get('conteudo', '')}".lower()
                        if assunto.lower() in campo:
                            alvo = row
                            break
                except Exception:  # noqa: BLE001
                    alvo = None
                registro = {"data": data, "assunto": assunto, "conteudo": conteudo, "tipo": "correcao"}
                try:
                    if alvo:
                        sb.table("fatos").update(registro).eq("id", alvo["id"]).execute()
                    else:
                        sb.table("fatos").insert(registro).execute()
                except Exception:  # noqa: BLE001
                    pass
                avisos.append(f"- *(correção)* **{assunto}**: {conteudo}")
            else:
                try:
                    sb.table("fatos").insert(
                        {"data": data, "assunto": assunto, "conteudo": conteudo, "tipo": "novo"}
                    ).execute()
                except Exception:  # noqa: BLE001
                    pass
                avisos.append(f"- **{assunto}**: {conteudo}")
        return avisos

    # ---- Modo arquivo (fallback) ----
    texto = _ler_base()
    if MARCADOR_ANOTACOES not in texto:
        texto = texto.rstrip() + f"\n\n{MARCADOR_ANOTACOES}\n"

    avisos = []
    for f in fatos:
        assunto = f["assunto"] or "geral"
        conteudo = f["conteudo"]
        if f.get("tipo") == "correcao":
            corpo, sep, bloco = texto.partition(MARCADOR_ANOTACOES)
            linhas_bloco = bloco.splitlines()
            substituida = False
            for i, ln in enumerate(linhas_bloco):
                if ln.strip().startswith("- ") and assunto.lower() in ln.lower():
                    linhas_bloco[i] = (
                        f"- [{data}] (Fabio) [CORRIGIDO] **{assunto}**: {conteudo}"
                    )
                    substituida = True
                    break
            if substituida:
                texto = corpo + sep + "\n".join(linhas_bloco)
            else:
                texto = texto.rstrip() + (
                    f"\n- [{data}] (Fabio) [CORREÇÃO — usar este valor] "
                    f"**{assunto}**: {conteudo}"
                )
            avisos.append(f"- *(correção)* **{assunto}**: {conteudo}")
        else:
            texto = texto.rstrip() + f"\n- [{data}] (Fabio) **{assunto}**: {conteudo}"
            avisos.append(f"- **{assunto}**: {conteudo}")

    ARQUIVO_BIBLIOTECA.write_text(texto.rstrip() + "\n", encoding="utf-8")
    return avisos

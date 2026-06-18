# Publicar o J.A.R.V.I.S. no Netlify

A aplicação roda 100% no Netlify: **site estático** (`public/`) + **Netlify Functions**
(`netlify/functions/`), usando **Supabase** (banco) e **OpenAI** (IA).

> O Supabase já deve estar configurado (tabelas `fatos` e `estado`). Veja
> [SETUP_SUPABASE.md](SETUP_SUPABASE.md) se ainda não criou.

---

## Passo 1 — Conectar o repositório
1. Em **https://app.netlify.com** → **Add new site → Import an existing project**.
2. Escolha o GitHub e o repositório **`Wendellv66/jarvisFVR`**.
3. As configurações de build já vêm do `netlify.toml`:
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
   - (não há comando de build — é site estático)

## Passo 2 — Variáveis de ambiente (Environment variables)
Em **Site configuration → Environment variables**, adicione:

| Chave | Valor |
|---|---|
| `OPENAI_API_KEY` | sua chave da OpenAI |
| `SUPABASE_URL` | `https://rdmrecjbvshaxhpfnyzf.supabase.co` |
| `SUPABASE_KEY` | a **service_role** key do Supabase |
| `APP_USUARIO` | `fabio` |
| `APP_SENHA` | uma senha forte |
| `APP_TOKEN` | um texto aleatório longo (protege a API) |

> Essas variáveis ficam **só no servidor** (nas Functions). O navegador nunca vê as chaves.

## Passo 3 — Deploy
Clique em **Deploy**. O Netlify instala as dependências do `package.json`, publica o site
e as funções. Em ~1–2 min você recebe o link (ex.: `https://jarvisfvr.netlify.app`).

## Passo 4 — Preview do WhatsApp (opcional)
No `public/index.html`, troque a meta tag `og:image` para a URL absoluta do ícone:
`https://SEU-SITE.netlify.app/icon.png` e faça commit. Valide em https://www.opengraph.xyz/.

---

## Como funciona (resumo técnico)
- **Frontend:** `public/index.html` + `app.js` + `styles.css` (login, chat, cérebro, PDF).
- **Login:** `/api/login` valida usuário/senha e devolve o `APP_TOKEN`; o front guarda e envia
  no header `x-app-token` em toda chamada. As demais funções exigem esse token.
- **/api/estado:** carrega biblioteca (base + fatos) e a conversa salva.
- **/api/turno:** anota fatos (Supabase), resume se a conversa for longa, responde e persiste.
- **/api/pdf:** extrai texto de PDF digital e propõe fatos (você confirma antes de salvar).
- **/api/salvar:** salva os fatos aprovados. **/api/nova:** limpa a conversa.

## Atualizar depois
Faça as alterações, `git add -A && git commit -m "..."` e `git push`. O Netlify
reimplanta automaticamente.

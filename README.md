# 🦾 J.A.R.V.I.S. — Agente Entrevistador da FVR

Assistente de IA que **conversa com o Mestre Fabio Vidal**, **anota** o que ele ensina e
**faz perguntas** para preencher lacunas — fazendo a Biblioteca Técnica da FVR (o "cérebro")
crescer. Tema visual inspirado no Homem de Ferro.

## Arquitetura (roda 100% no Netlify)
- **Frontend estático:** `public/` (`index.html`, `app.js`, `styles.css`)
- **Backend serverless:** `netlify/functions/` (Node) — chama OpenAI e Supabase
- **Banco de dados:** Supabase (tabelas `fatos` e `estado`)
- **IA:** OpenAI `gpt-4o-mini`

## Funcionalidades
- Chat que entrevista o Fabio e **anota fatos automaticamente** (anti-alucinação)
- **Correção de conflitos** (atualiza em vez de duplicar)
- **Resumo automático** de conversas longas
- **Memória permanente** no Supabase + conversa que continua entre sessões
- **Upload de PDF** (digital) com extração de fatos e confirmação antes de salvar
- Login temático, ícones, responsivo (celular)

## Publicar
Passo a passo em **[DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md)** (e
[SETUP_SUPABASE.md](SETUP_SUPABASE.md) para o banco).

## Variáveis de ambiente necessárias
`OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` (service_role), `APP_USUARIO`,
`APP_SENHA`, `APP_TOKEN`. Localmente ficam no `.env` (não vai para o GitHub); no Netlify,
em *Environment variables*.

---

### Versão antiga (Streamlit)
Os arquivos `app.py`, `agente.py` e `biblioteca_fvr.md` são a versão inicial em Streamlit
(rodava localmente). Foram mantidos como referência, mas a versão oficial agora é a do
Netlify descrita acima.

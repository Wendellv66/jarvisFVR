# Configurar Supabase + Publicar na internet (Streamlit Cloud)

O app funciona de dois jeitos automaticamente:
- **Sem Supabase** → salva em arquivos locais (bom para testar no PC).
- **Com Supabase configurado** → salva tudo no banco (necessário na internet).

---

## Parte 1 — Criar o banco no Supabase (grátis)

1. Crie uma conta em **https://supabase.com** e clique em **New Project**.
2. Dê um nome (ex.: `jarvis-fvr`), defina uma senha do banco e crie.
3. No menu lateral, abra **SQL Editor** → **New query**, cole o SQL abaixo e clique em **Run**:

```sql
-- Tabela do conhecimento aprendido (o "cérebro")
create table if not exists fatos (
  id bigint generated always as identity primary key,
  data text,
  assunto text,
  conteudo text,
  tipo text default 'novo',
  created_at timestamptz default now()
);

-- Tabela de estado (guarda a conversa atual)
create table if not exists estado (
  chave text primary key,
  valor text
);

-- Como o app roda no servidor (não no navegador), usamos a chave de serviço.
-- Desligar o RLS nessas tabelas mantém tudo simples e seguro nesse cenário.
alter table fatos disable row level security;
alter table estado disable row level security;
```

4. Pegue as chaves em **Project Settings → API**:
   - **Project URL** → será o `SUPABASE_URL`
   - **service_role key** (em *Project API keys*) → será o `SUPABASE_KEY`
   - ⚠️ A `service_role` é secreta. Ela só fica no servidor (nos Secrets), **nunca** no navegador. Não a coloque em código público.

---

## Parte 2 — Testar localmente (opcional)

No arquivo `.env`, adicione:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_KEY=cole_aqui_a_service_role_key
```

Rode `streamlit run app.py`. Ao ensinar um fato, ele agora vai parar no Supabase
(você vê os registros em **Table Editor → fatos**).

---

## Parte 3 — Publicar no Streamlit Cloud

1. Suba a pasta do projeto para um repositório no **GitHub**.
   - ⚠️ **NÃO** suba o arquivo `.env` (ele tem chaves). Confira o `.gitignore`.
2. Acesse **https://share.streamlit.io** → **New app**, conecte o GitHub e escolha o repositório.
   - Main file path: `app.py`
3. Em **Advanced settings → Secrets**, cole (formato TOML):

```toml
OPENAI_API_KEY = "sk-..."
SUPABASE_URL = "https://xxxxxxxx.supabase.co"
SUPABASE_KEY = "service_role_key"
APP_USUARIO = "fabio"
APP_SENHA = "uma_senha_forte"
```

4. Clique em **Deploy**. Em ~1 min o Fabio pode acessar o link de qualquer lugar
   (celular ou PC), e tudo que ele ensinar fica salvo no Supabase para sempre.

---

## Resumo
- **Fatos** (conhecimento) → tabela `fatos`
- **Conversa** → tabela `estado` (chave `conversa`)
- Botão **Baixar biblioteca** continua funcionando para você ter uma cópia `.md`.

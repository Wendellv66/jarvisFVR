# 🧠 Agente Entrevistador da FVR

Um agente de IA que **conversa com o Mestre Fabio Vidal**, **anota tudo** o que ele ensina
e **faz perguntas** para preencher as lacunas — fazendo a Biblioteca Técnica da FVR
(o "cérebro") crescer sozinha a cada conversa.

- **Cérebro:** [`biblioteca_fvr.md`](biblioteca_fvr.md) — arquivo de texto que vai crescendo.
- **IA:** OpenAI `gpt-4o-mini` (barato e suficiente).
- **Interface:** página web de chat (Streamlit).

---

## Como rodar (passo a passo)

### 1. Instalar o Python
Se ainda não tem, baixe em https://www.python.org/downloads/ e, na instalação,
marque a caixa **"Add Python to PATH"**.

### 2. Instalar os programas necessários
Abra o **PowerShell** dentro desta pasta e rode:

```powershell
pip install -r requirements.txt
```

### 3. Colocar sua chave da OpenAI
1. Faça uma cópia do arquivo `.env.exemplo` e renomeie a cópia para `.env`.
2. Abra o `.env` e troque `sk-XXXX` pela sua chave da OpenAI
   (pegue em https://platform.openai.com/api-keys).

### 4. Abrir o agente
No PowerShell, dentro desta pasta:

```powershell
streamlit run app.py
```

Vai abrir uma página no navegador. Pronto — é só conversar.

---

## Como usar
- **Para ensinar:** escreva o que sabe (ex.: *"A fechadura tetra IN.20.700 tem 5 pinos e
  serve para área externa"*). O agente confirma e mostra **"📌 Anotei na biblioteca..."**.
- **Para descobrir o que falta:** peça *"o que ainda está faltando na biblioteca?"* — ele
  vai te fazer perguntas.
- O cérebro atualizado aparece na barra lateral, com botão para **baixar** a biblioteca.

## Observações
- Tudo que é anotado fica no fim de `biblioteca_fvr.md`, com **data** e marca **(Fabio)**.
  Se algo sair errado, é só abrir o arquivo e editar/apagar a linha.
- O agente é instruído a **nunca inventar** (Zero Alucinação): se você for vago, ele pede o
  número/medida exato em vez de chutar.

## Próximos passos (ainda não incluídos)
- Agente de **Vendas** que usa o cérebro para atender clientes.
- Integração com **WhatsApp**.
- Organização automática das anotações dentro das seções certas.

# Página de entrada (preview do WhatsApp)

Esta pasta (`landing/`) é uma página simples que:
- Mostra o **ícone e o título** quando o link é compartilhado no **WhatsApp** (via meta tags).
- **Redireciona** automaticamente para o app no Streamlit.

Assim você compartilha **o link desta página** (não o do Streamlit direto), e o preview aparece.

---

## Passo 1 — Editar os 2 links no `index.html`
Abra `index.html` e troque:
- **`APP_URL`** → pelo link do app no Streamlit Cloud (ex.: `https://jarvis-fvr.streamlit.app`).
  Aparece em 3 lugares (na meta `refresh`, no `script` e no link "clique aqui").
- **`BASE_URL`** → pelo link onde esta página vai ficar (o endereço do GitHub Pages, veja abaixo).
  Aparece 1 vez, na meta `og:image` (precisa ser o endereço completo da imagem).

> Dica: o `og:image` precisa ser um link **absoluto e público** (começando com `https://`),
> senão o WhatsApp não consegue baixar a imagem.

## Passo 2 — Publicar grátis no GitHub Pages
1. No seu repositório do GitHub, suba a pasta `landing/` (com `index.html` e `icon.png`).
2. No GitHub: **Settings → Pages**.
3. Em **Source**, escolha a branch (ex.: `main`) e a pasta `/landing` (ou `/root` se subir só o conteúdo).
4. Salve. Em ~1 min o GitHub mostra o endereço, algo como:
   `https://SEU_USUARIO.github.io/SEU_REPOSITORIO/`
5. Esse endereço é o seu **`BASE_URL`**. Volte no `index.html`, coloque ele na meta `og:image`
   (ex.: `https://SEU_USUARIO.github.io/SEU_REPOSITORIO/icon.png`) e suba de novo.

## Passo 3 — Testar o preview
- Use o validador: https://www.opengraph.xyz/ (cole o link da landing e veja o preview).
- Ou mande o link pra você mesmo no WhatsApp.

> Observação: o WhatsApp guarda o preview em cache. Se você mudar a imagem depois, pode
> demorar pra atualizar, ou use o validador acima para forçar uma nova leitura.

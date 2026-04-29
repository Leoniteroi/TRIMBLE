# Extensao web do Trimble Connect

Este arquivo e um resumo rapido da extensao. A documentacao completa do app esta em `README.md`.

## O que a extensao faz

- conecta ao Workspace API do Trimble Connect
- le o projeto atual aberto no host
- solicita permissao para usar `accesstoken`
- lista os projetos do usuario autenticado
- consulta topicos BCF do projeto selecionado
- exporta os topicos carregados para Excel

## Arquivos principais

- `index.html`: interface da extensao
- `script.js`: integracao com Workspace API, APIs REST e renderizacao
- `styles.css`: visual e responsividade
- `manifest.json`: manifesto para instalacao no Trimble Connect
- `README.md`: documentacao completa funcional e tecnica

## Endpoints usados

- `https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false`
- hosts BCF regionais `open11`, `open21`, `open31` e `open32`

## Instalacao

1. Hospede os arquivos em HTTPS.
2. Atualize a URL em `manifest.json`.
3. Garanta CORS para manifesto e assets.
4. No Trimble Connect, abra `Project Settings -> Extensions`.
5. Adicione a URL publica do `manifest.json`.

## Observacoes

- Esta extensao e totalmente front-end.
- O fluxo real depende do host do Trimble Connect.
- O repositorio nao possui build nem backend.

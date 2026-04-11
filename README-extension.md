# Extensao web do Trimble Connect

Este projeto foi convertido para uma extensao web do Trimble Connect usando o Workspace API.

## Como funciona

- A extensao e carregada dentro do Trimble Connect for Browser.
- O login do usuario continua sendo o proprio login do Trimble Connect.
- A extensao pede permissao ao token com `extension.requestPermission("accesstoken")`.
- Com esse token, a pagina chama:
  - `https://app.connect.trimble.com/tc/api/2.0/users/me`
  - `https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false`

## Arquivos principais

- `index.html`: interface da extensao
- `script.js`: conexao com o Workspace API e chamadas REST
- `styles.css`: visual da extensao
- `manifest.json`: manifesto para instalar no Trimble Connect

## Instalacao

1. Hospede estes arquivos em HTTPS.
2. Edite `manifest.json` e troque `https://SEU-HOST-AQUI/index.html` pela URL real.
3. Garanta que a URL do manifesto esteja com CORS habilitado.
4. No Trimble Connect, abra `Project Settings -> Extensions`.
5. Adicione a URL publica do `manifest.json`.

## Observacoes

- Esta abordagem e para extensao web dentro do Trimble Connect, nao para app desktop VB .NET.
- O consentimento do token e dado pelo usuario dentro do proprio Connect.
- Se o usuario negar o acesso, a extensao recebe o status `denied`.

## Referencias oficiais

- https://developer.trimble.com/docs/connect/tools/api/workspace/
- https://components.connect.trimble.com/trimble-connect-workspace-api/index.html

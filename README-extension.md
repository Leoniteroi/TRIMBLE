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

## Fluxo tecnico (documentacao do codigo)

1. `initializeExtension()` conecta com `TrimbleConnectWorkspace.connect(...)`.
2. `loadCurrentProject()` busca o projeto atual no contexto da aba/projeto aberto.
3. `requestAccessToken()` solicita `accesstoken` via permissao da extensao.
4. `loadUserAndProjects()` chama os endpoints REST de usuario e projetos.
5. `renderProjectList()` monta a lista clicavel de projetos no painel.
6. `loadTopicsForProject()` e `fetchTopics()` carregam topicos via BCF com fallback (`3.0` -> `2.1`).
7. `renderTopicList()` desenha os topicos e atualiza o contador na UI.

### Estrategia de normalizacao

Como os payloads podem variar por endpoint/versao, o codigo aplica normalizacao antes de renderizar:

- `normalizeProjects(payload)`: aceita `data`, `items`, `projects`, `results` ou array puro.
- `normalizeTopics(payload)`: aceita `data`, `items`, `topics`, `results` ou array puro.

Assim a UI trabalha sempre com um formato interno consistente, mesmo quando os campos mudam entre APIs.

## Diagnostico rapido

- **Status `pending` ao solicitar token**: o usuario ainda nao confirmou permissao no painel do Trimble Connect.
- **Status `denied`**: o usuario negou acesso ao `accesstoken`; e preciso pedir nova permissao.
- **Lista de projetos vazia**: valide se o usuario autenticado possui projetos visiveis na organizacao.
- **Erro HTTP nos topicos**: a extensao tenta BCF `3.0` e depois `2.1`; se ambos falharem, a mensagem de erro retornada pela API aparece no status.
- **Projeto atual nao encontrado**: abra a extensao dentro do contexto de um projeto, nao apenas na tela geral.

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

# TRIMBLE

Extensao web do Trimble Connect para listar projetos do usuario autenticado, consultar topicos BCF do projeto selecionado e exportar os topicos para Excel.

## Visao geral

O app foi construido como uma extensao front-end pura, sem build e sem backend.

Ele roda dentro do Trimble Connect for Browser e usa duas integracoes principais:

- Workspace API do Trimble Connect para se conectar ao host, descobrir o projeto atual e solicitar o `accesstoken`.
- APIs REST do Trimble Connect e endpoints BCF para carregar projetos e topicos.

## O que o app faz

- Conecta a pagina ao container do Trimble Connect via `window.TrimbleConnectWorkspace.connect(...)`.
- Descobre o projeto aberto no contexto atual da extensao.
- Solicita permissao para usar o token de acesso do usuario logado.
- Lista os projetos disponiveis para esse usuario.
- Permite selecionar um projeto da lista.
- Busca os topicos BCF do projeto selecionado.
- Separa os topicos em andamento e concluidos.
- Exibe os topicos em tabela com status, prioridade, vencimento, etiquetas e responsavel.
- Mostra o JSON bruto do item atualmente selecionado.
- Exporta os topicos carregados para um arquivo `.xls` com duas abas.

## Stack e dependencias

- HTML5
- CSS3
- JavaScript vanilla
- Workspace API do Trimble Connect carregada por CDN
- Google Fonts para tipografia

Dependencias externas carregadas em tempo de execucao:

- `https://components.connect.trimble.com/trimble-connect-workspace-api/index.js`
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`

## Estrutura do projeto

Arquivos principais:

- `index.html`: estrutura da interface, paineis, botoes e placeholders de dados.
- `styles.css`: identidade visual, layout responsivo, tabelas, badges e estados visuais.
- `script.js`: estado da aplicacao, integracao com Workspace API, chamadas REST, renderizacao e exportacao Excel.
- `manifest.json`: manifesto da extensao usado para instalar no Trimble Connect.
- `README-extension.md`: resumo curto da extensao.

## Arquitetura funcional

O app segue um fluxo direto de inicializacao:

1. A pagina carrega `index.html`, `styles.css`, a biblioteca do Workspace API e depois `script.js`.
2. `initialize()` conecta a extensao ao Trimble Connect.
3. `loadCurrentProject()` tenta identificar o projeto atualmente aberto no host.
4. `requestAccessToken()` solicita permissao ao usuario para usar o token.
5. `loadProjects()` chama a API de projetos do Trimble Connect.
6. A lista de projetos e renderizada em botoes clicaveis.
7. Ao selecionar um projeto, `loadTopics(project)` consulta os endpoints BCF.
8. Os topicos retornados sao normalizados, ordenados, separados por status e renderizados em duas tabelas.
9. O usuario pode visualizar o JSON atual ou exportar os topicos em Excel.

## Fluxo de dados

### 1. Conexao com o host

O ponto de entrada e:

```js
window.TrimbleConnectWorkspace.connect(window.parent, callback)
```

Essa conexao entrega o objeto `workspaceApi`, usado para:

- `workspaceApi.project.getCurrentProject?.()`
- `workspaceApi.project.getProject?.()`
- `workspaceApi.extension.requestPermission("accesstoken")`

### 2. Token de acesso

O app usa o proprio login do usuario no Trimble Connect.

Quando a permissao e concedida, o retorno de `requestPermission("accesstoken")` e salvo em `accessToken`.

Estados tratados:

- `pending`: permissao ainda aguardando resposta do usuario.
- `denied`: permissao negada.
- `string`: token concedido e pronto para uso.

### 3. Carregamento de projetos

Com o token, o app chama:

```text
https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false
```

Os dados recebidos sao convertidos por `normalizeProjects()` para um formato interno padrao:

- `id`
- `name`
- `number`
- `location`
- `raw`

### 4. Carregamento de topicos BCF

Ao selecionar um projeto, o app tenta buscar topicos nos hosts BCF conhecidos.

Hosts mapeados:

- `northamerica -> https://open11.connect.trimble.com`
- `europe -> https://open21.connect.trimble.com`
- `asiapacific -> https://open31.connect.trimble.com`
- `australia -> https://open32.connect.trimble.com`

Para cada host, o app tenta dois formatos:

- BCF `3.0`: `/bcf/3.0/projects/{projectId}/topics`
- BCF `2.1`: `/bcf/2.1/projects/{projectId}/topics?top=500`

`fetchBcfTopics()` tenta os endpoints em ordem priorizada pela localizacao do projeto. Se todos falharem, a funcao consolida os erros e mostra a falha para o usuario.

### 5. Normalizacao de topicos

`normalizeTopics()` converte respostas BCF diferentes para um formato unico:

- `id`
- `code`
- `title`
- `status`
- `type`
- `priority`
- `dueDate`
- `labels`
- `owner`
- `createdBy`
- `updatedAt`
- `raw`

### 6. Ordenacao e agrupamento

Os topicos sao:

- ordenados por vencimento com `sortTopicsByDueDate()`
- classificados entre em andamento e concluidos por `splitTopicsByCompletion()`

Status tratados como concluidos:

- `resolved`
- `done`
- `closed`

## Interface

### Painel esquerdo

Resumo da extensao:

- indicadores visuais de conexao e token
- card com o projeto atual identificado no host

Observacao importante:

- os elementos `connectionState` e `tokenState` existem no HTML, mas ainda nao sao atualizados pelo `script.js`.

### Painel direito

Blocos principais:

- Workspace API: placeholders de usuario e email, estado de permissao do token e botao de atualizacao.
- Projetos do usuario: lista de projetos disponiveis.
- Topicos do projeto: botoes para exibir topicos e exportar Excel.
- JSON selecionado: visualizacao do payload atual.

Observacao importante:

- os campos `userName` e `userEmail` existem na interface, mas o codigo atual nao chama `/users/me`, entao esses campos permanecem com o texto padrao.

## Comportamento dos botoes

- `Atualizar dados`: recarrega projeto atual, token e lista de projetos.
- `Exibir JSON`: alterna entre mostrar e ocultar o JSON selecionado.
- `Exibir topicos`: alterna entre mostrar e ocultar as tabelas de topicos.
- `Exportar Excel`: baixa um arquivo `.xls` com os topicos carregados.

Os botoes de topicos e JSON ficam desabilitados enquanto nao houver dados disponiveis.

## Exportacao Excel

A exportacao e gerada no navegador, sem biblioteca externa.

O app monta um XML no formato SpreadsheetML e baixa um arquivo com nome parecido com:

```text
topicos-{projectId}-{yyyy-mm-dd}.xls
```

Abas geradas:

- `Topicos em andamento`
- `Topicos concluidos`

Colunas exportadas:

- Codigo
- Titulo
- Status
- Tipo
- Prioridade
- Vencimento
- Etiquetas
- Responsavel

## Estados internos importantes

Variaveis globais de estado em `script.js`:

- `workspaceApi`: referencia para o host do Trimble Connect.
- `accessToken`: token retornado pela permissao da extensao.
- `projects`: lista normalizada de projetos.
- `selectedProjectId`: projeto atualmente selecionado na UI.
- `currentProjectId`: projeto carregado no contexto do host.
- `selectedJsonData`: payload exibido no bloco de JSON.
- `selectedTopicsData`: topicos atualmente carregados.

## Funcoes principais do `script.js`

Mapa rapido das responsabilidades:

- `setStatus(message, type)`: atualiza a mensagem de status global.
- `setJson(data)`: prepara o payload atual para visualizacao em JSON.
- `setTopicsData(items)`: sincroniza estado, botoes e visibilidade dos topicos.
- `normalizeProjects(payload)`: padroniza a resposta da API de projetos.
- `normalizeTopics(payload)`: padroniza a resposta da API BCF.
- `fetchJson(url, token)`: helper generico para chamadas autenticadas.
- `renderProjects()`: monta a lista de projetos clicaveis.
- `renderTopics(items)`: monta as secoes de topicos.
- `fetchBcfTopics(projectId, token, projectRaw)`: resolve o melhor endpoint BCF e busca os topicos.
- `loadTopics(project)`: carrega, normaliza e exibe topicos do projeto.
- `loadCurrentProject()`: le o projeto atual do contexto do host.
- `requestAccessToken()`: solicita o token ao Trimble Connect.
- `loadProjects()`: busca projetos e dispara a carga inicial de topicos.
- `initialize()`: orquestra toda a inicializacao da extensao.
- `exportTopicsToExcel()`: gera e baixa o arquivo `.xls`.

## Manifesto da extensao

O `manifest.json` define:

- `title`: nome exibido no Trimble Connect.
- `icon`: icone da extensao.
- `url`: URL publica do `index.html`.
- `description`: descricao funcional da extensao.
- `enabled`: liga ou desliga a extensao.

Exemplo atual:

```json
{
  "title": "Projetos Trimble Connect",
  "icon": "https://components.connect.trimble.com/trimble-connect-workspace-api/favicon.ico",
  "url": "https://SEU-HOST-AQUI/index.html",
  "description": "Extensao de projeto que reutiliza a sessao do Trimble Connect e lista os projetos do usuario.",
  "enabled": true
}
```

## Como publicar e instalar

1. Hospede os arquivos estaticos em HTTPS.
2. Atualize o campo `url` do `manifest.json` para a URL real do `index.html`.
3. Garanta que o host entregue o manifesto e os assets com CORS permitido.
4. No Trimble Connect for Browser, abra `Project Settings -> Extensions`.
5. Adicione a URL publica do `manifest.json`.

## Como rodar localmente para desenvolvimento

Como o app depende do host do Trimble Connect, abrir o `index.html` direto no navegador nao reproduz o fluxo completo.

Para testar de verdade:

1. Sirva os arquivos por HTTP ou HTTPS.
2. Publique temporariamente em um host acessivel.
3. Instale a extensao pelo manifesto.
4. Abra a extensao dentro de um projeto no Trimble Connect.

O que nao funciona fora do host:

- conexao com `window.parent` do Trimble Connect
- Workspace API
- permissao `accesstoken`
- descoberta do projeto atual

## Tratamento de erros

O app trata falhas principalmente na UI, usando `setStatus(...)` e preenchendo o bloco de JSON com o erro bruto.

Cenarios cobertos:

- Workspace API indisponivel
- projeto atual nao encontrado
- token nao concedido
- falha na API de projetos
- falha em todos os endpoints BCF
- tentativa de exportar sem topicos carregados

## Limitacoes atuais

- Nao existe backend ou proxy; tudo depende do navegador e das permissoes do host.
- O contador de projetos e topicos mostra apenas o numero bruto no elemento visual.
- A listagem de projetos mostra apenas o nome, sem metadados extras na interface.
- Os campos visuais de conexao, token, usuario e email ainda nao refletem todo o estado real do app.
- O carregamento de topicos depende dos hosts BCF conhecidos no codigo.
- O arquivo exportado usa `.xls` em XML, nao `.xlsx`.
- Nao ha filtros, busca textual, ordenacao manual ou paginacao na interface.
- Nao ha suite de testes automatizados neste repositorio.

## Melhorias recomendadas

- Atualizar os elementos de status visual do painel esquerdo para refletirem o estado real de conexao e token.
- Exibir metadados do projeto na lista de projetos.
- Adicionar filtros por status, prioridade, responsavel e vencimento.
- Permitir exportacao tambem em `.csv` ou `.xlsx`.
- Registrar logs de diagnostico mais claros para falhas em endpoints BCF.
- Criar testes para normalizacao de payloads e classificacao de topicos.

## Resumo tecnico

Este repositorio contem uma extensao estatica do Trimble Connect focada em leitura de dados.

Nao existe processo de build, framework front-end ou servidor local obrigatorio. O comportamento inteiro do app vive em `script.js`, e o sucesso da execucao depende da disponibilidade do Workspace API e da permissao do token do usuario no ambiente hospedado pelo Trimble Connect.

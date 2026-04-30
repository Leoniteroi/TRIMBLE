# Documentacao Tecnica do Codigo - Extensao Trimble Connect

## 1. Visao Geral

Este projeto implementa uma extensao web estatica para o Trimble Connect. O foco e listar projetos do usuario autenticado, consultar topicos BCF do projeto selecionado, mostrar esses dados em tabela e exportar os topicos para Excel (`.xls`).

Arquivos principais:

- `index.html`: estrutura da interface e pontos de montagem dos dados.
- `styles.css`: layout, tabela, badges, responsividade e estados visuais.
- `script.js`: estado do frontend, integracao com Workspace API, chamadas REST, normalizacao, renderizacao e exportacao.
- `bcf-endpoints.js`: regras compartilhadas de hosts e endpoints BCF.
- `server.js`: servidor HTTP local e proxy opcional para topicos BCF.
- `manifest.json`: metadados da extensao.

## 2. Fluxo Funcional

1. A pagina carrega `index.html`, `styles.css`, Workspace API, `bcf-endpoints.js` e `script.js`.
2. `renderFrontendState()` sincroniza os placeholders iniciais do frontend.
3. `initialize()` conecta a extensao ao host Trimble Connect.
4. `loadCurrentProject()` tenta ler o projeto aberto no host.
5. `requestAccessToken()` solicita a permissao `accesstoken`.
6. Quando o token e concedido, o app carrega perfil do usuario e projetos.
7. `loadProjects()` normaliza a lista de projetos e define o projeto selecionado.
8. `setActiveProjectState(project)` atualiza o card do painel esquerdo com o projeto selecionado na UI.
9. `loadTopics(project)` carrega os topicos BCF, normaliza os campos e renderiza a tabela.
10. O usuario pode exibir o JSON bruto retornado pelo BCF ou exportar para Excel.

## 3. Estado do Frontend

O estado visual da aplicacao e centralizado em `frontendState`:

- `connection`: estado da conexao com o host.
- `token`: estado do token de acesso.
- `permission`: estado exibido no card de permissoes.
- `userName` e `userEmail`: dados do usuario autenticado ou mensagens de fallback.
- `projectName` e `projectMeta`: projeto selecionado na interface.

`renderFrontendState()` aplica esse estado nos elementos do DOM. Com isso, painel esquerdo, card de usuario, permissao e projeto selecionado deixam de depender de textos estaticos no HTML.

Funcoes relacionadas:

- `setVisualState(element, state)`: aplica texto, classe visual, `data-state` e `aria-label` nos chips.
- `setConnectionState(state)`: atualiza conexao.
- `setTokenState(state)`: atualiza token.
- `setPermissionState(state)`: atualiza permissao.
- `setUserIdentity(profile)`: atualiza nome e email do usuario.
- `setCurrentProjectState(name, meta)`: atualiza o card do projeto.
- `setActiveProjectState(project)`: sincroniza o projeto selecionado na lista com o painel esquerdo.
- `syncRuntimeFrontendState()`: garante `Conectado` e `Concedido` quando `workspaceApi` e `accessToken` existem.

## 4. Estados Visuais

Os chips do painel esquerdo usam classes geradas a partir do estado:

- `status-chip-conectado` e `status-chip-concedido`: sucesso.
- `status-chip-conectando`, `status-chip-aguardando`, `status-chip-pendente`, `status-chip-nao-solicitado`: aguardando ou em andamento.
- `status-chip-indisponivel`, `status-chip-negado`, `status-chip-nao-concedido`: erro, bloqueio ou ausencia de permissao.

O CSS usa barra lateral, ponto indicador, cor de texto e fundo para deixar a mudanca perceptivel.

## 5. Integracao Workspace API

O ponto de entrada e:

```js
window.TrimbleConnectWorkspace.connect(window.parent, callback)
```

O objeto `workspaceApi` e usado para:

- `workspaceApi.project.getCurrentProject?.()`
- `workspaceApi.project.getProject?.()`
- `workspaceApi.extension.requestPermission("accesstoken")`

O token pode chegar por retorno direto de `requestPermission` ou por evento `extension.accessToken`. `extractAccessToken(value)` aceita string e formatos comuns de objeto (`accessToken`, `access_token`, `token`, `data`).

## 6. Projetos

`normalizeProjects(payload)` converte respostas diferentes da API para:

- `id`
- `name`
- `number`
- `location`
- `raw`

`renderProjects()` cria botoes de projeto com `DocumentFragment`, preserva o botao ativo em `activeProjectButton` e evita `querySelectorAll` a cada clique.

O card do painel esquerdo mostra o projeto selecionado na UI, nao apenas o projeto inicial do host. Os metadados sao formatados por `formatProjectMeta(project)` com numero, ID e regiao quando disponiveis.

## 7. Integracao BCF

`bcf-endpoints.js` centraliza:

- `TOPICS_REGION_HOSTS`
- `normalizeProjectLocation(location)`
- `prioritizeTopicHostsByProject(projectRaw)`
- `buildBcfTopicEndpointCandidates(projectId)`

Hosts conhecidos:

- `northamerica -> https://open11.connect.trimble.com`
- `europe -> https://open21.connect.trimble.com`
- `asiapacific -> https://open31.connect.trimble.com`
- `australia -> https://open32.connect.trimble.com`

Para cada host, o app tenta:

- BCF `3.0`: `/bcf/3.0/projects/{projectId}/topics`
- BCF `2.1`: `/bcf/2.1/projects/{projectId}/topics?top=500`

`fetchBcfTopics()` tenta os endpoints em ordem priorizada pela localizacao do projeto e consolida as falhas quando nenhum endpoint responde com sucesso.

Ao carregar topicos com sucesso, `setJson(topicsResponse.payload)` envia ao painel JSON exatamente o payload bruto retornado pelo BCF. A normalizacao acontece em paralelo apenas para renderizacao da tabela e exportacao.

## 8. Normalizacao de Topicos

`normalizeTopics(payload)` gera um formato unico:

- `id`
- `code`
- `title`
- `status`
- `type`
- `priority`
- `dueDate`
- `createdAt`
- `labels`
- `assignee`
- `owner`
- `createdBy`
- `updatedAt`
- `raw`

Melhorias atuais:

- `normalizeTopicTextValue(value, fallback)` evita `[object Object]` em tabela e Excel.
- `normalizeTopicLabels(topic)` aceita `labels`, `label`, `tags` e `tag`.
- `normalizeTopicAssignee(topic, directory)` aceita strings, objetos, listas, usuarios e grupos.
- `loadAssigneeDirectory(projectId)` enriquece responsaveis a partir de endpoints opcionais de projeto, usuarios, grupos e membros.
- `assigneeDirectoryCache` evita buscar o mesmo diretorio de responsaveis repetidamente para o mesmo projeto.

## 9. Tabela de Topicos

A tabela e construida por `buildTopicsTable(title, items)`.

As colunas sao definidas em `TOPIC_TABLE_COLUMNS`, fonte unica para tabela e Excel:

- Codigo
- Titulo
- Status
- Tipo
- Prioridade
- Atribuido a
- Criado em
- Vencimento
- Etiquetas
- Responsavel

`createdAt` e `dueDate` usam `formatTopicDate()` e a classe `.topic-date` para manter o mesmo estilo.

## 10. Ordenacao, Agrupamento e Concorrencia

`sortTopicsByDueDate(items)` ordena por vencimento e usa titulo como desempate.

`splitTopicsByCompletion(items)` separa em uma unica passada:

- topicos em andamento;
- topicos concluidos.

Status concluidos:

- `resolved`
- `done`
- `closed`

`topicsLoadRequestId` evita que uma resposta antiga sobrescreva a tela se o usuario trocar de projeto rapidamente.

## 11. Exportacao Excel

`exportTopicsToExcel()` gera SpreadsheetML no navegador e baixa:

```text
topicos-{projectId}-{yyyy-mm-dd}.xls
```

Abas:

- `Topicos em andamento`
- `Topicos concluidos`

A exportacao usa as mesmas colunas de `TOPIC_TABLE_COLUMNS`, incluindo `Criado em`.

## 12. Performance e Refatoracao

Melhorias aplicadas:

- `TOPIC_DATE_FORMATTER` reutiliza `Intl.DateTimeFormat`.
- `TOPIC_TABLE_COLUMNS` evita divergencia entre tabela e exportacao.
- `DocumentFragment` reduz operacoes diretas no DOM em projetos e topicos.
- `activeProjectButton` evita varrer a lista para alternar item ativo.
- `assigneeDirectoryCache` reduz chamadas repetidas de endpoints opcionais.
- `topicsLoadRequestId` protege contra corrida entre carregamentos.
- `frontendState` centraliza atualizacoes visuais e reduz estados estaticos.

## 13. Servidor Local

`server.js`:

- serve arquivos estaticos;
- expoe `GET /api/projects/:id/topics`;
- usa o mesmo `bcf-endpoints.js` do frontend;
- valida paths com `path.resolve`;
- retorna JSON com endpoint usado, topicos e payload bruto.

O frontend atual consulta os endpoints BCF diretamente; o servidor local e util para desenvolvimento ou proxy opcional.

## 14. Manutencao

Ao alterar colunas de topicos, atualize `TOPIC_TABLE_COLUMNS`; tabela e Excel acompanham automaticamente.

Ao alterar estados de conexao/token, confira:

- textos usados em `setConnectionState` e `setTokenState`;
- classes derivadas por `getStatusKey`;
- estilos `.status-chip-*`.

Ao alterar formato de payload BCF, priorize adicionar casos em:

- `normalizeTopicTextValue`;
- `normalizeTopicLabels`;
- `normalizeTopicAssignee`;
- `normalizeTopics`.

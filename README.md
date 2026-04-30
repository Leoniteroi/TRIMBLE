# TRIMBLE

Extensao web do Trimble Connect para listar projetos do usuario autenticado, consultar topicos BCF do projeto selecionado, exibir os topicos em tabela e exportar os dados para Excel.

## Visao Geral

O app e uma extensao front-end estatica, sem processo de build. Ele roda dentro do Trimble Connect for Browser e usa:

- Workspace API do Trimble Connect para conexao com o host e permissao `accesstoken`.
- APIs REST do Trimble Connect para projetos e perfil do usuario.
- Endpoints BCF do Trimble Connect para topicos.
- JavaScript vanilla para estado, normalizacao, renderizacao e exportacao.

## Funcionalidades

- Conecta a pagina ao container do Trimble Connect.
- Solicita e acompanha a permissao do token de acesso.
- Carrega o perfil do usuario autenticado.
- Lista projetos disponiveis para o usuario.
- Atualiza o painel esquerdo com o projeto selecionado no frontend.
- Busca topicos BCF do projeto selecionado.
- Normaliza campos de topicos vindos em formatos diferentes.
- Exibe topicos em andamento e concluidos em tabelas separadas.
- Mostra data de criacao e vencimento com o mesmo estilo visual.
- Mostra um pacote JSON de desenvolvimento com a listagem BCF bruta e o detalhe bruto de cada topico por `guid`.
- Exporta topicos para `.xls` com duas abas.
- Atualiza visualmente conexao, token, permissao, usuario e projeto selecionado.

## Stack

- HTML5
- CSS3
- JavaScript vanilla
- Workspace API do Trimble Connect carregada por CDN
- Google Fonts

Dependencias externas em tempo de execucao:

- `https://components.connect.trimble.com/trimble-connect-workspace-api/index.js`
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`

## Estrutura

- `index.html`: estrutura da UI e pontos de montagem.
- `styles.css`: layout, responsividade, tabela, badges e estados visuais.
- `script.js`: logica principal do frontend.
- `bcf-endpoints.js`: hosts e candidatos de endpoints BCF compartilhados.
- `server.js`: servidor local e proxy opcional para topicos BCF.
- `manifest.json`: manifesto da extensao.
- `README-extension.md`: resumo curto para uso da extensao.
- `DOCUMENTACAO-CODIGO.md`: documentacao tecnica detalhada.

## Fluxo Principal

1. A pagina carrega os assets e inicia `script.js`.
2. `renderFrontendState()` sincroniza o estado inicial da UI.
3. `initialize()` conecta a extensao ao Trimble Connect.
4. `loadCurrentProject()` tenta ler o projeto aberto no host.
5. `requestAccessToken()` solicita `accesstoken`.
6. Com token valido, `loadCurrentUserProfile()` carrega o usuario.
7. `loadProjects()` carrega e normaliza a lista de projetos.
8. O projeto selecionado atualiza o card do painel esquerdo.
9. `loadTopics(project)` busca topicos BCF.
10. Os topicos sao normalizados, ordenados, separados e renderizados.
11. O usuario pode exibir o JSON bruto enriquecido com `/topics/{guid}` ou exportar Excel.

## Estado do Frontend

O estado visual e centralizado em `frontendState`, que controla:

- conexao;
- token;
- permissao;
- nome e email do usuario;
- projeto selecionado;
- metadados do projeto.

Isso evita dados estaticos na interface. Os cards do painel esquerdo e do bloco de usuario sao atualizados pelo frontend conforme a conexao, token, perfil, projeto e topicos evoluem.

Estados visuais dos chips:

- `Conectado` / `Concedido`: sucesso.
- `Aguardando`, `Conectando`, `Pendente`, `Nao solicitado`: em andamento.
- `Indisponivel`, `Negado`, `Nao concedido`: erro ou permissao ausente.

## Projetos

O app chama:

```text
https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false
```

`normalizeProjects()` padroniza:

- `id`
- `name`
- `number`
- `location`
- `raw`

O card do painel esquerdo mostra o projeto selecionado na lista, nao apenas o projeto inicial do host. Os metadados exibidos podem incluir numero, ID e regiao.

## Token e Usuario

O token pode ser recebido por:

- retorno direto de `workspaceApi.extension.requestPermission("accesstoken")`;
- evento `extension.accessToken`.

`extractAccessToken()` aceita string e formatos comuns de objeto.

Com token valido, o app tenta carregar:

```text
https://app.connect.trimble.com/tc/api/2.0/users/me
```

Se o perfil nao retornar nome/email, a UI mostra mensagens de fallback coerentes com o estado do token.

## Topicos BCF

Hosts BCF conhecidos:

- `northamerica -> https://open11.connect.trimble.com`
- `europe -> https://open21.connect.trimble.com`
- `asiapacific -> https://open31.connect.trimble.com`
- `australia -> https://open32.connect.trimble.com`

Formatos tentados:

- BCF `3.0`: `/bcf/3.0/projects/{projectId}/topics`
- BCF `2.1`: `/bcf/2.1/projects/{projectId}/topics?top=500`

`fetchBcfTopics()` prioriza hosts pela regiao do projeto e tenta fallback entre hosts e versoes.

Quando os topicos carregam com sucesso, o painel `JSON selecionado` recebe um pacote de desenvolvimento:

- `projectId`: projeto consultado.
- `bcfEndpoint`: endpoint de listagem que respondeu.
- `rawTopicsList`: payload bruto de `/topics`.
- `rawTopicDetails`: pacote bruto por topico contendo `/topics/{guid}`, `/viewpoints`, `/comments` e `/events`, com URL e erro individual por recurso quando alguma consulta falhar.

Os dados normalizados sao usados apenas para tabela e exportacao.

## Campos Normalizados de Topicos

`normalizeTopics()` gera:

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

Normalizacoes auxiliares:

- `normalizeTopicTextValue()` transforma strings, numeros, booleanos, arrays e objetos em texto seguro.
- `normalizeTopicLabels()` aceita `labels`, `label`, `tags` e `tag`.
- `normalizeTopicAssignee()` trata responsaveis como string, objeto, lista, usuarios e grupos.
- `loadAssigneeDirectory()` tenta enriquecer responsaveis via endpoints opcionais de projeto, usuarios, grupos e membros.

## Tabela

As colunas sao centralizadas em `TOPIC_TABLE_COLUMNS` e usadas tanto na tabela quanto no Excel:

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

Os topicos sao ordenados por vencimento e separados em:

- `Topicos em andamento`
- `Topicos concluidos`

Status tratados como concluidos:

- `resolved`
- `done`
- `closed`

## Exportacao Excel

A exportacao e gerada no navegador em SpreadsheetML, sem biblioteca externa.

Nome do arquivo:

```text
topicos-{projectId}-{yyyy-mm-dd}.xls
```

Abas:

- `Topicos em andamento`
- `Topicos concluidos`

As colunas exportadas seguem `TOPIC_TABLE_COLUMNS`, incluindo `Criado em`.

## Performance e Robustez

Melhorias implementadas:

- `Intl.DateTimeFormat` reutilizado em `TOPIC_DATE_FORMATTER`.
- `TOPIC_TABLE_COLUMNS` evita divergencia entre tabela e Excel.
- `DocumentFragment` reduz atualizacoes diretas no DOM.
- `activeProjectButton` evita varrer todos os botoes ao trocar projeto.
- `assigneeDirectoryCache` evita chamadas repetidas para responsaveis do mesmo projeto.
- `topicsLoadRequestId` impede resposta antiga de sobrescrever a tela apos troca rapida de projeto.
- `frontendState` centraliza a UI e elimina dados visuais estaticos.

## Botoes

- `Atualizar dados`: recarrega projeto do host, token se necessario, usuario e projetos.
- `Exibir topicos`: alterna visibilidade das tabelas.
- `Exportar Excel`: baixa os topicos carregados.
- `Exibir JSON`: alterna visibilidade do pacote bruto BCF com listagem e detalhes por `guid`.

Os botoes dependentes de dados ficam desabilitados quando nao ha topicos ou JSON disponivel.

## Desenvolvimento Local

Abrir `index.html` diretamente nao reproduz o fluxo completo, porque a extensao depende do host do Trimble Connect.

Para testar o fluxo real:

1. Hospede os arquivos em HTTP/HTTPS.
2. Atualize `manifest.json` com a URL publica do `index.html`.
3. Instale o manifesto no Trimble Connect for Browser.
4. Abra a extensao dentro de um projeto.

O `server.js` pode servir arquivos localmente e expoe um proxy opcional:

```text
GET /api/projects/:id/topics
```

## Publicacao

1. Hospede os arquivos estaticos em HTTPS.
2. Atualize `manifest.json`.
3. Garanta que o host entregue os assets corretamente.
4. No Trimble Connect for Browser, abra `Project Settings -> Extensions`.
5. Adicione a URL publica do `manifest.json`.

## Tratamento de Erros

Cenarios tratados:

- Workspace API indisponivel.
- Projeto atual nao encontrado.
- Token pendente, negado ou ausente.
- Falha ao carregar perfil do usuario.
- Falha na API de projetos.
- Falha em todos os endpoints BCF.
- Tentativa de exportar sem topicos carregados.

Erros relevantes sao refletidos na mensagem de status e, quando util, no JSON selecionado.

## Limitacoes Atuais

- O frontend depende do ambiente do Trimble Connect para funcionar completamente.
- A exportacao usa `.xls` em XML, nao `.xlsx`.
- Nao ha filtros, busca textual, ordenacao manual ou paginacao.
- Nao ha suite de testes automatizados no repositorio.
- Os hosts BCF conhecidos estao mapeados no codigo e podem exigir manutencao se a Trimble alterar endpoints.

## Melhorias Recomendadas

- Adicionar filtros por status, prioridade, responsavel e vencimento.
- Exibir metadados extras na lista de projetos.
- Permitir exportacao em `.csv` ou `.xlsx`.
- Criar testes para normalizacao de projetos, topicos, labels, responsaveis e agrupamento.
- Adicionar diagnostico visual detalhado para falhas BCF por host/versao.

## Resumo Tecnico

Este repositorio contem uma extensao estatica do Trimble Connect. A maior parte do comportamento vive em `script.js`, com `bcf-endpoints.js` isolando regras de endpoints BCF. A UI e orientada por estado de frontend, os topicos sao normalizados antes de renderizar/exportar, e a tabela/Excel compartilham a mesma definicao de colunas.

# Documentação Técnica do Código — Extensão Trimble Connect

## 1. Visão geral
Este projeto implementa uma extensão web para o Trimble Connect, com foco em:
- autenticação via Workspace API;
- listagem de projetos do usuário autenticado;
- consulta de tópicos BCF (com fallback entre hosts e versões);
- exibição dos tópicos em tabela;
- exportação para Excel (`.xls`).

Arquivos principais:
- `index.html`: estrutura da interface.
- `styles.css`: estilos visuais.
- `script.js`: lógica principal de UI, integração e renderização.
- `bcf-endpoints.js`: módulo compartilhado de endpoints BCF (front + server).
- `server.js`: servidor HTTP local e proxy de tópicos BCF.
- `manifest.json`: manifesto da extensão.

---

## 2. Fluxo funcional
1. A página carrega `index.html`, `styles.css`, Workspace API, `bcf-endpoints.js` e `script.js`.
2. `initialize()` conecta a extensão ao host Trimble Connect.
3. A extensão tenta identificar o projeto atual (`loadCurrentProject`).
4. Solicita permissão de `accesstoken` (`requestAccessToken`).
5. Com token válido, carrega perfil do usuário (`loadCurrentUserProfile`) e projetos (`loadProjects`).
6. Ao selecionar um projeto, busca tópicos BCF (`loadTopics` + `fetchBcfTopics`).
7. Os tópicos são normalizados, separados por status e renderizados em tabela.
8. O usuário pode exibir JSON e exportar para Excel.

---

## 3. Estado da UI e feedback
O estado da UI é controlado por:
- `setConnectionState(state)`
- `setTokenState(state)`
- `permissionState` (texto no card de permissões)
- `setStatus(message, type)`

Cenários cobertos:
- Workspace API indisponível.
- Token pendente/negado/concedido.
- Token recebido por evento assíncrono da extensão.
- Falha ao carregar perfil.

---

## 4. Integração BCF (módulo compartilhado)
O arquivo `bcf-endpoints.js` centraliza:
- `TOPICS_REGION_HOSTS`
- `normalizeProjectLocation(location)`
- `prioritizeTopicHostsByProject(projectRaw)`
- `buildBcfTopicEndpointCandidates(projectId)`

Vantagem:
- elimina duplicação entre front-end e servidor;
- mantém as regras de fallback consistentes.

---

## 5. Tabela de tópicos
A tabela é construída dinamicamente por `buildTopicsTable()` e contém colunas:
- Código
- Título
- Status
- Tipo
- Prioridade
- Atribuído a
- **Criado em**
- Vencimento
- Etiquetas
- Responsável

A coluna **Criado em** usa `formatTopicDate(topic.createdAt)` e preserva os estilos existentes da tabela.

---

## 6. Normalização de dados
### Projetos
`normalizeProjects(payload)` padroniza os dados para:
- `id`, `name`, `number`, `location`, `raw`.

### Tópicos
`normalizeTopics(payload)` padroniza:
- `id`, `code`, `title`, `status`, `type`, `priority`,
- `dueDate`, `createdAt`, `labels`, `assignee`, `owner`, `createdBy`, `updatedAt`, `raw`.

Também existe enriquecimento de responsáveis via `loadAssigneeDirectory()`.

---

## 7. Exportação para Excel
`exportTopicsToExcel()` gera SpreadsheetML com duas abas:
- Tópicos em andamento
- Tópicos concluídos

Inclui as mesmas colunas da tabela, inclusive **Criado em**.

---

## 8. Servidor local
`server.js`:
- serve arquivos estáticos;
- expõe endpoint `/api/projects/:id/topics` para busca BCF;
- aplica validação canônica de path com `path.resolve`.

---

## 9. Manifesto
`manifest.json` define metadados da extensão, incluindo:
- título, ícone, descrição;
- URL de hospedagem (`https://www.sjtx.com.br/trimble/index.html`).

---

## 10. Checklist de manutenção
- manter `bcf-endpoints.js` como fonte única de regras BCF;
- validar mudanças de API Trimble/BCF antes de releases;
- manter mensagens de status alinhadas com fluxos reais de token;
- preservar consistência das colunas entre tabela e exportação.

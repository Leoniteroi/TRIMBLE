# Onde encontrar "Atribuído a" e "Seguidores" na API BCF

Este documento responde objetivamente onde esses dados aparecem na API do Trimble Connect Topics (BCF 2.1/3.0).

## 1) Campo **Atribuído a**

### BCF padrão (2.1 / 3.0)
No payload do tópico, o campo padrão é:

- `assigned_to` (string)

Também pode aparecer:

- `assigned_to_uuid` (UUID do usuário)

### Extensão Connect
No media type Connect (`application/vnd.trimble.connect.app+json`), pode vir também:

- `assignees` (array)
  - cada item contém pelo menos `id` e `type`

> Observação importante: no schema oficial da Topics API do Trimble, `assignees` é uma extensão Connect e **não substitui** automaticamente o comportamento do BCF puro.

## 2) Campo **Seguidores**

No OpenAPI público da Topics API (v2) **não existe** um campo padrão chamado `followers` para tópico.

- Em BCF padrão, esse conceito não é obrigatório no objeto `topic`.
- No OpenAPI do Trimble Connect Topics, não há propriedade documentada `followers` no schema principal de tópico.

Por isso, quando a interface mostra "Seguidores", normalmente isso vem de:

1. lógica interna da aplicação do Trimble Connect (camada de UI), e/ou
2. endpoint/propriedade proprietária fora do payload base de `GET /topics`.

## 3) Endpoints principais para investigar

- `GET /bcf/3.0/projects/{project_id}/topics`
- `GET /bcf/2.1/projects/{project_id}/topics`
- `GET /bcf/3.0/projects/{project_id}/topics/{topic_id}`
- `GET /bcf/2.1/projects/{project_id}/topics/{topic_id}`

Se "Seguidores" não vier nesses payloads, ele não está exposto no objeto de tópico padrão retornado por esses endpoints.

## 4) O que foi ajustado no front-end deste repositório

No `script.js`, a normalização do campo de atribuição agora considera:

- `assigned_to`
- `assignee`
- `assignees[]` (extensão Connect, com fallback para `name`, `display_name`, `email` ou `id`)

Quando `assignees[]` traz `type` (ex.: `USER`/`GROUP`) junto com `id`, a UI passa a exibir no formato:

- `USER: <id-ou-nome>`
- `GROUP: <id-ou-nome>`

Isso permite listar explicitamente usuários e grupos atribuídos mesmo quando o payload não traz nome amigável.

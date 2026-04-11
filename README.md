# Exemplo VB .NET — Trimble Connect (Projetos e Tópicos)

Aplicação de console em **VB .NET 8** para:

1. Autenticar com OAuth2 (client credentials).
2. Listar projetos no endpoint BCF Topics API.
3. Listar tópicos de cada projeto.

## Pré-requisitos

- .NET SDK 8+
- Credenciais de aplicação no Trimble Developer Portal:
  - `client_id`
  - `client_secret`
- Escopo OAuth autorizado para sua app (padrão no exemplo: `connect`)

## Variáveis de ambiente

Obrigatórias:

- `TRIMBLE_CLIENT_ID`
- `TRIMBLE_CLIENT_SECRET`

Opcionais (com default):

- `TRIMBLE_SCOPE` (default: `connect`)
- `TRIMBLE_TOKEN_URL` (default: `https://id.trimble.com/oauth/token`)
- `TRIMBLE_PROJECTS_URL` (default: `https://topics-api.connect.trimble.com/bcf/3.0/projects`)
- `TRIMBLE_TOPICS_URL_TEMPLATE` (default: `https://topics-api.connect.trimble.com/bcf/3.0/projects/{projectId}/topics`)

## Execução

```bash
dotnet run
```

## Observações

- O endpoint de projetos/tópicos pode variar por região/tenant/configuração da sua conta.
- Caso sua organização use URLs diferentes, ajuste pelas variáveis de ambiente opcionais.

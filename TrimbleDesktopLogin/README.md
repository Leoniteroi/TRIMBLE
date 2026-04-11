# Trimble Connect login em VB .NET

Este projeto implementa o fluxo oficial de autenticacao desktop do Trimble Connect usando OAuth 2.0 Authorization Code + PKCE.

## O que preencher

Defina estas variaveis de ambiente antes de executar:

- `TRIMBLE_CLIENT_ID`
- `TRIMBLE_CLIENT_NAME`
- `TRIMBLE_REDIRECT_URI`

Exemplo:

```powershell
$env:TRIMBLE_CLIENT_ID="seu-client-id"
$env:TRIMBLE_CLIENT_NAME="Seu Application Name"
$env:TRIMBLE_REDIRECT_URI="http://localhost:43821/callback/"
```

## Fluxo implementado

1. Abre `https://id.trimble.com/oauth/authorize`
2. Captura o callback local com `HttpListener`
3. Troca o `code` por `access_token` em `https://id.trimble.com/oauth/token`
4. Valida o login chamando `https://app.connect.trimble.com/tc/api/2.0/users/me`
5. Abre uma segunda tela e consulta `https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false`

## Referencias oficiais

- [Trimble Connect Get Started](https://developer.trimble.com/docs/connect/guides/access/)
- [Trimble Identity Authorization Code with PKCE](https://developer.trimble.com/docs/authentication/guides/authorization-code-pkce/)
- [Windows API](https://developer.trimble.com/docs/connect/tools/api/windows/)

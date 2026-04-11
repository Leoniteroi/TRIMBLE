Imports System.Diagnostics
Imports System.Net
Imports System.Net.Http
Imports System.Net.Http.Headers
Imports System.Security.Cryptography
Imports System.Text
Imports System.Text.Json

Public Class TrimbleAuthService
    Private Shared ReadOnly JsonOptions As New JsonSerializerOptions With {
        .PropertyNameCaseInsensitive = True
    }

    Private ReadOnly _httpClient As HttpClient
    Private ReadOnly _options As TrimbleAuthOptions

    Public Sub New()
        _httpClient = New HttpClient()
        _options = TrimbleAuthOptions.Load()
    End Sub

    Public Async Function AuthenticateAsync(loginHint As String) As Task(Of TrimbleAuthSession)
        _options.Validate()

        Dim pkce = PkcePair.Create()
        Dim state = GenerateState()
        Dim authorizeUrl = BuildAuthorizeUrl(loginHint, pkce.Challenge, state)
        Dim code = Await RequestAuthorizationCodeAsync(authorizeUrl, state)
        Dim token = Await ExchangeCodeForTokenAsync(code, pkce.Verifier)
        Dim profile = Await GetCurrentUserAsync(token.AccessToken)

        Return New TrimbleAuthSession With {
            .AccessToken = token.AccessToken,
            .RefreshToken = token.RefreshToken,
            .ExpiresIn = token.ExpiresIn,
            .UserProfile = profile
        }
    End Function

    Public Async Function GetProjectsAsync(accessToken As String) As Task(Of List(Of TrimbleProject))
        Dim endpoint = $"{_options.ConnectBaseUrl.TrimEnd("/"c)}/tc/api/2.0/projects?fullyLoaded=false"

        Using request = New HttpRequestMessage(HttpMethod.Get, endpoint)
            request.Headers.Authorization = New AuthenticationHeaderValue("Bearer", accessToken)

            Using response = Await _httpClient.SendAsync(request)
                Dim content = Await response.Content.ReadAsStringAsync()
                response.EnsureSuccessStatusCode()

                Return ParseProjects(content)
            End Using
        End Using
    End Function

    Private Async Function RequestAuthorizationCodeAsync(authorizeUrl As String, expectedState As String) As Task(Of String)
        Dim listenerPrefix = BuildListenerPrefix(_options.RedirectUri)

        Using listener As New HttpListener()
            listener.Prefixes.Add(listenerPrefix)
            listener.Start()

            Process.Start(New ProcessStartInfo With {
                .FileName = authorizeUrl,
                .UseShellExecute = True
            })

            Dim context = Await listener.GetContextAsync()
            Dim request = context.Request
            Dim response = context.Response

            Try
                Dim code = request.QueryString("code")
                Dim returnedState = request.QueryString("state")
                Dim [error] = request.QueryString("error")

                If Not String.IsNullOrWhiteSpace([error]) Then
                    Throw New InvalidOperationException($"Trimble Identity retornou o erro '{[error]}'.")
                End If

                If String.IsNullOrWhiteSpace(code) Then
                    Throw New InvalidOperationException("O callback do Trimble Identity nao retornou o parametro 'code'.")
                End If

                If Not String.Equals(expectedState, returnedState, StringComparison.Ordinal) Then
                    Throw New InvalidOperationException("O parametro state retornado pelo Trimble Identity nao corresponde ao esperado.")
                End If

                Await WriteBrowserResponseAsync(response, True, "Login realizado com sucesso. Voce pode fechar esta janela e voltar ao aplicativo.")
                Return code
            Catch ex As Exception
                WriteBrowserResponseAsync(response, False, "Nao foi possivel concluir o login. Volte ao aplicativo para ver os detalhes.").GetAwaiter().GetResult()
                Throw
            End Try
        End Using
    End Function

    Private Async Function ExchangeCodeForTokenAsync(code As String, codeVerifier As String) As Task(Of TrimbleTokenResponse)
        Dim tokenEndpoint = $"{_options.IdentityBaseUrl.TrimEnd("/"c)}/oauth/token"
        Dim body = New List(Of KeyValuePair(Of String, String)) From {
            New KeyValuePair(Of String, String)("grant_type", "authorization_code"),
            New KeyValuePair(Of String, String)("code", code),
            New KeyValuePair(Of String, String)("client_id", _options.ClientId),
            New KeyValuePair(Of String, String)("redirect_uri", _options.RedirectUri),
            New KeyValuePair(Of String, String)("code_verifier", codeVerifier)
        }

        Using request = New HttpRequestMessage(HttpMethod.Post, tokenEndpoint)
            request.Headers.Accept.Add(New MediaTypeWithQualityHeaderValue("application/json"))
            request.Content = New FormUrlEncodedContent(body)

            Using response = Await _httpClient.SendAsync(request)
                Dim content = Await response.Content.ReadAsStringAsync()
                response.EnsureSuccessStatusCode()

                Dim token = JsonSerializer.Deserialize(Of TrimbleTokenResponse)(content, JsonOptions)
                If token Is Nothing OrElse String.IsNullOrWhiteSpace(token.AccessToken) Then
                    Throw New InvalidOperationException("A resposta do endpoint /oauth/token nao trouxe um access_token valido.")
                End If

                Return token
            End Using
        End Using
    End Function

    Private Async Function GetCurrentUserAsync(accessToken As String) As Task(Of TrimbleUserProfile)
        Dim endpoint = $"{_options.ConnectBaseUrl.TrimEnd("/"c)}/tc/api/2.0/users/me"

        Using request = New HttpRequestMessage(HttpMethod.Get, endpoint)
            request.Headers.Authorization = New AuthenticationHeaderValue("Bearer", accessToken)

            Using response = Await _httpClient.SendAsync(request)
                Dim content = Await response.Content.ReadAsStringAsync()
                response.EnsureSuccessStatusCode()

                Return ParseUserProfile(content)
            End Using
        End Using
    End Function

    Private Function BuildAuthorizeUrl(loginHint As String, codeChallenge As String, state As String) As String
        Dim baseUrl = $"{_options.IdentityBaseUrl.TrimEnd("/"c)}/oauth/authorize"
        Dim parameters = New List(Of String) From {
            $"response_type={Uri.EscapeDataString("code")}",
            $"client_id={Uri.EscapeDataString(_options.ClientId)}",
            $"redirect_uri={Uri.EscapeDataString(_options.RedirectUri)}",
            $"scope={Uri.EscapeDataString(_options.BuildScope())}",
            $"code_challenge={Uri.EscapeDataString(codeChallenge)}",
            $"code_challenge_method={Uri.EscapeDataString("S256")}",
            $"state={Uri.EscapeDataString(state)}",
            $"prompt={Uri.EscapeDataString("login")}",
            $"ui_locales={Uri.EscapeDataString(_options.UiLocales)}"
        }

        If Not String.IsNullOrWhiteSpace(loginHint) Then
            parameters.Add($"login_hint={Uri.EscapeDataString(loginHint)}")
        End If

        Return $"{baseUrl}?{String.Join("&", parameters)}"
    End Function

    Private Shared Function ParseUserProfile(rawJson As String) As TrimbleUserProfile
        Using document = JsonDocument.Parse(rawJson)
            Dim root = document.RootElement

            Return New TrimbleUserProfile With {
                .Id = FirstString(root, "id", "userId", "identifier", "userid"),
                .Email = FirstString(root, "email", "mail", "userEmail"),
                .DisplayName = FirstString(root, "name", "displayName", "fullName", "given_name"),
                .RawJson = JsonSerializer.Serialize(root, New JsonSerializerOptions With {.WriteIndented = True})
            }
        End Using
    End Function

    Private Shared Function ParseProjects(rawJson As String) As List(Of TrimbleProject)
        Using document = JsonDocument.Parse(rawJson)
            Dim projects As New List(Of TrimbleProject)()
            Dim items = ResolveCollectionRoot(document.RootElement)

            For Each item In items
                projects.Add(New TrimbleProject With {
                    .Id = FirstString(item, "id", "projectId", "identifier"),
                    .Name = FirstString(item, "name", "projectName"),
                    .Number = FirstString(item, "number", "projectNumber", "externalId"),
                    .LastUpdated = FirstString(item, "lastUpdated", "modifiedOn", "updatedAt"),
                    .RawJson = JsonSerializer.Serialize(item, New JsonSerializerOptions With {.WriteIndented = True})
                })
            Next

            Return projects
        End Using
    End Function

    Private Shared Function ResolveCollectionRoot(root As JsonElement) As IEnumerable(Of JsonElement)
        If root.ValueKind = JsonValueKind.Array Then
            Return root.EnumerateArray().ToList()
        End If

        For Each propertyName In {"data", "items", "projects", "results"}
            Dim propertyValue As JsonElement
            If root.TryGetProperty(propertyName, propertyValue) AndAlso propertyValue.ValueKind = JsonValueKind.Array Then
                Return propertyValue.EnumerateArray().ToList()
            End If
        Next

        Return Enumerable.Empty(Of JsonElement)()
    End Function

    Private Shared Function FirstString(root As JsonElement, ParamArray propertyNames() As String) As String
        For Each propertyName In propertyNames
            Dim propertyValue As JsonElement
            If root.TryGetProperty(propertyName, propertyValue) Then
                If propertyValue.ValueKind = JsonValueKind.String Then
                    Return propertyValue.GetString()
                End If

                If propertyValue.ValueKind = JsonValueKind.Number Then
                    Return propertyValue.ToString()
                End If
            End If
        Next

        Return "(nao informado)"
    End Function

    Private Shared Async Function WriteBrowserResponseAsync(response As HttpListenerResponse, isSuccess As Boolean, message As String) As Task
        Dim background = If(isSuccess, "#0f8a4b", "#bf1e2e")
        Dim html =
$"<html><head><meta charset=""utf-8""><title>Trimble Connect</title></head>
<body style=""font-family:Segoe UI,Arial,sans-serif;padding:32px"">
<div style=""max-width:560px;margin:auto;border:1px solid #d8e0f0;border-radius:16px;padding:24px"">
<div style=""font-size:12px;font-weight:700;letter-spacing:0.1em;color:#5a6780"">TRIMBLE CONNECT</div>
<h1 style=""color:{background}"">{WebUtility.HtmlEncode(message)}</h1>
</div>
</body></html>"

        Dim buffer = Encoding.UTF8.GetBytes(html)
        response.ContentType = "text/html; charset=utf-8"
        response.ContentEncoding = Encoding.UTF8
        response.ContentLength64 = buffer.Length
        Await response.OutputStream.WriteAsync(buffer, 0, buffer.Length)
        response.Close()
    End Function

    Private Shared Function GenerateState() As String
        Dim randomBytes(31) As Byte
        RandomNumberGenerator.Fill(randomBytes)
        Return Base64UrlEncode(randomBytes)
    End Function

    Private Shared Function BuildListenerPrefix(redirectUri As String) As String
        Dim uri = New Uri(redirectUri)
        Dim path = If(uri.AbsolutePath.EndsWith("/", StringComparison.Ordinal), uri.AbsolutePath, $"{uri.AbsolutePath}/")
        Return $"{uri.Scheme}://{uri.Host}:{uri.Port}{path}"
    End Function

    Private Shared Function Base64UrlEncode(bytes As Byte()) As String
        Return Convert.ToBase64String(bytes).TrimEnd("="c).Replace("+"c, "-"c).Replace("/"c, "_"c)
    End Function

    Private NotInheritable Class PkcePair
        Public Property Verifier As String
        Public Property Challenge As String

        Public Shared Function Create() As PkcePair
            Dim verifierBytes(63) As Byte
            RandomNumberGenerator.Fill(verifierBytes)
            Dim verifier = Base64UrlEncode(verifierBytes)

            Using sha = SHA256.Create()
                Dim challengeBytes = sha.ComputeHash(Encoding.ASCII.GetBytes(verifier))
                Return New PkcePair With {
                    .Verifier = verifier,
                    .Challenge = Base64UrlEncode(challengeBytes)
                }
            End Using
        End Function
    End Class
End Class

Public Class TrimbleAuthOptions
    Public Property ClientId As String
    Public Property ClientName As String
    Public Property RedirectUri As String
    Public Property IdentityBaseUrl As String = "https://id.trimble.com"
    Public Property ConnectBaseUrl As String = "https://app.connect.trimble.com"
    Public Property UiLocales As String = "pt-BR"

    Public Shared Function Load() As TrimbleAuthOptions
        Return New TrimbleAuthOptions With {
            .ClientId = ReadSetting("TRIMBLE_CLIENT_ID", "SEU_CLIENT_ID_AQUI"),
            .ClientName = ReadSetting("TRIMBLE_CLIENT_NAME", "SEU_NOME_DE_APLICACAO_AQUI"),
            .RedirectUri = ReadSetting("TRIMBLE_REDIRECT_URI", "http://localhost:43821/callback/"),
            .UiLocales = ReadSetting("TRIMBLE_UI_LOCALES", "pt-BR")
        }
    End Function

    Public Sub Validate()
        If String.IsNullOrWhiteSpace(ClientId) OrElse ClientId = "SEU_CLIENT_ID_AQUI" Then
            Throw New InvalidOperationException("Configure a variavel TRIMBLE_CLIENT_ID com o client id fornecido pela Trimble.")
        End If

        If String.IsNullOrWhiteSpace(ClientName) OrElse ClientName = "SEU_NOME_DE_APLICACAO_AQUI" Then
            Throw New InvalidOperationException("Configure a variavel TRIMBLE_CLIENT_NAME com o Application Name cadastrado na Trimble.")
        End If

        If String.IsNullOrWhiteSpace(RedirectUri) Then
            Throw New InvalidOperationException("Configure a variavel TRIMBLE_REDIRECT_URI com uma callback local, por exemplo http://localhost:43821/callback/.")
        End If

        Dim redirect = New Uri(RedirectUri)
        If redirect.Scheme <> Uri.UriSchemeHttp Then
            Throw New InvalidOperationException("O exemplo desktop usa callback HTTP local para capturar o retorno OAuth. Use um RedirectUri http://localhost ou http://127.0.0.1.")
        End If
    End Sub

    Public Function BuildScope() As String
        Return $"openid {ClientName}"
    End Function

    Private Shared Function ReadSetting(name As String, fallback As String) As String
        Dim value = Environment.GetEnvironmentVariable(name)
        If String.IsNullOrWhiteSpace(value) Then
            Return fallback
        End If

        Return value.Trim()
    End Function
End Class

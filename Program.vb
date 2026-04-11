Imports System.Net.Http
Imports System.Net.Http.Headers
Imports System.Text.Json.Serialization
Imports System.Text
Imports System.Text.Json

Module Program
    Private ReadOnly JsonOptions As New JsonSerializerOptions With {
        .PropertyNameCaseInsensitive = True
    }

    Public Sub Main(args As String())
        Try
            Dim settings = AppSettings.FromEnvironment()
            ValidateSettings(settings)

            Using http As New HttpClient()
                Dim token = GetAccessTokenAsync(http, settings).GetAwaiter().GetResult()

                Console.WriteLine("Autenticação concluída com sucesso." & Environment.NewLine)

                Dim projects = GetProjectsAsync(http, settings, token).GetAwaiter().GetResult()
                If projects.Count = 0 Then
                    Console.WriteLine("Nenhum projeto encontrado para o usuário/escopo informado.")
                    Return
                End If

                Console.WriteLine($"Projetos encontrados: {projects.Count}" & Environment.NewLine)

                For Each project In projects
                    Console.WriteLine($"Projeto: {project.Name} ({project.ProjectId})")

                    Dim topics = GetTopicsAsync(http, settings, token, project.ProjectId).GetAwaiter().GetResult()
                    If topics.Count = 0 Then
                        Console.WriteLine("  - Sem tópicos.")
                    Else
                        For Each topic In topics
                            Console.WriteLine($"  - [{topic.TopicStatus}] {topic.Title} ({topic.Guid})")
                        Next
                    End If

                    Console.WriteLine()
                Next
            End Using
        Catch ex As Exception
            Console.Error.WriteLine("Falha ao consumir APIs do Trimble Connect:")
            Console.Error.WriteLine(ex.Message)
            Environment.ExitCode = 1
        End Try
    End Sub

    Private Function ValidateSettings(settings As AppSettings) As Boolean
        Dim missing As New List(Of String)()

        If String.IsNullOrWhiteSpace(settings.ClientId) Then missing.Add(NameOf(settings.ClientId))
        If String.IsNullOrWhiteSpace(settings.ClientSecret) Then missing.Add(NameOf(settings.ClientSecret))

        If missing.Count > 0 Then
            Throw New InvalidOperationException(
                "Variáveis obrigatórias ausentes: " & String.Join(", ", missing) & Environment.NewLine &
                "Defina TRIMBLE_CLIENT_ID e TRIMBLE_CLIENT_SECRET.")
        End If

        Return True
    End Function

    Private Async Function GetAccessTokenAsync(http As HttpClient, settings As AppSettings) As Task(Of String)
        Dim requestBody = New StringContent(
            $"grant_type=client_credentials&scope={Uri.EscapeDataString(settings.Scope)}",
            Encoding.UTF8,
            "application/x-www-form-urlencoded")

        Dim basic = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{settings.ClientId}:{settings.ClientSecret}"))
        http.DefaultRequestHeaders.Authorization = New AuthenticationHeaderValue("Basic", basic)

        Dim response = Await http.PostAsync(settings.TokenUrl, requestBody)
        Dim payload = Await response.Content.ReadAsStringAsync()

        If Not response.IsSuccessStatusCode Then
            Throw New HttpRequestException(
                $"Erro ao obter token ({CInt(response.StatusCode)}): {payload}")
        End If

        Dim tokenResponse = JsonSerializer.Deserialize(Of TokenResponse)(payload, JsonOptions)
        If tokenResponse Is Nothing OrElse String.IsNullOrWhiteSpace(tokenResponse.AccessToken) Then
            Throw New InvalidOperationException("Resposta de token inválida.")
        End If

        Return tokenResponse.AccessToken
    End Function

    Private Async Function GetProjectsAsync(http As HttpClient, settings As AppSettings, accessToken As String) As Task(Of List(Of BcfProject))
        Dim request = New HttpRequestMessage(HttpMethod.Get, settings.ProjectsUrl)
        request.Headers.Authorization = New AuthenticationHeaderValue("Bearer", accessToken)

        Dim response = Await http.SendAsync(request)
        Dim payload = Await response.Content.ReadAsStringAsync()

        If Not response.IsSuccessStatusCode Then
            Throw New HttpRequestException(
                $"Erro ao listar projetos ({CInt(response.StatusCode)}): {payload}")
        End If

        Dim projects = JsonSerializer.Deserialize(Of List(Of BcfProject))(payload, JsonOptions)
        Return If(projects, New List(Of BcfProject)())
    End Function

    Private Async Function GetTopicsAsync(http As HttpClient,
                                          settings As AppSettings,
                                          accessToken As String,
                                          projectId As String) As Task(Of List(Of BcfTopic))

        Dim endpoint = settings.TopicsUrlTemplate.Replace("{projectId}", Uri.EscapeDataString(projectId))

        Dim request = New HttpRequestMessage(HttpMethod.Get, endpoint)
        request.Headers.Authorization = New AuthenticationHeaderValue("Bearer", accessToken)

        Dim response = Await http.SendAsync(request)
        Dim payload = Await response.Content.ReadAsStringAsync()

        If Not response.IsSuccessStatusCode Then
            Throw New HttpRequestException(
                $"Erro ao listar tópicos do projeto {projectId} ({CInt(response.StatusCode)}): {payload}")
        End If

        Dim topics = JsonSerializer.Deserialize(Of List(Of BcfTopic))(payload, JsonOptions)
        Return If(topics, New List(Of BcfTopic)())
    End Function
End Module

Friend NotInheritable Class AppSettings
    Public Property ClientId As String = String.Empty
    Public Property ClientSecret As String = String.Empty
    Public Property Scope As String = "connect"
    Public Property TokenUrl As String = "https://id.trimble.com/oauth/token"
    Public Property ProjectsUrl As String = "https://topics-api.connect.trimble.com/bcf/3.0/projects"
    Public Property TopicsUrlTemplate As String = "https://topics-api.connect.trimble.com/bcf/3.0/projects/{projectId}/topics"

    Public Shared Function FromEnvironment() As AppSettings
        Return New AppSettings With {
            .ClientId = Env("TRIMBLE_CLIENT_ID"),
            .ClientSecret = Env("TRIMBLE_CLIENT_SECRET"),
            .Scope = EnvOrDefault("TRIMBLE_SCOPE", "connect"),
            .TokenUrl = EnvOrDefault("TRIMBLE_TOKEN_URL", "https://id.trimble.com/oauth/token"),
            .ProjectsUrl = EnvOrDefault("TRIMBLE_PROJECTS_URL", "https://topics-api.connect.trimble.com/bcf/3.0/projects"),
            .TopicsUrlTemplate = EnvOrDefault("TRIMBLE_TOPICS_URL_TEMPLATE", "https://topics-api.connect.trimble.com/bcf/3.0/projects/{projectId}/topics")
        }
    End Function

    Private Shared Function Env(name As String) As String
        Return If(Environment.GetEnvironmentVariable(name), String.Empty)
    End Function

    Private Shared Function EnvOrDefault(name As String, fallback As String) As String
        Dim value = Environment.GetEnvironmentVariable(name)
        Return If(String.IsNullOrWhiteSpace(value), fallback, value)
    End Function
End Class

Friend Class TokenResponse
    <JsonPropertyName("access_token")>
    Public Property AccessToken As String = String.Empty
End Class

Friend Class BcfProject
    <JsonPropertyName("project_id")>
    Public Property ProjectId As String = String.Empty

    <JsonPropertyName("name")>
    Public Property Name As String = String.Empty
End Class

Friend Class BcfTopic
    <JsonPropertyName("guid")>
    Public Property Guid As String = String.Empty

    <JsonPropertyName("title")>
    Public Property Title As String = String.Empty

    <JsonPropertyName("topic_status")>
    Public Property TopicStatus As String = String.Empty
End Class

Public Class ProjectsForm
    Private ReadOnly _authService As TrimbleAuthService
    Private ReadOnly _session As TrimbleAuthSession
    Private ReadOnly _projects As New List(Of TrimbleProject)()

    Public Sub New(authService As TrimbleAuthService, session As TrimbleAuthSession)
        InitializeComponent()
        _authService = authService
        _session = session
    End Sub

    Private Async Sub ProjectsForm_Shown(sender As Object, e As EventArgs) Handles Me.Shown
        lblSubtitle.Text = $"Usuario autenticado: {_session.UserProfile.DisplayName} ({_session.UserProfile.Email})"
        Await LoadProjectsAsync()
    End Sub

    Private Async Function LoadProjectsAsync() As Task
        Try
            lblStatus.Text = "Consultando projetos do usuario na API do Trimble Connect..."
            dgvProjects.Rows.Clear()
            txtProjectJson.Text = String.Empty

            Dim projects = Await _authService.GetProjectsAsync(_session.AccessToken)
            _projects.Clear()
            _projects.AddRange(projects)

            For Each project In projects
                dgvProjects.Rows.Add(project.Name, project.Number, project.Id, project.LastUpdated)
            Next

            lblStatus.Text = $"{projects.Count} projeto(s) encontrado(s)."

            If projects.Count > 0 Then
                dgvProjects.Rows(0).Selected = True
                txtProjectJson.Text = projects(0).RawJson
            Else
                txtProjectJson.Text = "Nenhum projeto retornado pela API para este usuario."
            End If
        Catch ex As Exception
            lblStatus.ForeColor = Color.Firebrick
            lblStatus.Text = $"Falha ao carregar projetos: {ex.Message}"
        End Try
    End Function

    Private Sub dgvProjects_SelectionChanged(sender As Object, e As EventArgs) Handles dgvProjects.SelectionChanged
        If dgvProjects.SelectedRows.Count = 0 Then
            Return
        End If

        Dim index = dgvProjects.SelectedRows(0).Index
        If index >= 0 AndAlso index < _projects.Count Then
            txtProjectJson.Text = _projects(index).RawJson
        End If
    End Sub
End Class

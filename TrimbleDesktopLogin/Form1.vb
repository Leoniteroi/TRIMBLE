Public Class Form1
    Private ReadOnly _authService As New TrimbleAuthService()

    Private Async Sub btnLogin_Click(sender As Object, e As EventArgs) Handles btnLogin.Click
        Dim email = txtEmail.Text.Trim()

        btnLogin.Enabled = False
        txtUserDetails.Text = String.Empty
        UpdateStatus("Abrindo o navegador para autenticar no Trimble ID...", False)

        Try
            Dim session = Await _authService.AuthenticateAsync(email)
            Dim summary =
$"Display name: {session.UserProfile.DisplayName}
Email: {session.UserProfile.Email}
Id: {session.UserProfile.Id}
Expira em: {session.ExpiresIn} segundos

JSON bruto:
{session.UserProfile.RawJson}"

            txtUserDetails.Text = summary
            UpdateStatus($"Login concluido com sucesso para {session.UserProfile.Email}.", False)

            Using projectsForm As New ProjectsForm(_authService, session)
                Hide()
                projectsForm.ShowDialog(Me)
                Show()
            End Using
        Catch ex As InvalidOperationException
            UpdateStatus(ex.Message, True)
        Catch ex As Exception
            UpdateStatus($"Falha ao autenticar no Trimble Connect: {ex.Message}", True)
        Finally
            btnLogin.Enabled = True
        End Try
    End Sub

    Private Sub UpdateStatus(message As String, isError As Boolean)
        lblStatus.ForeColor = If(isError, Color.Firebrick, Color.FromArgb(8, 72, 191))
        lblStatus.Text = message
    End Sub
End Class

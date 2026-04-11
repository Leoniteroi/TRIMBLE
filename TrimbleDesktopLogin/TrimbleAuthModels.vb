Imports System.Text.Json.Serialization

Public Class TrimbleTokenResponse
    <JsonPropertyName("access_token")>
    Public Property AccessToken As String

    <JsonPropertyName("refresh_token")>
    Public Property RefreshToken As String

    <JsonPropertyName("expires_in")>
    Public Property ExpiresIn As Integer

    <JsonPropertyName("id_token")>
    Public Property IdToken As String
End Class

Public Class TrimbleAuthSession
    Public Property AccessToken As String
    Public Property RefreshToken As String
    Public Property ExpiresIn As Integer
    Public Property UserProfile As TrimbleUserProfile
End Class

Public Class TrimbleProject
    Public Property Id As String
    Public Property Name As String
    Public Property Number As String
    Public Property LastUpdated As String
    Public Property RawJson As String
End Class

Public Class TrimbleUserProfile
    Public Property Id As String
    Public Property Email As String
    Public Property DisplayName As String
    Public Property RawJson As String
End Class

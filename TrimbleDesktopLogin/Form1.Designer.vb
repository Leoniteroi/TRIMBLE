<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class Form1
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()>
    Protected Overrides Sub Dispose(disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        Me.pnlBrand = New System.Windows.Forms.Panel()
        Me.lblBrandDescription = New System.Windows.Forms.Label()
        Me.lblBrandTitle = New System.Windows.Forms.Label()
        Me.lblBrandTag = New System.Windows.Forms.Label()
        Me.pnlLogin = New System.Windows.Forms.Panel()
        Me.txtUserDetails = New System.Windows.Forms.TextBox()
        Me.lblJson = New System.Windows.Forms.Label()
        Me.lblStatus = New System.Windows.Forms.Label()
        Me.btnLogin = New System.Windows.Forms.Button()
        Me.txtEmail = New System.Windows.Forms.TextBox()
        Me.lblEmail = New System.Windows.Forms.Label()
        Me.lblHelper = New System.Windows.Forms.Label()
        Me.lblLoginTitle = New System.Windows.Forms.Label()
        Me.pnlBrand.SuspendLayout()
        Me.pnlLogin.SuspendLayout()
        Me.SuspendLayout()
        '
        'pnlBrand
        '
        Me.pnlBrand.BackColor = System.Drawing.Color.FromArgb(CType(CType(15, Byte), Integer), CType(CType(23, Byte), Integer), CType(CType(42, Byte), Integer))
        Me.pnlBrand.Controls.Add(Me.lblBrandDescription)
        Me.pnlBrand.Controls.Add(Me.lblBrandTitle)
        Me.pnlBrand.Controls.Add(Me.lblBrandTag)
        Me.pnlBrand.Dock = System.Windows.Forms.DockStyle.Left
        Me.pnlBrand.Location = New System.Drawing.Point(0, 0)
        Me.pnlBrand.Name = "pnlBrand"
        Me.pnlBrand.Padding = New System.Windows.Forms.Padding(36)
        Me.pnlBrand.Size = New System.Drawing.Size(360, 561)
        Me.pnlBrand.TabIndex = 0
        '
        'lblBrandDescription
        '
        Me.lblBrandDescription.ForeColor = System.Drawing.Color.FromArgb(CType(CType(223, Byte), Integer), CType(CType(231, Byte), Integer), CType(CType(250, Byte), Integer))
        Me.lblBrandDescription.Location = New System.Drawing.Point(39, 180)
        Me.lblBrandDescription.Name = "lblBrandDescription"
        Me.lblBrandDescription.Size = New System.Drawing.Size(274, 127)
        Me.lblBrandDescription.TabIndex = 2
        Me.lblBrandDescription.Text = "Autentique com Trimble ID para obter um access token OAuth e consumir a API do T" &
    "rimble Connect a partir do aplicativo Windows em VB .NET."
        '
        'lblBrandTitle
        '
        Me.lblBrandTitle.Font = New System.Drawing.Font("Segoe UI Semibold", 20.25!, System.Drawing.FontStyle.Bold)
        Me.lblBrandTitle.ForeColor = System.Drawing.Color.White
        Me.lblBrandTitle.Location = New System.Drawing.Point(37, 89)
        Me.lblBrandTitle.Name = "lblBrandTitle"
        Me.lblBrandTitle.Size = New System.Drawing.Size(285, 82)
        Me.lblBrandTitle.TabIndex = 1
        Me.lblBrandTitle.Text = "Entrar no Trimble Connect com PKCE"
        '
        'lblBrandTag
        '
        Me.lblBrandTag.AutoSize = True
        Me.lblBrandTag.Font = New System.Drawing.Font("Segoe UI", 9.0!, System.Drawing.FontStyle.Bold)
        Me.lblBrandTag.ForeColor = System.Drawing.Color.FromArgb(CType(CType(133, Byte), Integer), CType(CType(170, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.lblBrandTag.Location = New System.Drawing.Point(40, 52)
        Me.lblBrandTag.Name = "lblBrandTag"
        Me.lblBrandTag.Size = New System.Drawing.Size(114, 15)
        Me.lblBrandTag.TabIndex = 0
        Me.lblBrandTag.Text = "TRIMBLE CONNECT"
        '
        'pnlLogin
        '
        Me.pnlLogin.BackColor = System.Drawing.Color.White
        Me.pnlLogin.Controls.Add(Me.txtUserDetails)
        Me.pnlLogin.Controls.Add(Me.lblJson)
        Me.pnlLogin.Controls.Add(Me.lblStatus)
        Me.pnlLogin.Controls.Add(Me.btnLogin)
        Me.pnlLogin.Controls.Add(Me.txtEmail)
        Me.pnlLogin.Controls.Add(Me.lblEmail)
        Me.pnlLogin.Controls.Add(Me.lblHelper)
        Me.pnlLogin.Controls.Add(Me.lblLoginTitle)
        Me.pnlLogin.Dock = System.Windows.Forms.DockStyle.Fill
        Me.pnlLogin.Location = New System.Drawing.Point(360, 0)
        Me.pnlLogin.Name = "pnlLogin"
        Me.pnlLogin.Padding = New System.Windows.Forms.Padding(40)
        Me.pnlLogin.Size = New System.Drawing.Size(524, 561)
        Me.pnlLogin.TabIndex = 1
        '
        'txtUserDetails
        '
        Me.txtUserDetails.BackColor = System.Drawing.Color.FromArgb(CType(CType(246, Byte), Integer), CType(CType(248, Byte), Integer), CType(CType(252, Byte), Integer))
        Me.txtUserDetails.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtUserDetails.Font = New System.Drawing.Font("Consolas", 9.0!)
        Me.txtUserDetails.Location = New System.Drawing.Point(44, 273)
        Me.txtUserDetails.Multiline = True
        Me.txtUserDetails.Name = "txtUserDetails"
        Me.txtUserDetails.ReadOnly = True
        Me.txtUserDetails.ScrollBars = System.Windows.Forms.ScrollBars.Vertical
        Me.txtUserDetails.Size = New System.Drawing.Size(437, 228)
        Me.txtUserDetails.TabIndex = 7
        '
        'lblJson
        '
        Me.lblJson.AutoSize = True
        Me.lblJson.Font = New System.Drawing.Font("Segoe UI", 9.0!, System.Drawing.FontStyle.Bold)
        Me.lblJson.Location = New System.Drawing.Point(41, 249)
        Me.lblJson.Name = "lblJson"
        Me.lblJson.Size = New System.Drawing.Size(164, 15)
        Me.lblJson.TabIndex = 6
        Me.lblJson.Text = "Resposta da API /users/me"
        '
        'lblStatus
        '
        Me.lblStatus.ForeColor = System.Drawing.Color.FromArgb(CType(CType(8, Byte), Integer), CType(CType(72, Byte), Integer), CType(CType(191, Byte), Integer))
        Me.lblStatus.Location = New System.Drawing.Point(42, 201)
        Me.lblStatus.Name = "lblStatus"
        Me.lblStatus.Size = New System.Drawing.Size(439, 36)
        Me.lblStatus.TabIndex = 5
        Me.lblStatus.Text = "Preencha o e-mail opcionalmente para enviar como login_hint ao Trimble ID."
        '
        'btnLogin
        '
        Me.btnLogin.BackColor = System.Drawing.Color.FromArgb(CType(CType(11, Byte), Integer), CType(CType(95, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.btnLogin.FlatAppearance.BorderSize = 0
        Me.btnLogin.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.btnLogin.Font = New System.Drawing.Font("Segoe UI Semibold", 10.0!, System.Drawing.FontStyle.Bold)
        Me.btnLogin.ForeColor = System.Drawing.Color.White
        Me.btnLogin.Location = New System.Drawing.Point(44, 145)
        Me.btnLogin.Name = "btnLogin"
        Me.btnLogin.Size = New System.Drawing.Size(233, 38)
        Me.btnLogin.TabIndex = 4
        Me.btnLogin.Text = "Entrar com Trimble ID"
        Me.btnLogin.UseVisualStyleBackColor = False
        '
        'txtEmail
        '
        Me.txtEmail.Location = New System.Drawing.Point(44, 104)
        Me.txtEmail.Name = "txtEmail"
        Me.txtEmail.PlaceholderText = "nome@empresa.com"
        Me.txtEmail.Size = New System.Drawing.Size(332, 23)
        Me.txtEmail.TabIndex = 3
        '
        'lblEmail
        '
        Me.lblEmail.AutoSize = True
        Me.lblEmail.Font = New System.Drawing.Font("Segoe UI", 9.0!, System.Drawing.FontStyle.Bold)
        Me.lblEmail.Location = New System.Drawing.Point(41, 83)
        Me.lblEmail.Name = "lblEmail"
        Me.lblEmail.Size = New System.Drawing.Size(164, 15)
        Me.lblEmail.TabIndex = 2
        Me.lblEmail.Text = "E-mail corporativo opcional"
        '
        'lblHelper
        '
        Me.lblHelper.ForeColor = System.Drawing.Color.FromArgb(CType(CType(90, Byte), Integer), CType(CType(103, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.lblHelper.Location = New System.Drawing.Point(42, 47)
        Me.lblHelper.Name = "lblHelper"
        Me.lblHelper.Size = New System.Drawing.Size(439, 29)
        Me.lblHelper.TabIndex = 1
        Me.lblHelper.Text = "O login real acontece no navegador usando OAuth 2.0 Authorization Code + PKCE, c" &
    "omo recomendado pela Trimble."
        '
        'lblLoginTitle
        '
        Me.lblLoginTitle.AutoSize = True
        Me.lblLoginTitle.Font = New System.Drawing.Font("Segoe UI Semibold", 18.0!, System.Drawing.FontStyle.Bold)
        Me.lblLoginTitle.Location = New System.Drawing.Point(38, 12)
        Me.lblLoginTitle.Name = "lblLoginTitle"
        Me.lblLoginTitle.Size = New System.Drawing.Size(172, 32)
        Me.lblLoginTitle.TabIndex = 0
        Me.lblLoginTitle.Text = "Autenticação"
        '
        'Form1
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(7.0!, 15.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.BackColor = System.Drawing.Color.White
        Me.ClientSize = New System.Drawing.Size(884, 561)
        Me.Controls.Add(Me.pnlLogin)
        Me.Controls.Add(Me.pnlBrand)
        Me.MinimumSize = New System.Drawing.Size(900, 600)
        Me.Name = "Form1"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Trimble Connect Login"
        Me.pnlBrand.ResumeLayout(False)
        Me.pnlBrand.PerformLayout()
        Me.pnlLogin.ResumeLayout(False)
        Me.pnlLogin.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

    Friend WithEvents pnlBrand As Panel
    Friend WithEvents lblBrandDescription As Label
    Friend WithEvents lblBrandTitle As Label
    Friend WithEvents lblBrandTag As Label
    Friend WithEvents pnlLogin As Panel
    Friend WithEvents txtUserDetails As TextBox
    Friend WithEvents lblJson As Label
    Friend WithEvents lblStatus As Label
    Friend WithEvents btnLogin As Button
    Friend WithEvents txtEmail As TextBox
    Friend WithEvents lblEmail As Label
    Friend WithEvents lblHelper As Label
    Friend WithEvents lblLoginTitle As Label
End Class

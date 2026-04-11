<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class ProjectsForm
    Inherits System.Windows.Forms.Form

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

    Private components As System.ComponentModel.IContainer

    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        Me.lblTitle = New System.Windows.Forms.Label()
        Me.lblSubtitle = New System.Windows.Forms.Label()
        Me.dgvProjects = New System.Windows.Forms.DataGridView()
        Me.colName = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.colNumber = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.colId = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.colLastUpdated = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.txtProjectJson = New System.Windows.Forms.TextBox()
        Me.lblDetails = New System.Windows.Forms.Label()
        Me.lblStatus = New System.Windows.Forms.Label()
        CType(Me.dgvProjects,System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'lblTitle
        '
        Me.lblTitle.AutoSize = True
        Me.lblTitle.Font = New System.Drawing.Font("Segoe UI Semibold", 18.0!, System.Drawing.FontStyle.Bold)
        Me.lblTitle.Location = New System.Drawing.Point(20, 18)
        Me.lblTitle.Name = "lblTitle"
        Me.lblTitle.Size = New System.Drawing.Size(215, 32)
        Me.lblTitle.TabIndex = 0
        Me.lblTitle.Text = "Projetos do usuario"
        '
        'lblSubtitle
        '
        Me.lblSubtitle.AutoSize = True
        Me.lblSubtitle.ForeColor = System.Drawing.Color.FromArgb(CType(CType(90, Byte), Integer), CType(CType(103, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.lblSubtitle.Location = New System.Drawing.Point(23, 58)
        Me.lblSubtitle.Name = "lblSubtitle"
        Me.lblSubtitle.Size = New System.Drawing.Size(308, 15)
        Me.lblSubtitle.TabIndex = 1
        Me.lblSubtitle.Text = "Listagem carregada a partir de /tc/api/2.0/projects."
        '
        'dgvProjects
        '
        Me.dgvProjects.AllowUserToAddRows = False
        Me.dgvProjects.AllowUserToDeleteRows = False
        Me.dgvProjects.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.dgvProjects.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill
        Me.dgvProjects.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.dgvProjects.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.colName, Me.colNumber, Me.colId, Me.colLastUpdated})
        Me.dgvProjects.Location = New System.Drawing.Point(24, 90)
        Me.dgvProjects.MultiSelect = False
        Me.dgvProjects.Name = "dgvProjects"
        Me.dgvProjects.ReadOnly = True
        Me.dgvProjects.RowHeadersVisible = False
        Me.dgvProjects.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect
        Me.dgvProjects.Size = New System.Drawing.Size(798, 256)
        Me.dgvProjects.TabIndex = 2
        '
        'colName
        '
        Me.colName.HeaderText = "Nome"
        Me.colName.Name = "colName"
        Me.colName.ReadOnly = True
        '
        'colNumber
        '
        Me.colNumber.HeaderText = "Numero"
        Me.colNumber.Name = "colNumber"
        Me.colNumber.ReadOnly = True
        '
        'colId
        '
        Me.colId.HeaderText = "Id"
        Me.colId.Name = "colId"
        Me.colId.ReadOnly = True
        '
        'colLastUpdated
        '
        Me.colLastUpdated.HeaderText = "Ultima atualizacao"
        Me.colLastUpdated.Name = "colLastUpdated"
        Me.colLastUpdated.ReadOnly = True
        '
        'txtProjectJson
        '
        Me.txtProjectJson.Anchor = CType((((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right)), System.Windows.Forms.AnchorStyles)
        Me.txtProjectJson.BackColor = System.Drawing.Color.FromArgb(CType(CType(246, Byte), Integer), CType(CType(248, Byte), Integer), CType(CType(252, Byte), Integer))
        Me.txtProjectJson.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtProjectJson.Font = New System.Drawing.Font("Consolas", 9.0!)
        Me.txtProjectJson.Location = New System.Drawing.Point(24, 382)
        Me.txtProjectJson.Multiline = True
        Me.txtProjectJson.Name = "txtProjectJson"
        Me.txtProjectJson.ReadOnly = True
        Me.txtProjectJson.ScrollBars = System.Windows.Forms.ScrollBars.Vertical
        Me.txtProjectJson.Size = New System.Drawing.Size(798, 157)
        Me.txtProjectJson.TabIndex = 3
        '
        'lblDetails
        '
        Me.lblDetails.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.lblDetails.AutoSize = True
        Me.lblDetails.Font = New System.Drawing.Font("Segoe UI", 9.0!, System.Drawing.FontStyle.Bold)
        Me.lblDetails.Location = New System.Drawing.Point(21, 360)
        Me.lblDetails.Name = "lblDetails"
        Me.lblDetails.Size = New System.Drawing.Size(139, 15)
        Me.lblDetails.TabIndex = 4
        Me.lblDetails.Text = "Projeto selecionado JSON"
        '
        'lblStatus
        '
        Me.lblStatus.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.lblStatus.AutoSize = True
        Me.lblStatus.ForeColor = System.Drawing.Color.FromArgb(CType(CType(8, Byte), Integer), CType(CType(72, Byte), Integer), CType(CType(191, Byte), Integer))
        Me.lblStatus.Location = New System.Drawing.Point(24, 551)
        Me.lblStatus.Name = "lblStatus"
        Me.lblStatus.Size = New System.Drawing.Size(106, 15)
        Me.lblStatus.TabIndex = 5
        Me.lblStatus.Text = "Carregando dados..."
        '
        'ProjectsForm
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(7.0!, 15.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(848, 581)
        Me.Controls.Add(Me.lblStatus)
        Me.Controls.Add(Me.lblDetails)
        Me.Controls.Add(Me.txtProjectJson)
        Me.Controls.Add(Me.dgvProjects)
        Me.Controls.Add(Me.lblSubtitle)
        Me.Controls.Add(Me.lblTitle)
        Me.MinimumSize = New System.Drawing.Size(864, 620)
        Me.Name = "ProjectsForm"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent
        Me.Text = "Projetos Trimble Connect"
        CType(Me.dgvProjects,System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

    Friend WithEvents lblTitle As Label
    Friend WithEvents lblSubtitle As Label
    Friend WithEvents dgvProjects As DataGridView
    Friend WithEvents txtProjectJson As TextBox
    Friend WithEvents lblDetails As Label
    Friend WithEvents lblStatus As Label
    Friend WithEvents colName As DataGridViewTextBoxColumn
    Friend WithEvents colNumber As DataGridViewTextBoxColumn
    Friend WithEvents colId As DataGridViewTextBoxColumn
    Friend WithEvents colLastUpdated As DataGridViewTextBoxColumn
End Class

# Inicializador de bots (usado pelo "Iniciar bot.bat").
# Procura no PC as pastas de bot, mostra qual é a mais nova e a mais antiga, liga o bot escolhido
# e ajuda a mandar cópias velhas para a Lixeira. Não precisa digitar comandos.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic
[System.Windows.Forms.Application]::EnableVisualStyles()

$titulo = 'Inicializador de bots'
$pastaCache = Join-Path $env:APPDATA 'InicializadorBots'
$arquivoCache = Join-Path $pastaCache 'bots.json'
$fmt = 'dd/MM/yyyy HH:mm'
$PULAR = @('node_modules', '.git', 'windows', 'program files', 'program files (x86)', 'programdata', 'appdata', '$recycle.bin',
  'system volume information', 'recovery', 'msocache', 'perflogs', 'data', 'data-backup', '.cache', '.npm', 'steamapps', 'windowsapps')

function Aviso([string]$texto, [string]$icone = 'Information') {
  [void][System.Windows.Forms.MessageBox]::Show($texto, $titulo, 'OK', $icone)
}
function Pergunta([string]$texto, [string]$icone = 'Question') {
  return ([System.Windows.Forms.MessageBox]::Show($texto, $titulo, 'YesNo', $icone) -eq [System.Windows.Forms.DialogResult]::Yes)
}

# ---------------- reconhecer um bot ----------------
function EhBot([string]$pasta) {
  return (Test-Path -LiteralPath (Join-Path $pasta 'index.js')) -and
         (Test-Path -LiteralPath (Join-Path $pasta 'config.json')) -and
         (Test-Path -LiteralPath (Join-Path $pasta 'src\core\nucleo.js'))
}

function InfoBot([string]$pasta) {
  $nome = '(sem nome)'
  try { $nome = (Get-Content -LiteralPath (Join-Path $pasta 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json).nome } catch {}
  $versao = (Get-Item -LiteralPath (Join-Path $pasta 'index.js')).LastWriteTime
  $dados = @(Get-ChildItem -LiteralPath (Join-Path $pasta 'data') -Filter '*.json' -File -ErrorAction SilentlyContinue)
  $atividade = $null
  if ($dados.Count -gt 0) { $atividade = ($dados | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime }
  $token = $false
  $arqEnv = Join-Path $pasta '.env'
  if (Test-Path -LiteralPath $arqEnv) { $token = [bool](Select-String -LiteralPath $arqEnv -Pattern '^\s*DISCORD_TOKEN\s*=\s*\S+' -Quiet) }
  return [pscustomobject]@{ Nome = $nome; Pasta = $pasta; Versao = $versao; Atividade = $atividade; Dados = $dados.Count; Token = $token; Situacao = '' }
}

# ---------------- procurar no PC ----------------
function Procurar($rotulo) {
  $achados = New-Object System.Collections.Generic.List[string]
  $fila = New-Object System.Collections.Generic.Queue[object]
  # primeiro as pastas do usuário (fundo), depois a raiz de cada disco (mais raso)
  $fila.Enqueue(@($env:USERPROFILE, 7))
  foreach ($d in [System.IO.DriveInfo]::GetDrives()) {
    if ($d.DriveType -eq 'Fixed' -and $d.IsReady) { $fila.Enqueue(@($d.RootDirectory.FullName, 5)) }
  }
  $vistas = @{}
  $n = 0
  while ($fila.Count -gt 0) {
    $item = $fila.Dequeue()
    $pasta = [string]$item[0]
    $fundo = [int]$item[1]
    $chave = $pasta.ToLowerInvariant().TrimEnd('\')
    if ($vistas.ContainsKey($chave)) { continue }
    $vistas[$chave] = $true
    $n++
    if ($n % 200 -eq 0) {
      $rotulo.Text = "Procurando... $pasta"
      [System.Windows.Forms.Application]::DoEvents()
    }
    if (EhBot $pasta) { $achados.Add($pasta); continue }
    if ($fundo -le 0) { continue }
    try {
      foreach ($sub in [System.IO.Directory]::EnumerateDirectories($pasta)) {
        $nomeSub = [System.IO.Path]::GetFileName($sub).ToLowerInvariant()
        if ($PULAR -contains $nomeSub -or $nomeSub.StartsWith('data-backup')) { continue }
        $attr = [System.IO.File]::GetAttributes($sub)
        if ($attr -band [System.IO.FileAttributes]::ReparsePoint) { continue }
        $fila.Enqueue(@($sub, ($fundo - 1)))
      }
    } catch {}
  }
  return $achados
}

function SalvarCache($pastas) {
  if (-not (Test-Path -LiteralPath $pastaCache)) { New-Item -ItemType Directory -Path $pastaCache | Out-Null }
  ConvertTo-Json -InputObject @($pastas) | Set-Content -LiteralPath $arquivoCache -Encoding UTF8
}
function LerCache {
  if (-not (Test-Path -LiteralPath $arquivoCache)) { return @() }
  try { return @((Get-Content -LiteralPath $arquivoCache -Raw -Encoding UTF8 | ConvertFrom-Json) | Where-Object { $_ -and (EhBot $_) }) } catch { return @() }
}

# marca o mais novo e o mais antigo entre cópias do mesmo bot (mesmo nome)
function MarcarSituacao($bots) {
  foreach ($grupo in ($bots | Group-Object Nome)) {
    if ($grupo.Count -lt 2) { continue }
    $ordem = @($grupo.Group | Sort-Object Versao -Descending)
    $ordem[0].Situacao = 'mais novo'
    for ($k = 1; $k -lt $ordem.Count; $k++) { $ordem[$k].Situacao = 'mais antigo' }
    if ($ordem.Count -gt 2) { for ($k = 1; $k -lt $ordem.Count - 1; $k++) { $ordem[$k].Situacao = 'antigo' } }
  }
}

# ---------------- ligar o bot ----------------
function Iniciar($bot) {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (Pergunta "Para ligar o bot, o computador precisa do Node.js (gratuito).`n`nAbrir o site para baixar agora? Instale a versão LTS e depois abra o Inicializador de novo.") {
      Start-Process 'https://nodejs.org/pt'
    }
    return
  }
  if (-not $bot.Token) {
    $token = [Microsoft.VisualBasic.Interaction]::InputBox("Este bot ainda não tem o token.`n`nCole aqui o token do bot (Developer Portal → Bot → Reset Token):", $titulo, '')
    $token = $token.Trim()
    if (-not $token) { return }
    $arqEnv = Join-Path $bot.Pasta '.env'
    $linhas = @()
    if (Test-Path -LiteralPath $arqEnv) { $linhas = @(Get-Content -LiteralPath $arqEnv -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*DISCORD_TOKEN\s*=' }) }
    $linhas = @("DISCORD_TOKEN=$token") + $linhas
    [System.IO.File]::WriteAllLines($arqEnv, [string[]]$linhas, (New-Object System.Text.UTF8Encoding($false)))
    $bot.Token = $true
  }
  $nomeJanela = ($bot.Nome -replace '[^\p{L}\p{N} _-]', '').Trim()
  if (-not $nomeJanela) { $nomeJanela = 'Bot' }
  $comando = "title $nomeJanela && cd /d `"$($bot.Pasta)`" && (if not exist node_modules (echo Instalando as dependencias, aguarde... && npm install --no-audit --no-fund)) && npm start"
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $comando -WorkingDirectory $bot.Pasta
}

# ---------------- janela ----------------
$form = New-Object System.Windows.Forms.Form
$form.Text = $titulo
$form.Size = New-Object System.Drawing.Size(900, 480)
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)

$rotulo = New-Object System.Windows.Forms.Label
$rotulo.Location = New-Object System.Drawing.Point(12, 10)
$rotulo.Size = New-Object System.Drawing.Size(860, 36)
$rotulo.Text = 'Escolha o bot e clique em Iniciar.'
$form.Controls.Add($rotulo)

$lista = New-Object System.Windows.Forms.ListView
$lista.Location = New-Object System.Drawing.Point(12, 50)
$lista.Size = New-Object System.Drawing.Size(860, 330)
$lista.View = 'Details'
$lista.FullRowSelect = $true
$lista.MultiSelect = $false
$lista.HideSelection = $false
[void]$lista.Columns.Add('Bot', 150)
[void]$lista.Columns.Add('Situação', 90)
[void]$lista.Columns.Add('Versão de', 115)
[void]$lista.Columns.Add('Última atividade', 115)
[void]$lista.Columns.Add('Token', 55)
[void]$lista.Columns.Add('Pasta', 320)
$form.Controls.Add($lista)

function NovoBotao([string]$texto, [int]$x, [int]$largura) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $texto
  $b.Location = New-Object System.Drawing.Point($x, 392)
  $b.Size = New-Object System.Drawing.Size($largura, 34)
  $form.Controls.Add($b)
  return $b
}
$btIniciar = NovoBotao 'Iniciar' 12 120
$btAbrir = NovoBotao 'Abrir pasta' 140 110
$btApagar = NovoBotao 'Apagar (Lixeira)' 258 140
$btProcurar = NovoBotao 'Procurar de novo' 406 140
$btFechar = NovoBotao 'Fechar' 772 100
$form.AcceptButton = $btIniciar

$script:bots = @()

function Preencher {
  $lista.Items.Clear()
  foreach ($b in $script:bots) {
    $it = New-Object System.Windows.Forms.ListViewItem($b.Nome)
    [void]$it.SubItems.Add($b.Situacao)
    [void]$it.SubItems.Add($b.Versao.ToString($fmt))
    if ($b.Atividade) { [void]$it.SubItems.Add($b.Atividade.ToString($fmt)) } else { [void]$it.SubItems.Add('sem dados') }
    if ($b.Token) { [void]$it.SubItems.Add('ok') } else { [void]$it.SubItems.Add('falta') }
    [void]$it.SubItems.Add($b.Pasta)
    if ($b.Situacao -eq 'mais novo') { $it.ForeColor = [System.Drawing.Color]::DarkGreen }
    if ($b.Situacao -like '*antigo') { $it.ForeColor = [System.Drawing.Color]::Gray }
    $it.Tag = $b
    [void]$lista.Items.Add($it)
  }
  if ($lista.Items.Count -gt 0) {
    $escolher = 0
    for ($k = 0; $k -lt $script:bots.Count; $k++) { if ($script:bots[$k].Situacao -eq 'mais novo') { $escolher = $k; break } }
    $lista.Items[$escolher].Selected = $true
  }
  $copias = @($script:bots | Where-Object { $_.Situacao -like '*antigo' }).Count
  if ($script:bots.Count -eq 0) {
    $rotulo.Text = 'Não achei nenhum bot no seu PC. Extraia o .zip do bot numa pasta e clique em "Procurar de novo".'
  } elseif ($copias -gt 0) {
    $rotulo.Text = "Achei $($script:bots.Count) bot(s). Há $copias cópia(s) antiga(s) de um mesmo bot (em cinza): depois de conferir que o mais novo está com os dados, você pode apagar a antiga."
  } else {
    $rotulo.Text = "Achei $($script:bots.Count) bot(s). Escolha um e clique em Iniciar."
  }
}

function Carregar([bool]$procurarDeNovo) {
  $pastas = @()
  if (-not $procurarDeNovo) { $pastas = LerCache }
  if ($pastas.Count -eq 0) {
    $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
    $rotulo.Text = 'Procurando bots no seu PC (na primeira vez pode levar alguns minutos)...'
    [System.Windows.Forms.Application]::DoEvents()
    $pastas = @(Procurar $rotulo)
    $form.Cursor = [System.Windows.Forms.Cursors]::Default
    SalvarCache $pastas
  }
  $script:bots = @($pastas | ForEach-Object { InfoBot $_ } | Sort-Object Nome, Versao)
  MarcarSituacao $script:bots
  Preencher
}

function Selecionado {
  if ($lista.SelectedItems.Count -eq 0) { Aviso 'Escolha um bot na lista.'; return $null }
  return $lista.SelectedItems[0].Tag
}

$btIniciar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  if ($b.Situacao -like '*antigo') {
    if (-not (Pergunta "Este é uma cópia ANTIGA do bot $($b.Nome). Tem uma versão mais nova na lista.`n`nIniciar esta mesmo assim?" 'Warning')) { return }
  }
  try { Iniciar $b; Preencher } catch { Aviso "Não consegui iniciar: $($_.Exception.Message)" 'Error' }
})
$lista.Add_DoubleClick({ $btIniciar.PerformClick() })

$btAbrir.Add_Click({
  $b = Selecionado
  if ($b) { Start-Process explorer.exe -ArgumentList "`"$($b.Pasta)`"" }
})

$btApagar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  $novo = $script:bots | Where-Object { $_.Nome -eq $b.Nome -and $_.Situacao -eq 'mais novo' } | Select-Object -First 1
  $texto = "Mandar para a Lixeira a pasta do bot $($b.Nome)?`n`n$($b.Pasta)`n`nVersão de $($b.Versao.ToString($fmt))"
  $icone = 'Question'
  if ($novo -and $novo.Pasta -ne $b.Pasta -and $b.Atividade -and (-not $novo.Atividade -or $b.Atividade -gt $novo.Atividade)) {
    $texto += "`n`nATENÇÃO: esta cópia tem dados MAIS RECENTES que a versão nova. Transfira os dados antes (Transferir dados.bat) ou você pode perder XP, dinheiro e configurações."
    $icone = 'Warning'
  } elseif ($b.Situacao -eq 'mais novo' -or -not $novo) {
    $texto += "`n`nEsta é a versão mais nova (ou a única) deste bot."
    $icone = 'Warning'
  }
  $texto += "`n`nFeche o bot antes, se ele estiver ligado. Dá para recuperar pela Lixeira."
  if (-not (Pergunta $texto $icone)) { return }
  try {
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($b.Pasta, 'OnlyErrorDialogs', 'SendToRecycleBin')
    $restantes = @($script:bots | Where-Object { $_.Pasta -ne $b.Pasta } | ForEach-Object { $_.Pasta })
    SalvarCache $restantes
    Carregar $false
  } catch {
    Aviso "Não consegui apagar (o bot está ligado ou algum arquivo está aberto?).`n`n$($_.Exception.Message)" 'Error'
  }
})

$btProcurar.Add_Click({ Carregar $true })
$btFechar.Add_Click({ $form.Close() })
$form.Add_Shown({ Carregar $false })

try {
  [void]$form.ShowDialog()
} catch {
  Aviso "Algo deu errado: $($_.Exception.Message)" 'Error'
  exit 1
}

# Bots ByteUP: o Inicializador (aberto pelo atalho "Bots ByteUP" ou pelo "Abrir Bots ByteUP.bat").
# Acha no PC os bots comprados na loja ByteUP (os que têm licenca.json), faz a primeira configuração
# por janelas (Node.js, token, intents, servidor), instala o que falta, liga o bot sem terminal e deixa
# parar, ver o registro, ligar com o Windows, personalizar e trazer os dados de outro bot.
# Ninguém precisa digitar comandos.
param([string]$Ligar)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic
# Telas com zoom (125%, 150%): deixa o texto nítido em vez de embaçado (precisa rodar antes de abrir qualquer janela)
try {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ByteupDpi {
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr v);
  [DllImport("shcore.dll")] public static extern int SetProcessDpiAwareness(int v);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public static void Ativar() {
    try { if (SetProcessDpiAwarenessContext((IntPtr)(-4))) return; } catch {}
    try { if (SetProcessDpiAwarenessContext((IntPtr)(-3))) return; } catch {}
    try { if (SetProcessDpiAwareness(2) == 0) return; } catch {}
    try { SetProcessDPIAware(); } catch {}
  }
}
'@ -ErrorAction Stop
  [ByteupDpi]::Ativar()
} catch {}
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$titulo = 'Bots ByteUP'
$pastaCache = Join-Path $env:APPDATA 'InicializadorBots'
$arquivoCache = Join-Path $pastaCache 'bots.json'
$fmt = 'dd/MM/yyyy HH:mm'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$PULAR = @('node_modules', '.git', 'windows', 'program files', 'program files (x86)', 'programdata', 'appdata', '$recycle.bin',
  'system volume information', 'recovery', 'msocache', 'perflogs', 'data', 'data-backup', '.cache', '.npm', 'steamapps', 'windowsapps', 'logs')
$NOMES_INTENT = @{ members = 'Server Members Intent'; content = 'Message Content Intent'; presence = 'Presence Intent' }

function Aviso([string]$texto, [string]$icone = 'Information') {
  [void][System.Windows.Forms.MessageBox]::Show($texto, $titulo, 'OK', $icone)
}
function Pergunta([string]$texto, [string]$icone = 'Question') {
  return ([System.Windows.Forms.MessageBox]::Show($texto, $titulo, 'YesNo', $icone) -eq [System.Windows.Forms.DialogResult]::Yes)
}
function Esperar([int]$ms) {
  $fim = (Get-Date).AddMilliseconds($ms)
  while ((Get-Date) -lt $fim) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 50 }
}

# ---------------- visual (cores da ByteUP) ----------------
$Cor = @{
  Fundo     = [System.Drawing.Color]::FromArgb(12, 10, 18)
  Painel    = [System.Drawing.Color]::FromArgb(22, 18, 31)
  Painel2   = [System.Drawing.Color]::FromArgb(33, 27, 46)
  Borda     = [System.Drawing.Color]::FromArgb(54, 44, 76)
  Texto     = [System.Drawing.Color]::FromArgb(236, 230, 245)
  Suave     = [System.Drawing.Color]::FromArgb(158, 148, 178)
  Roxo      = [System.Drawing.Color]::FromArgb(168, 85, 247)
  RoxoEsc   = [System.Drawing.Color]::FromArgb(124, 58, 237)
  Selecao   = [System.Drawing.Color]::FromArgb(58, 36, 94)
  Verde     = [System.Drawing.Color]::FromArgb(52, 211, 153)
  Vermelho  = [System.Drawing.Color]::FromArgb(248, 113, 113)
  Amarelo   = [System.Drawing.Color]::FromArgb(251, 191, 36)
}
$FONTE = New-Object System.Drawing.Font('Segoe UI', 10)
$FONTE_B = New-Object System.Drawing.Font('Segoe UI Semibold', 10)
$FONTE_P = New-Object System.Drawing.Font('Segoe UI', 9)
$FONTE_T = New-Object System.Drawing.Font('Segoe UI Semibold', 17)
$arqIco = Join-Path $pastaCache 'byteup.ico'

# barra de título escura (Windows 10/11)
$script:temDwm = $false
try {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ByteupDwm {
  [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr h, int a, ref int v, int s);
}
'@ -ErrorAction Stop
  $script:temDwm = $true
} catch {}

function EstiloBotao($b, [string]$tipo = 'normal') {
  $b.FlatStyle = 'Flat'
  $b.Cursor = [System.Windows.Forms.Cursors]::Hand
  $b.Font = $FONTE_B
  $b.FlatAppearance.BorderSize = 1
  $b.UseVisualStyleBackColor = $false
  switch ($tipo) {
    'primario' {
      $b.BackColor = $Cor.RoxoEsc; $b.ForeColor = [System.Drawing.Color]::White; $b.FlatAppearance.BorderColor = $Cor.Roxo
      $b.FlatAppearance.MouseOverBackColor = $Cor.Roxo; $b.FlatAppearance.MouseDownBackColor = $Cor.RoxoEsc
    }
    'perigo' {
      $b.BackColor = $Cor.Painel; $b.ForeColor = $Cor.Vermelho; $b.FlatAppearance.BorderColor = $Cor.Borda
      $b.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(58, 22, 32); $b.FlatAppearance.MouseDownBackColor = $Cor.Painel2
    }
    default {
      $b.BackColor = $Cor.Painel; $b.ForeColor = $Cor.Texto; $b.FlatAppearance.BorderColor = $Cor.Borda
      $b.FlatAppearance.MouseOverBackColor = $Cor.Painel2; $b.FlatAppearance.MouseDownBackColor = $Cor.Borda
    }
  }
  $b.Tag = "estilo:$tipo"
}
# Pinta a janela e tudo dentro dela com as cores da ByteUP
function Tematizar($ctl) {
  foreach ($c in @($ctl.Controls)) {
    switch ($c.GetType().Name) {
      'Button' { if (-not ([string]$c.Tag).StartsWith('estilo:')) { EstiloBotao $c 'normal' } }
      'TextBox' { $c.BackColor = $Cor.Painel2; $c.ForeColor = $Cor.Texto; $c.BorderStyle = 'FixedSingle' }
      'LinkLabel' { $c.LinkColor = $Cor.Roxo; $c.ActiveLinkColor = $Cor.Texto; $c.DisabledLinkColor = $Cor.Suave; $c.BackColor = [System.Drawing.Color]::Transparent }
      'Label' { $c.ForeColor = $Cor.Texto; $c.BackColor = [System.Drawing.Color]::Transparent }
      'CheckBox' { $c.ForeColor = $Cor.Texto; $c.BackColor = [System.Drawing.Color]::Transparent }
      'ListBox' { $c.BackColor = $Cor.Painel; $c.ForeColor = $Cor.Texto; $c.BorderStyle = 'None' }
      'GroupBox' { $c.BackColor = $Cor.Fundo; Tematizar $c; $c.ForeColor = $Cor.Roxo; foreach ($x in @($c.Controls)) { if ($x -is [System.Windows.Forms.Label] -and -not ($x -is [System.Windows.Forms.LinkLabel])) { $x.ForeColor = $Cor.Texto } } }
      'Panel' { Tematizar $c }
    }
  }
}
function NovaJanela([string]$texto, [int]$l, [int]$a) {
  $f = New-Object System.Windows.Forms.Form
  $f.Text = $texto
  $f.Size = New-Object System.Drawing.Size($l, $a)
  $f.StartPosition = 'CenterScreen'
  $f.BackColor = $Cor.Fundo
  $f.ForeColor = $Cor.Texto
  $f.Font = $FONTE
  $f.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::None
  try {
    if (-not $script:iconeJanela) { $script:iconeJanela = [System.Drawing.Icon]::FromHandle((DesenharLogo 32).GetHicon()) }
    $f.Icon = $script:iconeJanela
  } catch {}
  if ($script:temDwm) {
    $f.Add_HandleCreated({
      param($s, $e)
      try {
        $v = 1; [void][ByteupDwm]::DwmSetWindowAttribute($s.Handle, 20, [ref]$v, 4)
        $corTitulo = 0x120A0C; [void][ByteupDwm]::DwmSetWindowAttribute($s.Handle, 35, [ref]$corTitulo, 4)
      } catch {}
    })
  }
  return $f
}

# Ícone: um robozinho branco num quadrado roxo (desenhado aqui, sem arquivo de imagem)
function Arredondado([single]$x, [single]$y, [single]$l, [single]$a, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $l - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $l - $d, $y + $a - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $a - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}
function DesenharLogo([int]$t) {
  $bmp = New-Object System.Drawing.Bitmap($t, $t)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $fundo = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.PointF(0, 0)), (New-Object System.Drawing.PointF($t, $t)), $Cor.Roxo, [System.Drawing.Color]::FromArgb(59, 18, 120))
  $g.FillPath($fundo, (Arredondado 0 0 ($t - 1) ($t - 1) ($t * 0.24)))
  $branco = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $olho = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(76, 29, 149))
  $g.FillRectangle($branco, [single]($t * 0.47), [single]($t * 0.17), [single]($t * 0.06), [single]($t * 0.13))
  $g.FillEllipse($branco, [single]($t * 0.43), [single]($t * 0.12), [single]($t * 0.14), [single]($t * 0.14))
  $g.FillPath($branco, (Arredondado ($t * 0.2) ($t * 0.3) ($t * 0.6) ($t * 0.46) ($t * 0.13)))
  $g.FillEllipse($olho, [single]($t * 0.32), [single]($t * 0.44), [single]($t * 0.13), [single]($t * 0.13))
  $g.FillEllipse($olho, [single]($t * 0.55), [single]($t * 0.44), [single]($t * 0.13), [single]($t * 0.13))
  $g.FillRectangle($olho, [single]($t * 0.38), [single]($t * 0.63), [single]($t * 0.24), [single]($t * 0.04))
  $g.Dispose()
  return $bmp
}
# Grava o ícone (.ico com imagens PNG de 256, 48, 32 e 16 px)
function SalvarIco([string]$arq) {
  $pngs = @()
  foreach ($t in @(256, 48, 32, 16)) {
    $ms = New-Object System.IO.MemoryStream
    $bmp = DesenharLogo $t
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngs += , @($t, $ms.ToArray())
  }
  $fs = [System.IO.File]::Create($arq)
  $w = New-Object System.IO.BinaryWriter($fs)
  $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$pngs.Count)
  $pos = 6 + 16 * $pngs.Count
  foreach ($p in $pngs) {
    $lado = if ($p[0] -ge 256) { 0 } else { $p[0] }
    $w.Write([byte]$lado); $w.Write([byte]$lado); $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$p[1].Length); $w.Write([uint32]$pos)
    $pos += $p[1].Length
  }
  foreach ($p in $pngs) { $w.Write([byte[]]$p[1]) }
  $w.Close()
}
function GarantirIcone {
  try {
    if (-not (Test-Path -LiteralPath $pastaCache)) { New-Item -ItemType Directory -Path $pastaCache | Out-Null }
    if (-not (Test-Path -LiteralPath $arqIco)) { SalvarIco $arqIco }
  } catch {}
}

# ---------------- atalhos (sem extensão, com ícone e sem janela preta) ----------------
$POWERSHELL = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
function CriarAtalho([string]$lnk, [string]$argumentos, [string]$descricao, [string]$pasta) {
  $sh = New-Object -ComObject WScript.Shell
  $a = $sh.CreateShortcut($lnk)
  $a.TargetPath = $POWERSHELL
  $a.Arguments = $argumentos
  $a.WorkingDirectory = $pasta
  $a.WindowStyle = 7 # minimizado: a janela do PowerShell nunca aparece
  $a.Description = $descricao
  if (Test-Path -LiteralPath $arqIco) { $a.IconLocation = "$arqIco,0" }
  $a.Save()
}
# Atalho "Bots ByteUP": na pasta do Inicializador sempre; na Área de Trabalho e no Menu Iniciar na primeira vez
# (se a pessoa apagar, não volta). Se a pasta mudar de lugar, os atalhos que existem são corrigidos.
function AtualizarAtalhos {
  GarantirIcone
  $argumentos = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File `"$PSCommandPath`""
  $descricao = 'Liga, configura e personaliza os seus bots da loja ByteUP'
  $marca = Join-Path $pastaCache 'atalhos.ok'
  $primeira = -not (Test-Path -LiteralPath $marca)
  # os arquivos ficam na subpasta "Bots ByteUP"; o atalho do topo vai para a pasta de cima (ao lado do bot)
  $topo = Split-Path $PSScriptRoot -Parent
  if (-not $topo) { $topo = $PSScriptRoot }
  $locais = @($topo, [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
  for ($k = 0; $k -lt $locais.Count; $k++) {
    if (-not $locais[$k]) { continue }
    $lnk = Join-Path $locais[$k] 'Bots ByteUP.lnk'
    if ($k -gt 0 -and -not $primeira -and -not (Test-Path -LiteralPath $lnk)) { continue }
    try { CriarAtalho $lnk $argumentos $descricao $PSScriptRoot } catch {}
  }
  if ($primeira) {
    try { Set-Content -LiteralPath $marca -Value (Get-Date -Format o) } catch {}
    # deixa na pasta só o atalho "Bots ByteUP": esconde o .bat e este .ps1 (continuam funcionando)
    try {
      foreach ($arq in (Get-ChildItem -LiteralPath $PSScriptRoot -File -Force -ErrorAction SilentlyContinue)) {
        if ($arq.Extension -ieq '.bat' -or $arq.Name -ieq (Split-Path $PSCommandPath -Leaf)) {
          $arq.Attributes = $arq.Attributes -bor [System.IO.FileAttributes]::Hidden
        }
      }
    } catch {}
  }
  return $primeira
}

# ---------------- Node.js ----------------
function AtualizarPath {
  $m = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $u = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$m;$u"
}
function NodeExe {
  $c = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe", "$env:LOCALAPPDATA\Programs\nodejs\node.exe")) {
    if ($p -and (Test-Path -LiteralPath $p)) { $env:Path = "$(Split-Path $p);$env:Path"; return $p }
  }
  return $null
}
function NodeVersao {
  $exe = NodeExe
  if (-not $exe) { return $null }
  try { return ((& $exe -v) | Out-String).Trim() } catch { return $null }
}
function NodeServe([string]$v) {
  if (-not $v) { return $false }
  $m = [regex]::Match($v, 'v(\d+)\.(\d+)')
  if (-not $m.Success) { return $false }
  $maior = [int]$m.Groups[1].Value; $menor = [int]$m.Groups[2].Value
  return ($maior -gt 20) -or ($maior -eq 20 -and $menor -ge 6)
}
function Baixar([string]$url, [string]$destino, $rotulo) {
  $wc = New-Object System.Net.WebClient
  $t = $wc.DownloadFileTaskAsync($url, $destino)
  while (-not $t.IsCompleted) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 100 }
  if ($t.IsFaulted) { throw $t.Exception.InnerException }
}
# Instala o Node.js LTS: pelo winget (se o Windows tiver) ou baixando o instalador oficial do nodejs.org
function InstalarNode($rotulo) {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    $rotulo.Text = 'Instalando o Node.js pelo Windows (winget)... pode aparecer uma janela pedindo permissão.'
    $p = Start-Process -FilePath $winget.Source -ArgumentList @('install', '--id', 'OpenJS.NodeJS.LTS', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements') -WindowStyle Hidden -PassThru
    while (-not $p.HasExited) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 200 }
    AtualizarPath
    if (NodeServe (NodeVersao)) { return $true }
  }
  $rotulo.Text = 'Baixando o Node.js do site oficial (nodejs.org)...'
  [System.Windows.Forms.Application]::DoEvents()
  $arq = 'x64'
  if (-not [Environment]::Is64BitOperatingSystem) { $arq = 'x86' }
  $lista = (New-Object System.Net.WebClient).DownloadString('https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt')
  $m = [regex]::Match($lista, "node-v22\.\d+\.\d+-$arq\.msi")
  if (-not $m.Success) { throw 'não achei o instalador do Node.js no site.' }
  $msi = Join-Path $env:TEMP $m.Value
  Baixar "https://nodejs.org/dist/latest-v22.x/$($m.Value)" $msi $rotulo
  $rotulo.Text = 'Instalando o Node.js... confirme a janela de permissão do Windows, se aparecer.'
  $p = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', "`"$msi`"", '/passive', '/norestart') -PassThru
  while (-not $p.HasExited) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 200 }
  AtualizarPath
  return (NodeServe (NodeVersao))
}

# ---------------- arquivos do bot ----------------
# Licença do bot (licenca.json): só bots comprados na loja ByteUP aparecem aqui
function LicencaDe([string]$pasta) {
  $arq = Join-Path $pasta 'licenca.json'
  if (-not (Test-Path -LiteralPath $arq)) { return $null }
  try {
    $l = Get-Content -LiteralPath $arq -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($l.formato -eq 'byteup-licenca' -and $l.comprador -and $l.assinatura) { return $l }
  } catch {}
  return $null
}
function EhBot([string]$pasta) {
  if (-not (Test-Path -LiteralPath (Join-Path $pasta 'index.js')) -or -not (Test-Path -LiteralPath (Join-Path $pasta 'config.json'))) { return $false }
  if (Test-Path -LiteralPath (Join-Path $pasta 'protegido\index.js')) { return $false } # modelo do site, não é um bot
  if ((Test-Path -LiteralPath (Join-Path $pasta 'bot.pack')) -and (LicencaDe $pasta)) { return $true }
  # bots da loja baixados antes da licença (código aberto): aparecem pedindo para baixar de novo
  return (Test-Path -LiteralPath (Join-Path $pasta 'src\core\nucleo.js')) -and (Test-Path -LiteralPath (Join-Path $pasta 'src\core\textos.js'))
}
function LerEnv([string]$pasta) {
  $h = @{}
  $arq = Join-Path $pasta '.env'
  if (Test-Path -LiteralPath $arq) {
    foreach ($l in [System.IO.File]::ReadAllLines($arq)) {
      $m = [regex]::Match($l, '^\s*([A-Z_]+)\s*=\s*(.*)$')
      if ($m.Success) { $h[$m.Groups[1].Value] = $m.Groups[2].Value.Trim().Trim('"') }
    }
  }
  return $h
}
# Grava chaves no .env sem apagar as outras linhas
function SalvarEnv([string]$pasta, [hashtable]$novos) {
  $arq = Join-Path $pasta '.env'
  $linhas = New-Object System.Collections.Generic.List[string]
  $feitos = @{}
  if (Test-Path -LiteralPath $arq) {
    foreach ($l in [System.IO.File]::ReadAllLines($arq)) {
      $m = [regex]::Match($l, '^\s*([A-Z_]+)\s*=')
      if ($m.Success -and $novos.ContainsKey($m.Groups[1].Value)) {
        $k = $m.Groups[1].Value
        if (-not $feitos[$k]) { $linhas.Add("$k=$($novos[$k])"); $feitos[$k] = $true }
      } else { $linhas.Add($l) }
    }
  }
  foreach ($k in $novos.Keys) { if (-not $feitos[$k]) { $linhas.Add("$k=$($novos[$k])") } }
  [System.IO.File]::WriteAllLines($arq, [string[]]$linhas, $utf8)
}
function DepsOk([string]$pasta) { return (Test-Path -LiteralPath (Join-Path $pasta 'node_modules\discord.js\package.json')) }

# Intents privilegiadas que os módulos deste bot usam (lidas do próprio código)
function IntentsNecessarios([string]$pasta) {
  $precisa = New-Object System.Collections.Generic.List[string]
  try { $cfg = Get-Content -LiteralPath (Join-Path $pasta 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $cfg = $null }
  # bots novos: a loja já escreve no config.json o que os módulos precisam (o código fica no bot.pack)
  if ($cfg -and $cfg.PSObject.Properties['intents']) {
    foreach ($i in @($cfg.intents)) { if (@('members', 'content', 'presence') -contains $i) { $precisa.Add([string]$i) } }
    return , $precisa
  }
  $mods = @(); if ($cfg) { $mods = @($cfg.modulos) }
  $textos = @()
  foreach ($id in $mods) {
    $arq = Join-Path $pasta "src\modules\$id.js"
    if (Test-Path -LiteralPath $arq) { $textos += [System.IO.File]::ReadAllText($arq) }
  }
  $tudo = $textos -join "`n"
  if ($tudo.Contains('GatewayIntentBits.GuildMembers')) { $precisa.Add('members') }
  if ($tudo.Contains('GatewayIntentBits.MessageContent')) { $precisa.Add('content') }
  if ($tudo.Contains('GatewayIntentBits.GuildPresences')) { $precisa.Add('presence') }
  return $precisa
}

# ---------------- Discord ----------------
function Api([string]$token, [string]$rota) {
  $h = @{ Authorization = "Bot $token"; 'User-Agent' = 'DiscordBot (https://byteup, 1.0) Inicializador' }
  return Invoke-RestMethod -Uri "https://discord.com/api/v10$rota" -Headers $h -Method Get -TimeoutSec 20
}
function CodigoErro($erro) {
  try { return [int]$erro.Exception.Response.StatusCode } catch { return 0 }
}
# Confere o token: devolve @{ ok; nome; appId; flags; erro }
function ConferirToken([string]$token) {
  try {
    $eu = Api $token '/users/@me'
    $app = Api $token '/applications/@me'
    $dono = [string]$app.owner.id
    if ($app.team) { $dono = [string]$app.team.owner_user_id }
    return @{ ok = $true; nome = $eu.username; appId = [string]$app.id; flags = [int64]$app.flags; dono = $dono; erro = $null }
  } catch {
    $c = CodigoErro $_
    if ($c -eq 401) { return @{ ok = $false; erro = 'Token errado. Gere outro no Developer Portal (Bot → Reset Token) e cole aqui.' } }
    return @{ ok = $false; erro = "Não consegui falar com o Discord (sem internet?). $($_.Exception.Message)" }
  }
}
function IntentLigado([int64]$flags, [string]$nome) {
  switch ($nome) {
    'presence' { return (($flags -band (1 -shl 12)) -ne 0) -or (($flags -band (1 -shl 13)) -ne 0) }
    'members' { return (($flags -band (1 -shl 14)) -ne 0) -or (($flags -band (1 -shl 15)) -ne 0) }
    'content' { return (($flags -band (1 -shl 18)) -ne 0) -or (($flags -band (1 -shl 19)) -ne 0) }
  }
  return $true
}
function ServidoresDoBot([string]$token) {
  try { return @((Api $token '/users/@me/guilds') | ForEach-Object { [string]$_.id }) } catch { return $null }
}

# ---------------- ligar / parar ----------------
function ArqEstado([string]$pasta) { return (Join-Path $pasta '.inicializador.json') }
function ProcessoDe([string]$arq) {
  if (-not (Test-Path -LiteralPath $arq)) { return $null }
  try {
    $e = Get-Content -LiteralPath $arq -Raw -Encoding UTF8 | ConvertFrom-Json
    $p = Get-Process -Id ([int]$e.pid) -ErrorAction SilentlyContinue
    if (-not $p -or @('cmd', 'node') -notcontains $p.ProcessName) { return $null }
    # o Windows reaproveita números de processo: confere a hora em que começou
    if ([math]::Abs(($p.StartTime.ToUniversalTime() - ([datetime]$e.inicio).ToUniversalTime()).TotalSeconds) -gt 10) { return $null }
    return $p
  } catch { return $null }
}
# O processo do bot: o que o Inicializador ligou ou, se foi ligado de outro jeito (terminal), o que o próprio bot avisou no ".rodando"
function ProcessoDoBot([string]$pasta) {
  $p = ProcessoDe (ArqEstado $pasta)
  if ($p) { return $p }
  return (ProcessoDe (Join-Path $pasta '.rodando'))
}
function InstalarDeps([string]$pasta, $rotulo) {
  $logs = Join-Path $pasta 'logs'
  if (-not (Test-Path -LiteralPath $logs)) { New-Item -ItemType Directory -Path $logs | Out-Null }
  $log = Join-Path $logs 'instalacao.log'
  $rotulo.Text = 'Instalando o que o bot precisa (discord.js)... na primeira vez leva 1 ou 2 minutos.'
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', "npm install --no-audit --no-fund > `"$log`" 2>&1") -WorkingDirectory $pasta -WindowStyle Hidden -PassThru
  while (-not $p.HasExited) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 200 }
  if ($p.ExitCode -ne 0 -or -not (DepsOk $pasta)) {
    $fim = ''
    try { $fim = ((Get-Content -LiteralPath $log -Encoding UTF8 -Tail 12) -join "`n") } catch {}
    throw "a instalação falhou (sem internet?).`n`n$fim"
  }
}
# Liga o bot sem janela. Devolve o processo.
function LigarBot([string]$pasta) {
  $exe = NodeExe
  if (-not $exe) { throw 'o Node.js não está instalado.' }
  $logs = Join-Path $pasta 'logs'
  if (-not (Test-Path -LiteralPath $logs)) { New-Item -ItemType Directory -Path $logs | Out-Null }
  $saida = Join-Path $logs 'bot.log'
  $erros = Join-Path $logs 'erros.log'
  foreach ($a in @($saida, $erros)) {
    if (Test-Path -LiteralPath $a) { Move-Item -LiteralPath $a -Destination ($a -replace '\.log$', '-anterior.log') -Force }
  }
  Remove-Item -LiteralPath (Join-Path $pasta '.parar') -Force -ErrorAction SilentlyContinue
  # roda num console próprio e invisível: fechar outras janelas não derruba o bot
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "$env:SystemRoot\System32\cmd.exe"
  $psi.Arguments = "/d /c `"`"$exe`" index.js > `"$saida`" 2> `"$erros`"`""
  $psi.WorkingDirectory = $pasta
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $estado = @{ pid = $p.Id; inicio = $p.StartTime.ToString('o') } | ConvertTo-Json
  [System.IO.File]::WriteAllText((ArqEstado $pasta), $estado, $utf8)
  return $p
}
function LerLog([string]$arq) {
  if (-not (Test-Path -LiteralPath $arq)) { return '' }
  try {
    $fs = [System.IO.File]::Open($arq, 'Open', 'Read', 'ReadWrite')
    $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
    $t = $sr.ReadToEnd(); $sr.Close(); return $t
  } catch { return '' }
}
# Espera o bot dizer que está online (ou falhar). Devolve @{ ok; servidores; convite; erro }
function AguardarOnline([string]$pasta, $proc, $rotulo) {
  $saida = Join-Path $pasta 'logs\bot.log'
  $erros = Join-Path $pasta 'logs\erros.log'
  $limite = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $limite) {
    $txt = LerLog $saida
    if ($txt -match 'online como') {
      Esperar 1500 # o link de convite vem logo depois
      $txt = LerLog $saida
      $serv = 0
      $m = [regex]::Match($txt, 'em (\d+) servidor')
      if ($m.Success) { $serv = [int]$m.Groups[1].Value }
      $conv = [regex]::Match($txt, 'https://discord\.com/\S*oauth2\S+').Value
      return @{ ok = $true; servidores = $serv; convite = $conv; erro = $null }
    }
    if ($proc.HasExited) {
      Esperar 300
      $err = (LerLog $erros).Trim()
      if (-not $err) { $err = (LerLog $saida).Trim() }
      return @{ ok = $false; erro = $err }
    }
    if ($rotulo) { $rotulo.Text = 'Ligando o bot e conectando ao Discord...' }
    Esperar 400
  }
  return @{ ok = $false; erro = 'O bot demorou demais para conectar. Veja o registro.' }
}
function PararBot([string]$pasta) {
  $p = ProcessoDoBot $pasta
  if (-not $p) { return }
  # pede para o bot salvar e desligar sozinho; se não der em 15 s, fecha à força
  [System.IO.File]::WriteAllText((Join-Path $pasta '.parar'), 'parar', $utf8)
  $fim = (Get-Date).AddSeconds(15)
  while (-not $p.HasExited -and (Get-Date) -lt $fim) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 200; $p.Refresh() }
  if (-not $p.HasExited) {
    # fecha o console invisível e o node junto
    Start-Process -FilePath "$env:SystemRoot\System32\taskkill.exe" -ArgumentList @('/PID', $p.Id, '/T', '/F') -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath (Join-Path $pasta '.parar') -Force -ErrorAction SilentlyContinue
}

# ---------------- ligar junto com o Windows ----------------
function AtalhoInicio($bot) {
  $nome = ($bot.Nome -replace '[^\p{L}\p{N} _-]', '').Trim()
  if (-not $nome) { $nome = 'Bot' }
  return (Join-Path ([Environment]::GetFolderPath('Startup')) "Ligar bot $nome.lnk")
}
function AlternarInicio($bot) {
  $lnk = AtalhoInicio $bot
  if (Test-Path -LiteralPath $lnk) {
    Remove-Item -LiteralPath $lnk -Force
    Aviso "Pronto: o bot $($bot.Nome) não liga mais sozinho com o Windows."
    return
  }
  GarantirIcone
  CriarAtalho $lnk "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -Ligar `"$($bot.Pasta)`"" "Liga o bot $($bot.Nome)" $bot.Pasta
  Aviso "Pronto: o bot $($bot.Nome) vai ligar sozinho sempre que o computador ligar (sem abrir janela).`n`nPara desfazer, clique de novo em ""Ligar com o Windows""."
}

# Tira a marca "baixado da internet" dos scripts (o Windows bloqueia .bat/.ps1 com essa marca).
# Assim o Transferidor e os outros scripts da pasta do bot funcionam sem aviso.
function Desbloquear([string]$pasta) {
  try {
    Get-ChildItem -LiteralPath $pasta -File -ErrorAction SilentlyContinue |
      Where-Object { @('.bat', '.cmd', '.ps1', '.js', '.json', '.html') -contains $_.Extension.ToLowerInvariant() } |
      Unblock-File -ErrorAction SilentlyContinue
  } catch {}
}
Desbloquear $PSScriptRoot

# Modo sem janela (atalho do Windows): só liga o bot, se estiver configurado
if ($Ligar) {
  if ((EhBot $Ligar) -and (DepsOk $Ligar) -and (LerEnv $Ligar)['DISCORD_TOKEN'] -and -not (ProcessoDoBot $Ligar)) {
    AtualizarPath
    [void](LigarBot $Ligar)
  }
  exit 0
}

# ---------------- procurar no PC ----------------
function InfoBot([string]$pasta) {
  $nome = '(sem nome)'
  try { $nome = (Get-Content -LiteralPath (Join-Path $pasta 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json).nome } catch {}
  $lic = LicencaDe $pasta
  $versao = (Get-Item -LiteralPath (Join-Path $pasta 'index.js')).LastWriteTime
  $dados = @(Get-ChildItem -LiteralPath (Join-Path $pasta 'data') -Filter '*.json' -File -ErrorAction SilentlyContinue)
  $atividade = $null
  if ($dados.Count -gt 0) { $atividade = ($dados | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime }
  return [pscustomobject]@{ Nome = $nome; Pasta = $pasta; Versao = $versao; Atividade = $atividade; Dados = $dados.Count; Situacao = ''; Licenca = $lic; Antigo = (-not $lic) }
}
function Configurado($bot) {
  return ((LerEnv $bot.Pasta)['DISCORD_TOKEN']) -and (DepsOk $bot.Pasta) -and (NodeServe (NodeVersao))
}
function EstadoTexto($bot) {
  if (ProcessoDoBot $bot.Pasta) { return 'Ligado' }
  if (-not ((LerEnv $bot.Pasta)['DISCORD_TOKEN']) -or -not (DepsOk $bot.Pasta)) { return 'Configurar' }
  return 'Desligado'
}

function Procurar($rotulo) {
  $achados = New-Object System.Collections.Generic.List[string]
  $fila = New-Object System.Collections.Generic.Queue[object]
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
function MarcarSituacao($bots) {
  foreach ($b in $bots) { if ($b.Antigo) { $b.Situacao = 'baixe de novo' } }
  foreach ($grupo in ($bots | Group-Object Nome)) {
    $ordem = @($grupo.Group | Where-Object { -not $_.Antigo } | Sort-Object Versao -Descending)
    if ($ordem.Count -lt 2) { continue }
    $ordem[0].Situacao = 'mais novo'
    for ($k = 1; $k -lt $ordem.Count; $k++) { $ordem[$k].Situacao = 'mais antigo' }
    if ($ordem.Count -gt 2) { for ($k = 1; $k -lt $ordem.Count - 1; $k++) { $ordem[$k].Situacao = 'antigo' } }
  }
}

# ---------------- assistente de configuração ----------------
function NovoGrupo($form, [string]$texto, [int]$y, [int]$altura) {
  $g = New-Object System.Windows.Forms.GroupBox
  $g.Text = $texto
  $g.Location = New-Object System.Drawing.Point(12, $y)
  $g.Size = New-Object System.Drawing.Size(640, $altura)
  $form.Controls.Add($g)
  return $g
}
function NovoRotulo($pai, [string]$texto, [int]$x, [int]$y, [int]$l, [int]$a) {
  $r = New-Object System.Windows.Forms.Label
  $r.Text = $texto
  $r.Location = New-Object System.Drawing.Point($x, $y)
  $r.Size = New-Object System.Drawing.Size($l, $a)
  $pai.Controls.Add($r)
  return $r
}
function NovoBotaoEm($pai, [string]$texto, [int]$x, [int]$y, [int]$l) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $texto
  $b.Location = New-Object System.Drawing.Point($x, $y)
  $b.Size = New-Object System.Drawing.Size($l, 30)
  $pai.Controls.Add($b)
  return $b
}
$VERDE = $Cor.Verde
$VERMELHO = $Cor.Vermelho

# Abre o assistente. Devolve $true se o bot ficou pronto para ligar.
function Assistente($bot) {
  $script:wz = @{ bot = $bot; nodeOk = $false; tokenOk = $false; intentsOk = $false; info = $null; precisa = (IntentsNecessarios $bot.Pasta) }
  $env0 = LerEnv $bot.Pasta

  $f = NovaJanela "Configurar o bot $($bot.Nome)" 680 690
  $f.FormBorderStyle = 'FixedDialog'
  $f.MaximizeBox = $false
  $script:wz.form = $f
  [void](NovoRotulo $f "Vamos deixar o bot pronto. Siga os passos de cima para baixo; cada um fica verde quando estiver certo." 14 10 640 36)

  # 1. Node.js
  $g1 = NovoGrupo $f '1. Node.js (o programa que roda o bot)' 48 70
  $script:wz.st1 = NovoRotulo $g1 '' 12 26 430 34
  $script:wz.bt1 = NovoBotaoEm $g1 'Instalar o Node.js' 460 22 166

  # 2. Token
  $g2 = NovoGrupo $f '2. Token do bot' 124 150
  [void](NovoRotulo $g2 'No Developer Portal: abra a sua aplicação → Bot → Reset Token → Copy. Cole aqui:' 12 22 610 20)
  $script:wz.link2 = New-Object System.Windows.Forms.LinkLabel
  $script:wz.link2.Text = 'Abrir o Developer Portal'
  $script:wz.link2.Location = New-Object System.Drawing.Point(12, 44)
  $script:wz.link2.Size = New-Object System.Drawing.Size(300, 20)
  $g2.Controls.Add($script:wz.link2)
  $script:wz.tk = New-Object System.Windows.Forms.TextBox
  $script:wz.tk.Location = New-Object System.Drawing.Point(12, 70)
  $script:wz.tk.Size = New-Object System.Drawing.Size(440, 26)
  $script:wz.tk.UseSystemPasswordChar = $true
  if ($env0['DISCORD_TOKEN']) { $script:wz.tk.Text = $env0['DISCORD_TOKEN'] }
  $g2.Controls.Add($script:wz.tk)
  $script:wz.ver = New-Object System.Windows.Forms.CheckBox
  $script:wz.ver.Text = 'Mostrar'
  $script:wz.ver.Location = New-Object System.Drawing.Point(462, 71)
  $script:wz.ver.Size = New-Object System.Drawing.Size(80, 24)
  $g2.Controls.Add($script:wz.ver)
  $script:wz.bt2 = NovoBotaoEm $g2 'Conferir' 546 68 80
  $script:wz.st2 = NovoRotulo $g2 '' 12 104 610 40

  # 3. Intents
  $g3 = NovoGrupo $f '3. Permissões especiais (Privileged Gateway Intents)' 282 140
  $script:wz.st3 = NovoRotulo $g3 'Confira o token primeiro.' 12 24 610 72
  $script:wz.link3 = New-Object System.Windows.Forms.LinkLabel
  $script:wz.link3.Text = 'Abrir a página do bot no Developer Portal para ligar'
  $script:wz.link3.Location = New-Object System.Drawing.Point(12, 104)
  $script:wz.link3.Size = New-Object System.Drawing.Size(420, 22)
  $script:wz.link3.Enabled = $false
  $g3.Controls.Add($script:wz.link3)
  $script:wz.bt3 = NovoBotaoEm $g3 'Conferir de novo' 476 100 150
  $script:wz.bt3.Enabled = $false

  # 4. Servidor
  $g4 = NovoGrupo $f '4. ID do seu servidor (opcional, mas recomendado)' 430 126
  [void](NovoRotulo $g4 "Com ele, os comandos aparecem na hora no seu servidor. No Discord: Configurações → Avançado → ligue o Modo desenvolvedor. Depois clique com o botão direito no servidor → Copiar ID do servidor." 12 22 610 56)
  $script:wz.gid = New-Object System.Windows.Forms.TextBox
  $script:wz.gid.Location = New-Object System.Drawing.Point(12, 84)
  $script:wz.gid.Size = New-Object System.Drawing.Size(240, 26)
  if ($env0['GUILD_ID']) { $script:wz.gid.Text = $env0['GUILD_ID'] }
  $g4.Controls.Add($script:wz.gid)
  $script:wz.st4 = NovoRotulo $g4 '' 262 87 360 22

  # final
  $script:wz.barra = New-Object System.Windows.Forms.ProgressBar
  $script:wz.barra.Location = New-Object System.Drawing.Point(12, 566)
  $script:wz.barra.Size = New-Object System.Drawing.Size(640, 14)
  $script:wz.barra.Style = 'Marquee'
  $script:wz.barra.Visible = $false
  $f.Controls.Add($script:wz.barra)
  $script:wz.stF = NovoRotulo $f '' 14 584 640 22
  $script:wz.btOk = NovoBotaoEm $f 'Instalar e ligar o bot' 372 608 180
  EstiloBotao $script:wz.btOk 'primario'
  $script:wz.btOk.Enabled = $false
  $script:wz.btCancel = NovoBotaoEm $f 'Cancelar' 560 608 92
  $script:wz.pronto = $false

  $script:wz.atualizar = {
    $w = $script:wz
    # 1
    $v = NodeVersao
    $w.nodeOk = NodeServe $v
    if ($w.nodeOk) { $w.st1.Text = "✔ Node.js $v instalado."; $w.st1.ForeColor = $VERDE; $w.bt1.Visible = $false }
    elseif ($v) { $w.st1.Text = "✖ Node.js $v é antigo demais. Clique para instalar o atual."; $w.st1.ForeColor = $VERMELHO; $w.bt1.Visible = $true }
    else { $w.st1.Text = '✖ Node.js não está instalado. Clique no botão: ele baixa e instala sozinho.'; $w.st1.ForeColor = $VERMELHO; $w.bt1.Visible = $true }
    # 3
    if ($w.tokenOk) {
      $linhas = @()
      $falta = 0
      foreach ($i in $w.precisa) {
        if (IntentLigado $w.info.flags $i) { $linhas += "✔ $($NOMES_INTENT[$i])" } else { $linhas += "✖ $($NOMES_INTENT[$i]) (desligada)"; $falta++ }
      }
      if (-not $w.precisa.Count) { $w.st3.Text = '✔ Este bot não precisa de nenhuma permissão especial.'; $w.st3.ForeColor = $VERDE; $w.intentsOk = $true }
      elseif ($falta) { $w.st3.Text = ($linhas -join "`n") + "`nLigue as que estão com ✖ (na página Bot, desça até Privileged Gateway Intents, ligue e clique em Save Changes). Depois clique em Conferir de novo."; $w.st3.ForeColor = $VERMELHO; $w.intentsOk = $false }
      else { $w.st3.Text = ($linhas -join "`n"); $w.st3.ForeColor = $VERDE; $w.intentsOk = $true }
      $w.link3.Enabled = $true; $w.bt3.Enabled = $true
    }
    # 4
    $g = $w.gid.Text.Trim()
    if (-not $g) { $w.st4.Text = 'Pode deixar vazio.'; $w.st4.ForeColor = $Cor.Suave }
    elseif ($g -match '^\d{17,20}$') { $w.st4.Text = '✔ ID válido.'; $w.st4.ForeColor = $VERDE }
    else { $w.st4.Text = '✖ O ID tem só números (17 a 20).'; $w.st4.ForeColor = $VERMELHO }
    $gidOk = (-not $g) -or ($g -match '^\d{17,20}$')
    $w.btOk.Enabled = $w.nodeOk -and $w.tokenOk -and $w.intentsOk -and $gidOk
  }
  $script:wz.conferirToken = {
    $w = $script:wz
    $t = $w.tk.Text.Trim()
    $w.tokenOk = $false
    if (-not $t) { $w.st2.Text = 'Cole o token do bot.'; $w.st2.ForeColor = $VERMELHO; & $w.atualizar; return }
    $w.st2.Text = 'Conferindo com o Discord...'; $w.st2.ForeColor = $Cor.Suave
    $w.form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor; [System.Windows.Forms.Application]::DoEvents()
    $r = ConferirToken $t
    $w.form.Cursor = [System.Windows.Forms.Cursors]::Default
    $lic = LicencaDe $w.bot.Pasta
    if ($r.ok -and $lic -and $r.dono -ne [string]$lic.comprador) {
      $w.st2.Text = "✖ Este token é de um bot criado em OUTRA conta do Discord. Este bot só funciona com um bot criado na conta que comprou na loja (ID $($lic.comprador)). Entre nessa conta no Developer Portal, crie o bot lá e cole o token dele."
      $w.st2.ForeColor = $VERMELHO
    } elseif ($r.ok) {
      $w.info = $r; $w.tokenOk = $true
      $w.st2.Text = "✔ Token certo: bot $($r.nome)."; $w.st2.ForeColor = $VERDE
    } else { $w.st2.Text = "✖ $($r.erro)"; $w.st2.ForeColor = $VERMELHO }
    & $w.atualizar
  }

  $script:wz.bt1.Add_Click({
    $w = $script:wz
    $w.bt1.Enabled = $false; $w.barra.Visible = $true
    try {
      $ok = InstalarNode $w.stF
      if ($ok) { $w.stF.Text = 'Node.js instalado.' } else { $w.stF.Text = 'Não deu para confirmar a instalação. Se instalou, feche e abra o Inicializador de novo.' }
    } catch {
      $w.stF.Text = ''
      if (Pergunta "Não consegui instalar o Node.js sozinho ($($_.Exception.Message)).`n`nAbrir o site para instalar você mesmo? Escolha a versão LTS e clique em Avançar até o fim.") { Start-Process 'https://nodejs.org/pt' }
    }
    $w.barra.Visible = $false; $w.bt1.Enabled = $true
    & $w.atualizar
  })
  $script:wz.link2.Add_LinkClicked({ Start-Process 'https://discord.com/developers/applications' })
  $script:wz.ver.Add_CheckedChanged({ $script:wz.tk.UseSystemPasswordChar = -not $script:wz.ver.Checked })
  $script:wz.bt2.Add_Click({ & $script:wz.conferirToken })
  $script:wz.tk.Add_TextChanged({ $script:wz.tokenOk = $false; $script:wz.intentsOk = $false; $script:wz.st2.Text = ''; & $script:wz.atualizar })
  $script:wz.link3.Add_LinkClicked({ if ($script:wz.info) { Start-Process "https://discord.com/developers/applications/$($script:wz.info.appId)/bot" } })
  $script:wz.bt3.Add_Click({ & $script:wz.conferirToken })
  $script:wz.gid.Add_TextChanged({ & $script:wz.atualizar })
  $script:wz.btCancel.Add_Click({ $script:wz.form.Close() })
  $script:wz.btOk.Add_Click({
    $w = $script:wz
    $w.btOk.Enabled = $false; $w.btCancel.Enabled = $false; $w.barra.Visible = $true
    try {
      $novos = @{ DISCORD_TOKEN = $w.tk.Text.Trim() }
      $novos['GUILD_ID'] = $w.gid.Text.Trim()
      SalvarEnv $w.bot.Pasta $novos
      if (-not (DepsOk $w.bot.Pasta)) { InstalarDeps $w.bot.Pasta $w.stF }
      $w.pronto = $true
      $w.form.Close()
    } catch {
      $w.barra.Visible = $false; $w.btCancel.Enabled = $true
      $w.stF.Text = ''
      Aviso "Não consegui terminar: $($_.Exception.Message)" 'Error'
      & $w.atualizar
    }
  })
  Tematizar $f
  $f.Add_Shown({
    & $script:wz.atualizar
    if ($script:wz.tk.Text.Trim()) { & $script:wz.conferirToken }
  })
  [void]$f.ShowDialog()
  return $script:wz.pronto
}

# ---------------- ligar com aviso do resultado ----------------
function IniciarComResultado($bot, $rotulo) {
  if (ProcessoDoBot $bot.Pasta) { Aviso "O bot $($bot.Nome) já está ligado."; return }
  if (-not (Configurado $bot)) {
    if (-not (Assistente $bot)) { return }
  }
  $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
  $proc = LigarBot $bot.Pasta
  $r = AguardarOnline $bot.Pasta $proc $rotulo
  $form.Cursor = [System.Windows.Forms.Cursors]::Default
  $rotulo.Text = 'Escolha o bot e use os botões abaixo.'
  if ($r.ok) {
    $env1 = LerEnv $bot.Pasta
    $gid = $env1['GUILD_ID']
    $faltaServidor = $r.servidores -eq 0
    if ($gid -and -not $faltaServidor) {
      $lista = ServidoresDoBot $env1['DISCORD_TOKEN']
      if ($lista -ne $null -and -not ($lista -contains $gid)) { $faltaServidor = $true }
    }
    if ($faltaServidor -and $r.convite) {
      if (Pergunta "✔ O bot $($bot.Nome) está ligado!`n`nFalta só adicionar o bot ao seu servidor. Abrir o link de convite agora?`n`n(Escolha o servidor, clique em Autorizar e pronto. O bot continua ligado; pode fechar o Inicializador.)" 'Information') {
        Start-Process $r.convite
      }
    } else {
      Aviso "✔ O bot $($bot.Nome) está ligado e em $($r.servidores) servidor(es).`n`nPode fechar o Inicializador: o bot continua ligado. Para desligar, abra o Inicializador e clique em Parar."
    }
    return
  }
  $e = [string]$r.erro
  if ($e -match 'token est[aá] errado|TokenInvalid|invalid token') {
    if (Pergunta "O Discord recusou o token do bot.`n`nAbrir a configuração para colar o token novo?" 'Warning') { if (Assistente $bot) { IniciarComResultado $bot $rotulo } }
  } elseif ($e -match 'licenciada para outra conta') {
    if (Pergunta "O token é de um bot criado em OUTRA conta do Discord.`n`nEste bot só liga com um bot criado no Developer Portal na conta que comprou na loja. Abrir a configuração para colar o token certo?" 'Warning') { if (Assistente $bot) { IniciarComResultado $bot $rotulo } }
  } elseif ($e -match 'licen[cç]a|bot\.pack') {
    if ($e.Length -gt 1500) { $e = $e.Substring($e.Length - 1500) }
    Aviso "O bot não ligou por causa da licença:`n`n$e" 'Warning'
  } elseif ($e -match 'disallowed intents|Privileged Gateway') {
    if (Pergunta "Faltam permissões especiais (intents) no Developer Portal.`n`nAbrir a configuração para conferir?" 'Warning') { if (Assistente $bot) { IniciarComResultado $bot $rotulo } }
  } else {
    if ($e.Length -gt 1500) { $e = $e.Substring($e.Length - 1500) }
    Aviso "O bot não ligou.`n`n$e`n`nSe não entender, use ""Ver registro"" e mande o print para o suporte." 'Error'
  }
}

# ---------------- registro ----------------
function VerRegistro($bot) {
  $f = NovaJanela "Registro do bot $($bot.Nome)" 860 560
  $t = New-Object System.Windows.Forms.TextBox
  $t.Multiline = $true; $t.ReadOnly = $true; $t.ScrollBars = 'Both'; $t.WordWrap = $false
  $t.Font = New-Object System.Drawing.Font('Consolas', 9.5)
  $t.Location = New-Object System.Drawing.Point(10, 10)
  $t.Size = New-Object System.Drawing.Size(824, 460)
  $t.Anchor = 'Top, Bottom, Left, Right'
  $f.Controls.Add($t)
  $script:regBot = $bot; $script:regTxt = $t
  $carregar = {
    $p = $script:regBot.Pasta
    $s = LerLog (Join-Path $p 'logs\bot.log')
    $e = LerLog (Join-Path $p 'logs\erros.log')
    $txt = $s
    if ($e.Trim()) { $txt += "`r`n----- ERROS -----`r`n$e" }
    if (-not $txt.Trim()) { $txt = 'Ainda não há registro: ligue o bot pelo Inicializador.' }
    $script:regTxt.Text = ($txt -replace "(?<!`r)`n", "`r`n")
    $script:regTxt.SelectionStart = $script:regTxt.Text.Length
    $script:regTxt.ScrollToCaret()
  }
  $b = NovoBotaoEm $f 'Atualizar' 10 478 110
  $b.Anchor = 'Bottom, Left'
  $b.Add_Click($carregar)
  Tematizar $f
  $t.BackColor = [System.Drawing.Color]::FromArgb(8, 6, 12); $t.ForeColor = [System.Drawing.Color]::FromArgb(216, 208, 230); $t.BorderStyle = 'None'
  $f.Add_Shown($carregar)
  [void]$f.ShowDialog()
}

# ---------------- trazer os dados de outro bot ----------------
function NomeDe([string]$pasta) {
  try { return (Get-Content -LiteralPath (Join-Path $pasta 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json).nome } catch { return '(sem nome)' }
}
function UltimaMudanca($arquivos) {
  if (-not $arquivos) { return $null }
  return ($arquivos | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
}
# Copia a pasta "data" e o ".env" de $origem para $destino. Nada é apagado: o que o destino tinha vai para "data-backup-...".
function CopiarDados([string]$origem, [string]$destino) {
  $dataOrigem = Join-Path $origem 'data'
  $arqOrigem = @(Get-ChildItem -LiteralPath $dataOrigem -Filter '*.json' -File -ErrorAction SilentlyContinue)
  if ($arqOrigem.Count -eq 0) { Aviso "Essa pasta não tem dados de bot (a pasta data está vazia ou não existe).`n`n$origem" 'Warning'; return $false }
  $dataDestino = Join-Path $destino 'data'
  $arqDestino = @(Get-ChildItem -LiteralPath $dataDestino -Filter '*.json' -File -ErrorAction SilentlyContinue)
  $ultOrigem = UltimaMudanca $arqOrigem
  $ultDestino = UltimaMudanca $arqDestino
  $temEnv = Test-Path -LiteralPath (Join-Path $origem '.env')
  $linhas = @("DE: $(NomeDe $origem)", $origem, "$($arqOrigem.Count) arquivo(s) de dados · última atividade em $($ultOrigem.ToString($fmt))", '', "PARA: $(NomeDe $destino)", $destino, '')
  if ($temEnv) { $linhas += 'O token (.env) também vem junto.' } else { $linhas += 'Não achei o .env no outro bot: configure o token depois.' }
  $icone = 'Question'
  if ($arqDestino.Count -gt 0) {
    $linhas += "Os $($arqDestino.Count) arquivo(s) de dados que este bot já tem vão para uma cópia de segurança."
    if ($ultDestino -gt $ultOrigem) {
      $linhas += ''; $linhas += "ATENÇÃO: este bot tem dados MAIS NOVOS ($($ultDestino.ToString($fmt))) que o outro ($($ultOrigem.ToString($fmt))). Confira se escolheu certo."
      $icone = 'Warning'
    }
  }
  $linhas += ''; $linhas += 'Copiar agora?'
  if (-not (Pergunta ($linhas -join "`n") $icone)) { return $false }
  $carimbo = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
  $backup = $null
  if (Test-Path -LiteralPath $dataDestino) {
    $backup = Join-Path $destino "data-backup-$carimbo"
    Move-Item -LiteralPath $dataDestino -Destination $backup
  }
  Copy-Item -LiteralPath $dataOrigem -Destination $dataDestino -Recurse -Force
  if ($temEnv) {
    $envDestino = Join-Path $destino '.env'
    if (Test-Path -LiteralPath $envDestino) { Copy-Item -LiteralPath $envDestino -Destination (Join-Path $destino ".env.backup-$carimbo") -Force }
    Copy-Item -LiteralPath (Join-Path $origem '.env') -Destination $envDestino -Force
  }
  $fim = @("Pronto! $($arqOrigem.Count) arquivo(s) de dados copiados.")
  if ($backup) { $fim += "Os dados que este bot tinha estão guardados em: $(Split-Path $backup -Leaf)" }
  $fim += ''; $fim += 'Agora é só clicar em Ligar. Depois de conferir que está tudo certo, você pode apagar o bot antigo.'
  Aviso ($fim -join "`n")
  return $true
}
function TransferirDados($destino) {
  if (ProcessoDoBot $destino.Pasta) { Aviso "Pare o bot $($destino.Nome) antes de trazer os dados." 'Warning'; return }
  $outros = @($script:bots | Where-Object { $_.Pasta -ne $destino.Pasta -and $_.Dados -gt 0 } | Sort-Object @{ Expression = { $_.Nome -eq $destino.Nome }; Descending = $true }, @{ Expression = { $_.Atividade }; Descending = $true })
  $f = NovaJanela "Trazer dados para $($destino.Nome)" 680 430
  $f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false; $f.MinimizeBox = $false
  $r = New-Object System.Windows.Forms.Label
  $r.Text = "Escolha o bot ANTIGO de onde vêm os dados (XP, dinheiro, configurações, personalização) e o token. Eles vão para:`n$($destino.Pasta)"
  $r.Location = New-Object System.Drawing.Point(16, 14); $r.Size = New-Object System.Drawing.Size(630, 48)
  $f.Controls.Add($r)
  $lb = New-Object System.Windows.Forms.ListBox
  $lb.Location = New-Object System.Drawing.Point(16, 70); $lb.Size = New-Object System.Drawing.Size(630, 240)
  $lb.Font = $FONTE; $lb.ItemHeight = 22
  foreach ($o in $outros) {
    $quando = if ($o.Atividade) { $o.Atividade.ToString($fmt) } else { 'sem dados' }
    [void]$lb.Items.Add("$($o.Nome)  ·  dados de $quando  ·  $($o.Pasta)")
  }
  if ($lb.Items.Count) { $lb.SelectedIndex = 0 } else { [void]$lb.Items.Add('(nenhum outro bot com dados na lista: use "Outra pasta...")') }
  $f.Controls.Add($lb)
  $btOk = NovoBotaoEm $f 'Trazer deste bot' 16 326 170; EstiloBotao $btOk 'primario'
  $btOutra = NovoBotaoEm $f 'Outra pasta...' 196 326 140
  $btCancelar = NovoBotaoEm $f 'Cancelar' 526 326 120
  $btOk.Enabled = $outros.Count -gt 0
  $script:tdEscolha = $null
  $btOk.Add_Click({ if ($lb.SelectedIndex -ge 0 -and $lb.SelectedIndex -lt $outros.Count) { $script:tdEscolha = $outros[$lb.SelectedIndex].Pasta; $f.Close() } })
  $lb.Add_DoubleClick({ $btOk.PerformClick() })
  $btOutra.Add_Click({
    $j = New-Object System.Windows.Forms.FolderBrowserDialog
    $j.Description = 'Escolha a pasta do bot ANTIGO (a que tem a pasta data)'
    $j.ShowNewFolderButton = $false
    if ($j.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
      $p = $j.SelectedPath
      if ((Split-Path $p -Leaf) -ieq 'data') { $p = Split-Path $p -Parent }
      $script:tdEscolha = $p; $f.Close()
    }
  })
  $btCancelar.Add_Click({ $f.Close() })
  Tematizar $f
  [void]$f.ShowDialog()
  $origem = $script:tdEscolha
  if (-not $origem) { return }
  if ($origem.TrimEnd('\') -ieq $destino.Pasta.TrimEnd('\')) { Aviso 'Você escolheu a pasta deste mesmo bot.' 'Warning'; return }
  if (ProcessoDoBot $origem) {
    if (-not (Pergunta "O bot de onde vêm os dados está ligado. Desligar ele agora (para os dados ficarem completos)?" 'Warning')) { return }
    PararBot $origem
  }
  try { [void](CopiarDados $origem $destino.Pasta) } catch { Aviso "Algo deu errado e nada foi apagado.`n`n$($_.Exception.Message)" 'Error' }
}

function SiteDaLoja($bot) {
  if ($bot.Licenca -and $bot.Licenca.site) { return ([string]$bot.Licenca.site).TrimEnd('/') }
  return $null
}

# ---------------- janela principal ----------------
GarantirIcone
$primeiraVez = AtualizarAtalhos

$form = NovaJanela $titulo 1080 660
$form.MinimumSize = New-Object System.Drawing.Size(980, 560)

$topo = New-Object System.Windows.Forms.Panel
$topo.Dock = 'Top'; $topo.Height = 84; $topo.BackColor = $Cor.Painel
$form.Controls.Add($topo)
$logo = New-Object System.Windows.Forms.PictureBox
$logo.Location = New-Object System.Drawing.Point(22, 18); $logo.Size = New-Object System.Drawing.Size(48, 48)
$logo.SizeMode = 'StretchImage'; $logo.Image = DesenharLogo 96
$topo.Controls.Add($logo)
$nomeApp = New-Object System.Windows.Forms.Label
$nomeApp.Text = 'Bots ByteUP'; $nomeApp.Font = $FONTE_T; $nomeApp.ForeColor = $Cor.Texto
$nomeApp.Location = New-Object System.Drawing.Point(82, 12); $nomeApp.AutoSize = $true
$topo.Controls.Add($nomeApp)
$rotulo = New-Object System.Windows.Forms.Label
$rotulo.Location = New-Object System.Drawing.Point(84, 50); $rotulo.Size = New-Object System.Drawing.Size(960, 22)
$rotulo.Anchor = 'Top, Left, Right'; $rotulo.ForeColor = $Cor.Suave; $rotulo.Font = $FONTE
$rotulo.Text = 'Escolha o bot e use os botões abaixo.'
$topo.Controls.Add($rotulo)
$faixa = New-Object System.Windows.Forms.Panel
$faixa.Dock = 'Top'; $faixa.Height = 3; $faixa.BackColor = $Cor.RoxoEsc
$form.Controls.Add($faixa)
$faixa.BringToFront()

$grade = New-Object System.Windows.Forms.DataGridView
$grade.Location = New-Object System.Drawing.Point(22, 106)
$grade.Size = New-Object System.Drawing.Size(1020, 330)
$grade.Anchor = 'Top, Bottom, Left, Right'
$grade.BackgroundColor = $Cor.Painel; $grade.BorderStyle = 'None'; $grade.GridColor = $Cor.Borda
$grade.CellBorderStyle = 'SingleHorizontal'
$grade.RowHeadersVisible = $false
$grade.AllowUserToAddRows = $false; $grade.AllowUserToDeleteRows = $false; $grade.AllowUserToResizeRows = $false; $grade.AllowUserToOrderColumns = $false
$grade.ReadOnly = $true; $grade.SelectionMode = 'FullRowSelect'; $grade.MultiSelect = $false
$grade.EnableHeadersVisualStyles = $false
$grade.ColumnHeadersBorderStyle = 'None'
$grade.ColumnHeadersHeightSizeMode = 'DisableResizing'; $grade.ColumnHeadersHeight = 40
$grade.ColumnHeadersDefaultCellStyle.BackColor = $Cor.Painel2
$grade.ColumnHeadersDefaultCellStyle.ForeColor = $Cor.Suave
$grade.ColumnHeadersDefaultCellStyle.SelectionBackColor = $Cor.Painel2
$grade.ColumnHeadersDefaultCellStyle.Font = $FONTE_B
$grade.ColumnHeadersDefaultCellStyle.Padding = New-Object System.Windows.Forms.Padding(10, 0, 0, 0)
$grade.DefaultCellStyle.BackColor = $Cor.Painel
$grade.DefaultCellStyle.ForeColor = $Cor.Texto
$grade.DefaultCellStyle.SelectionBackColor = $Cor.Selecao
$grade.DefaultCellStyle.SelectionForeColor = [System.Drawing.Color]::White
$grade.DefaultCellStyle.Font = $FONTE
$grade.DefaultCellStyle.Padding = New-Object System.Windows.Forms.Padding(10, 0, 0, 0)
$grade.RowTemplate.Height = 42
$grade.AutoSizeColumnsMode = 'Fill'
foreach ($col in @(@('Bot', 20), @('Estado', 12), @('Situação', 13), @('Versão de', 13), @('Última atividade', 14), @('Pasta', 32))) {
  $i = $grade.Columns.Add(($col[0] -replace '\W', ''), $col[0])
  $grade.Columns[$i].FillWeight = $col[1]
  $grade.Columns[$i].SortMode = 'NotSortable'
}
$form.Controls.Add($grade)

$script:botoes = @()
function NovoBotao([string]$texto, [int]$x, [int]$y, [int]$largura, [string]$tipo = 'normal') {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $texto
  $b.Location = New-Object System.Drawing.Point($x, $y)
  $b.Size = New-Object System.Drawing.Size($largura, 38)
  $b.Anchor = 'Bottom, Left'
  EstiloBotao $b $tipo
  $form.Controls.Add($b)
  return $b
}
$y1 = 452; $y2 = 500
$btIniciar = NovoBotao '▶  Ligar' 22 $y1 130 'primario'
$btParar = NovoBotao '■  Parar' 160 $y1 120
$btConfig = NovoBotao '⚙  Configurar' 288 $y1 150
$btPersonalizar = NovoBotao '✎  Personalizar' 446 $y1 160
$btTransferir = NovoBotao '⇄  Trazer dados de outro bot' 614 $y1 250
$btRegistro = NovoBotao '☰  Registro' 872 $y1 130
$btWindows = NovoBotao 'Ligar com o Windows' 22 $y2 210
$btAbrir = NovoBotao 'Abrir pasta' 240 $y2 130
$btLoja = NovoBotao 'Minhas compras' 378 $y2 160
$btProcurar = NovoBotao 'Procurar de novo' 546 $y2 170
$btApagar = NovoBotao 'Apagar (Lixeira)' 724 $y2 170 'perigo'
$dica = New-Object System.Windows.Forms.Label
$dica.Location = New-Object System.Drawing.Point(24, 552); $dica.Size = New-Object System.Drawing.Size(1000, 40)
$dica.Anchor = 'Bottom, Left, Right'; $dica.ForeColor = $Cor.Suave; $dica.Font = $FONTE_P
$dica.Text = 'Dica: abra pelo atalho "Bots ByteUP" (Área de Trabalho ou Menu Iniciar). O bot continua ligado depois que você fecha esta janela.'
$form.Controls.Add($dica)

$script:bots = @()

function TextoEstado([string]$e) {
  switch ($e) { 'Ligado' { return '●  Ligado' } 'Configurar' { return '⚙  Configurar' } default { return '○  Desligado' } }
}
function CorEstado([string]$e) {
  switch ($e) { 'Ligado' { return $Cor.Verde } 'Configurar' { return $Cor.Amarelo } default { return $Cor.Suave } }
}
function Preencher {
  $grade.Rows.Clear()
  foreach ($b in $script:bots) {
    $e = EstadoTexto $b
    $ativ = 'sem dados'; if ($b.Atividade) { $ativ = $b.Atividade.ToString($fmt) }
    $i = $grade.Rows.Add($b.Nome, (TextoEstado $e), $b.Situacao, $b.Versao.ToString($fmt), $ativ, $b.Pasta)
    $linha = $grade.Rows[$i]
    $linha.Tag = $b
    $linha.Cells[1].Style.ForeColor = (CorEstado $e)
    if ($b.Situacao -like '*antigo' -or $b.Antigo) { $linha.DefaultCellStyle.ForeColor = $Cor.Suave }
    if ($b.Antigo) { $linha.Cells[2].Style.ForeColor = $Cor.Amarelo }
  }
  $grade.ClearSelection()
  if ($grade.Rows.Count -gt 0) {
    $escolher = 0
    for ($k = 0; $k -lt $script:bots.Count; $k++) { if ($script:bots[$k].Situacao -eq 'mais novo') { $escolher = $k; break } }
    $grade.Rows[$escolher].Selected = $true
    $grade.CurrentCell = $grade.Rows[$escolher].Cells[0]
  }
  $copias = @($script:bots | Where-Object { $_.Situacao -like '*antigo' }).Count
  $antigos = @($script:bots | Where-Object { $_.Antigo }).Count
  if ($script:bots.Count -eq 0) {
    $rotulo.Text = 'Não achei nenhum bot da loja no seu PC. Extraia o .zip do bot numa pasta e clique em "Procurar de novo".'
  } elseif ($antigos -gt 0) {
    $rotulo.Text = "Achei $($script:bots.Count) bot(s). $antigos é(são) de antes da licença: baixe de novo em Minhas compras e use ""Trazer dados de outro bot""."
  } elseif ($copias -gt 0) {
    $rotulo.Text = "Achei $($script:bots.Count) bot(s). Há $copias cópia(s) antiga(s) de um mesmo bot (em cinza): depois de trazer os dados para o mais novo, pode apagar a antiga."
  } else {
    $rotulo.Text = "Achei $($script:bots.Count) bot(s). Escolha um e clique em Ligar (na primeira vez, ele abre a configuração)."
  }
  AtualizarBotoes
}
function AtualizarEstados {
  foreach ($linha in $grade.Rows) {
    $e = EstadoTexto $linha.Tag
    $t = TextoEstado $e
    if ($linha.Cells[1].Value -ne $t) { $linha.Cells[1].Value = $t; $linha.Cells[1].Style.ForeColor = (CorEstado $e) }
  }
  AtualizarBotoes
}
function BotEscolhido {
  if ($grade.SelectedRows.Count -eq 0) { return $null }
  return $grade.SelectedRows[0].Tag
}
function AtualizarBotoes {
  $b = BotEscolhido
  $ligado = $b -and (ProcessoDoBot $b.Pasta)
  $btIniciar.Enabled = $b -and -not $ligado -and -not $b.Antigo
  $btParar.Enabled = [bool]$ligado
  foreach ($x in @($btConfig, $btRegistro, $btWindows, $btAbrir, $btApagar, $btTransferir, $btPersonalizar)) { $x.Enabled = [bool]$b }
  $btLoja.Enabled = [bool]($b -and (SiteDaLoja $b))
  if ($b -and (Test-Path -LiteralPath (AtalhoInicio $b))) { $btWindows.Text = 'Não ligar com o Windows' } else { $btWindows.Text = 'Ligar com o Windows' }
}

function Carregar([bool]$procurarDeNovo) {
  $pastas = @()
  if (-not $procurarDeNovo) { $pastas = LerCache }
  if ($pastas.Count -eq 0) {
    $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
    $rotulo.Text = 'Procurando os seus bots no PC (na primeira vez pode levar alguns minutos)...'
    [System.Windows.Forms.Application]::DoEvents()
    $pastas = @(Procurar $rotulo)
    $form.Cursor = [System.Windows.Forms.Cursors]::Default
    SalvarCache $pastas
  }
  foreach ($p in $pastas) { Desbloquear $p }
  $script:bots = @($pastas | ForEach-Object { InfoBot $_ } | Sort-Object Nome, Versao)
  MarcarSituacao $script:bots
  Preencher
  AtualizarEstados
}

function Selecionado {
  $b = BotEscolhido
  if (-not $b) { Aviso 'Escolha um bot na lista.' }
  return $b
}

$btIniciar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  if ($b.Antigo) { Aviso "Este bot foi baixado antes da licença da loja e não liga mais por aqui.`n`nBaixe de novo em Minhas compras, extraia e use ""Trazer dados de outro bot"" no bot novo." 'Warning'; return }
  if ($b.Situacao -like '*antigo') {
    if (-not (Pergunta "Este é uma cópia ANTIGA do bot $($b.Nome). Tem uma versão mais nova na lista.`n`nLigar esta mesmo assim?" 'Warning')) { return }
  }
  $meuToken = (LerEnv $b.Pasta)['DISCORD_TOKEN']
  $outro = $script:bots | Where-Object { $_.Pasta -ne $b.Pasta -and ($_.Nome -eq $b.Nome -or ($meuToken -and (LerEnv $_.Pasta)['DISCORD_TOKEN'] -eq $meuToken)) -and (ProcessoDoBot $_.Pasta) } | Select-Object -First 1
  if ($outro) {
    if (-not (Pergunta "Outro bot com o mesmo token (ou outra cópia deste bot) já está ligado:`n$($outro.Nome) · $($outro.Pasta)`n`nDois ao mesmo tempo com o mesmo token respondem tudo em dobro. Desligar o outro e ligar este?" 'Warning')) { return }
    PararBot $outro.Pasta
  }
  try { IniciarComResultado $b $rotulo } catch { $form.Cursor = [System.Windows.Forms.Cursors]::Default; Aviso "Não consegui ligar: $($_.Exception.Message)" 'Error' }
  AtualizarEstados
})
$grade.Add_CellDoubleClick({ param($s, $e) if ($e.RowIndex -ge 0 -and $btIniciar.Enabled) { $btIniciar.PerformClick() } })
$grade.Add_SelectionChanged({ AtualizarBotoes })

$btParar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
  $rotulo.Text = "Desligando o bot $($b.Nome) (salvando os dados)..."
  PararBot $b.Pasta
  $form.Cursor = [System.Windows.Forms.Cursors]::Default
  $rotulo.Text = "O bot $($b.Nome) foi desligado."
  AtualizarEstados
})
$btConfig.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  $ligado = ProcessoDoBot $b.Pasta
  if (Assistente $b) {
    if ($ligado) {
      if (Pergunta 'Configuração salva. Reiniciar o bot agora para valer?') { PararBot $b.Pasta; IniciarComResultado $b $rotulo }
    } elseif (Pergunta 'Configuração salva. Ligar o bot agora?') { IniciarComResultado $b $rotulo }
  }
  AtualizarEstados
})
$btPersonalizar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  $html = Join-Path $b.Pasta 'Personalizar bot.html'
  if (Test-Path -LiteralPath $html) {
    $rotulo.Text = 'Abrindo o Personalizar bot no navegador. No Discord, use /personalizar baixar e abra o arquivo nele.'
    Start-Process $html
    return
  }
  $site = SiteDaLoja $b
  if ($site) {
    if (Pergunta "O bot $($b.Nome) não tem o módulo Personalização (textos, botões, cores e a configuração dos servidores num painel).`n`nAbrir a loja para adicionar?") { Start-Process "$site/loja/minhas-compras" }
  } else { Aviso "O bot $($b.Nome) não tem o módulo Personalização." }
})
$btTransferir.Add_Click({ $b = Selecionado; if ($b) { TransferirDados $b; Carregar $false } })
$btRegistro.Add_Click({ $b = Selecionado; if ($b) { VerRegistro $b } })
$btWindows.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  if (-not (Test-Path -LiteralPath (AtalhoInicio $b)) -and -not (Configurado $b)) { Aviso 'Configure e ligue o bot uma vez antes (botão Ligar).'; return }
  try { AlternarInicio $b } catch { Aviso "Não consegui: $($_.Exception.Message)" 'Error' }
  AtualizarBotoes
})
$btAbrir.Add_Click({
  $b = Selecionado
  if ($b) { Start-Process explorer.exe -ArgumentList "`"$($b.Pasta)`"" }
})
$btLoja.Add_Click({
  $b = Selecionado
  if ($b -and (SiteDaLoja $b)) { Start-Process "$(SiteDaLoja $b)/loja/minhas-compras" }
})
$btApagar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  if (ProcessoDoBot $b.Pasta) { Aviso 'Este bot está ligado. Clique em Parar antes de apagar.' 'Warning'; return }
  $novo = $script:bots | Where-Object { $_.Nome -eq $b.Nome -and $_.Situacao -eq 'mais novo' } | Select-Object -First 1
  $texto = "Mandar para a Lixeira a pasta do bot $($b.Nome)?`n`n$($b.Pasta)`n`nVersão de $($b.Versao.ToString($fmt))"
  $icone = 'Question'
  if ($novo -and $novo.Pasta -ne $b.Pasta -and $b.Atividade -and (-not $novo.Atividade -or $b.Atividade -gt $novo.Atividade)) {
    $texto += "`n`nATENÇÃO: esta cópia tem dados MAIS RECENTES que a versão nova. Use ""Trazer dados de outro bot"" no bot novo antes, ou você pode perder XP, dinheiro e configurações."
    $icone = 'Warning'
  } elseif ($b.Situacao -eq 'mais novo' -or -not $novo) {
    $texto += "`n`nEsta é a versão mais nova (ou a única) deste bot."
    $icone = 'Warning'
  }
  $texto += "`n`nDá para recuperar pela Lixeira."
  if (-not (Pergunta $texto $icone)) { return }
  try {
    $lnk = AtalhoInicio $b
    if (Test-Path -LiteralPath $lnk) { Remove-Item -LiteralPath $lnk -Force }
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($b.Pasta, 'OnlyErrorDialogs', 'SendToRecycleBin')
    $restantes = @($script:bots | Where-Object { $_.Pasta -ne $b.Pasta } | ForEach-Object { $_.Pasta })
    SalvarCache $restantes
    Carregar $false
  } catch {
    Aviso "Não consegui apagar (algum arquivo está aberto?).`n`n$($_.Exception.Message)" 'Error'
  }
})
$btProcurar.Add_Click({ Carregar $true })

$relogio = New-Object System.Windows.Forms.Timer
$relogio.Interval = 4000
$relogio.Add_Tick({ AtualizarEstados })
$form.Add_Shown({
  Carregar $false
  $relogio.Start()
  if ($primeiraVez) { $rotulo.Text = 'Criei o atalho "Bots ByteUP" na Área de Trabalho e no Menu Iniciar: da próxima vez, abra por ele. ' + $rotulo.Text }
})
$form.Add_FormClosing({
  $relogio.Stop()
  $ligados = @($script:bots | Where-Object { ProcessoDoBot $_.Pasta })
  if ($ligados.Count) {
    [void][System.Windows.Forms.MessageBox]::Show("O bot continua ligado depois que você fechar esta janela.`nPara desligar, abra o Bots ByteUP e clique em Parar.", $titulo, 'OK', 'Information')
  }
})

try {
  [void]$form.ShowDialog()
} catch {
  Aviso "Algo deu errado: $($_.Exception.Message)" 'Error'
  exit 1
}

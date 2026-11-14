# Inicializador de bots (usado pelo "Iniciar bot.bat").
# Acha os bots no PC, faz a primeira configuração por janelas (Node.js, token, intents, servidor),
# instala o que falta, liga o bot sem terminal e deixa parar, ver o registro e ligar junto com o Windows.
# Ninguém precisa digitar comandos.
param([string]$Ligar)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic
[System.Windows.Forms.Application]::EnableVisualStyles()
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$titulo = 'Inicializador de bots'
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
  return ($maior -gt 18) -or ($maior -eq 18 -and $menor -ge 17)
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
function EhBot([string]$pasta) {
  return (Test-Path -LiteralPath (Join-Path $pasta 'index.js')) -and
         (Test-Path -LiteralPath (Join-Path $pasta 'config.json')) -and
         (Test-Path -LiteralPath (Join-Path $pasta 'src\core\nucleo.js'))
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
  try { $mods = @((Get-Content -LiteralPath (Join-Path $pasta 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json).modulos) } catch { $mods = @() }
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
    return @{ ok = $true; nome = $eu.username; appId = [string]$app.id; flags = [int64]$app.flags; erro = $null }
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
function ProcessoDoBot([string]$pasta) {
  $arq = ArqEstado $pasta
  if (-not (Test-Path -LiteralPath $arq)) { return $null }
  try {
    $e = Get-Content -LiteralPath $arq -Raw -Encoding UTF8 | ConvertFrom-Json
    $p = Get-Process -Id ([int]$e.pid) -ErrorAction SilentlyContinue
    if (-not $p -or @('cmd', 'node') -notcontains $p.ProcessName) { return $null }
    # o Windows reaproveita números de processo: confere a hora em que começou
    if ([math]::Abs(($p.StartTime - [datetime]$e.inicio).TotalSeconds) -gt 10) { return $null }
    return $p
  } catch { return $null }
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
  $sh = New-Object -ComObject WScript.Shell
  $a = $sh.CreateShortcut($lnk)
  $a.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $a.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -Ligar `"$($bot.Pasta)`""
  $a.WorkingDirectory = $bot.Pasta
  $a.WindowStyle = 7
  $a.Description = "Liga o bot $($bot.Nome)"
  $a.Save()
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
  $versao = (Get-Item -LiteralPath (Join-Path $pasta 'index.js')).LastWriteTime
  $dados = @(Get-ChildItem -LiteralPath (Join-Path $pasta 'data') -Filter '*.json' -File -ErrorAction SilentlyContinue)
  $atividade = $null
  if ($dados.Count -gt 0) { $atividade = ($dados | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime }
  return [pscustomobject]@{ Nome = $nome; Pasta = $pasta; Versao = $versao; Atividade = $atividade; Dados = $dados.Count; Situacao = '' }
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
  foreach ($grupo in ($bots | Group-Object Nome)) {
    if ($grupo.Count -lt 2) { continue }
    $ordem = @($grupo.Group | Sort-Object Versao -Descending)
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
$VERDE = [System.Drawing.Color]::FromArgb(0, 128, 60)
$VERMELHO = [System.Drawing.Color]::FromArgb(190, 30, 30)

# Abre o assistente. Devolve $true se o bot ficou pronto para ligar.
function Assistente($bot) {
  $script:wz = @{ bot = $bot; nodeOk = $false; tokenOk = $false; intentsOk = $false; info = $null; precisa = (IntentsNecessarios $bot.Pasta) }
  $env0 = LerEnv $bot.Pasta

  $f = New-Object System.Windows.Forms.Form
  $f.Text = "Configurar o bot $($bot.Nome)"
  $f.Size = New-Object System.Drawing.Size(680, 690)
  $f.StartPosition = 'CenterScreen'
  $f.FormBorderStyle = 'FixedDialog'
  $f.MaximizeBox = $false
  $f.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)
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
  $script:wz.btOk = NovoBotaoEm $f 'Instalar e ligar o bot' 392 608 160
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
    if (-not $g) { $w.st4.Text = 'Pode deixar vazio.'; $w.st4.ForeColor = [System.Drawing.Color]::Gray }
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
    $w.st2.Text = 'Conferindo com o Discord...'; $w.st2.ForeColor = [System.Drawing.Color]::Gray
    $w.form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor; [System.Windows.Forms.Application]::DoEvents()
    $r = ConferirToken $t
    $w.form.Cursor = [System.Windows.Forms.Cursors]::Default
    if ($r.ok) {
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
  } elseif ($e -match 'disallowed intents|Privileged Gateway') {
    if (Pergunta "Faltam permissões especiais (intents) no Developer Portal.`n`nAbrir a configuração para conferir?" 'Warning') { if (Assistente $bot) { IniciarComResultado $bot $rotulo } }
  } else {
    if ($e.Length -gt 1500) { $e = $e.Substring($e.Length - 1500) }
    Aviso "O bot não ligou.`n`n$e`n`nSe não entender, use ""Ver registro"" e mande o print para o suporte." 'Error'
  }
}

# ---------------- registro ----------------
function VerRegistro($bot) {
  $f = New-Object System.Windows.Forms.Form
  $f.Text = "Registro do bot $($bot.Nome)"
  $f.Size = New-Object System.Drawing.Size(860, 560)
  $f.StartPosition = 'CenterScreen'
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
  $b = NovoBotaoEm $f 'Atualizar' 10 480 110
  $b.Anchor = 'Bottom, Left'
  $b.Add_Click($carregar)
  $f.Add_Shown($carregar)
  [void]$f.ShowDialog()
}

# ---------------- janela principal ----------------
$form = New-Object System.Windows.Forms.Form
$form.Text = $titulo
$form.Size = New-Object System.Drawing.Size(940, 500)
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)

$rotulo = New-Object System.Windows.Forms.Label
$rotulo.Location = New-Object System.Drawing.Point(12, 10)
$rotulo.Size = New-Object System.Drawing.Size(900, 36)
$rotulo.Text = 'Escolha o bot e use os botões abaixo.'
$form.Controls.Add($rotulo)

$lista = New-Object System.Windows.Forms.ListView
$lista.Location = New-Object System.Drawing.Point(12, 50)
$lista.Size = New-Object System.Drawing.Size(900, 340)
$lista.View = 'Details'
$lista.FullRowSelect = $true
$lista.MultiSelect = $false
$lista.HideSelection = $false
[void]$lista.Columns.Add('Bot', 150)
[void]$lista.Columns.Add('Estado', 85)
[void]$lista.Columns.Add('Situação', 85)
[void]$lista.Columns.Add('Versão de', 115)
[void]$lista.Columns.Add('Última atividade', 115)
[void]$lista.Columns.Add('Pasta', 330)
$form.Controls.Add($lista)

function NovoBotao([string]$texto, [int]$x, [int]$largura) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $texto
  $b.Location = New-Object System.Drawing.Point($x, 402)
  $b.Size = New-Object System.Drawing.Size($largura, 34)
  $form.Controls.Add($b)
  return $b
}
$btIniciar = NovoBotao 'Ligar' 12 90
$btParar = NovoBotao 'Parar' 106 80
$btConfig = NovoBotao 'Configurar' 190 100
$btRegistro = NovoBotao 'Ver registro' 294 105
$btWindows = NovoBotao 'Ligar com o Windows' 403 150
$btAbrir = NovoBotao 'Abrir pasta' 557 100
$btApagar = NovoBotao 'Apagar (Lixeira)' 661 125
$btProcurar = NovoBotao 'Procurar de novo' 790 122
$form.AcceptButton = $btIniciar

$script:bots = @()

function Preencher {
  $lista.Items.Clear()
  foreach ($b in $script:bots) {
    $it = New-Object System.Windows.Forms.ListViewItem($b.Nome)
    [void]$it.SubItems.Add((EstadoTexto $b))
    [void]$it.SubItems.Add($b.Situacao)
    [void]$it.SubItems.Add($b.Versao.ToString($fmt))
    if ($b.Atividade) { [void]$it.SubItems.Add($b.Atividade.ToString($fmt)) } else { [void]$it.SubItems.Add('sem dados') }
    [void]$it.SubItems.Add($b.Pasta)
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
    $rotulo.Text = "Achei $($script:bots.Count) bot(s). Escolha um e clique em Ligar (na primeira vez, ele abre a configuração)."
  }
  AtualizarBotoes
}
function AtualizarEstados {
  foreach ($it in $lista.Items) {
    $e = EstadoTexto $it.Tag
    if ($it.SubItems[1].Text -ne $e) { $it.SubItems[1].Text = $e }
    if ($e -eq 'Ligado') { $it.ForeColor = $VERDE } elseif ($it.Tag.Situacao -like '*antigo') { $it.ForeColor = [System.Drawing.Color]::Gray } else { $it.ForeColor = [System.Drawing.SystemColors]::WindowText }
  }
  AtualizarBotoes
}
function AtualizarBotoes {
  $b = $null
  if ($lista.SelectedItems.Count) { $b = $lista.SelectedItems[0].Tag }
  $ligado = $b -and (ProcessoDoBot $b.Pasta)
  $btIniciar.Enabled = $b -and -not $ligado
  $btParar.Enabled = [bool]$ligado
  if ($b -and (Test-Path -LiteralPath (AtalhoInicio $b))) { $btWindows.Text = 'Não ligar com o Windows' } else { $btWindows.Text = 'Ligar com o Windows' }
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
  foreach ($p in $pastas) { Desbloquear $p }
  $script:bots = @($pastas | ForEach-Object { InfoBot $_ } | Sort-Object Nome, Versao)
  MarcarSituacao $script:bots
  Preencher
  AtualizarEstados
}

function Selecionado {
  if ($lista.SelectedItems.Count -eq 0) { Aviso 'Escolha um bot na lista.'; return $null }
  return $lista.SelectedItems[0].Tag
}

$btIniciar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  if ($b.Situacao -like '*antigo') {
    if (-not (Pergunta "Este é uma cópia ANTIGA do bot $($b.Nome). Tem uma versão mais nova na lista.`n`nLigar esta mesmo assim?" 'Warning')) { return }
  }
  $outro = $script:bots | Where-Object { $_.Nome -eq $b.Nome -and $_.Pasta -ne $b.Pasta -and (ProcessoDoBot $_.Pasta) } | Select-Object -First 1
  if ($outro) {
    if (-not (Pergunta "Outra cópia deste bot já está ligada:`n$($outro.Pasta)`n`nDois ao mesmo tempo com o mesmo token não funcionam. Desligar a outra e ligar esta?" 'Warning')) { return }
    PararBot $outro.Pasta
  }
  try { IniciarComResultado $b $rotulo } catch { $form.Cursor = [System.Windows.Forms.Cursors]::Default; Aviso "Não consegui ligar: $($_.Exception.Message)" 'Error' }
  AtualizarEstados
})
$lista.Add_DoubleClick({ if ($btIniciar.Enabled) { $btIniciar.PerformClick() } })
$lista.Add_SelectedIndexChanged({ AtualizarBotoes })

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
$btApagar.Add_Click({
  $b = Selecionado
  if (-not $b) { return }
  if (ProcessoDoBot $b.Pasta) { Aviso 'Este bot está ligado. Clique em Parar antes de apagar.' 'Warning'; return }
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
$form.Add_Shown({ Carregar $false; $relogio.Start() })
$form.Add_FormClosing({
  $relogio.Stop()
  $ligados = @($script:bots | Where-Object { ProcessoDoBot $_.Pasta })
  if ($ligados.Count) {
    [void][System.Windows.Forms.MessageBox]::Show("O bot continua ligado depois que você fechar esta janela.`nPara desligar, abra o Inicializador e clique em Parar.", $titulo, 'OK', 'Information')
  }
})

try {
  [void]$form.ShowDialog()
} catch {
  Aviso "Algo deu errado: $($_.Exception.Message)" 'Error'
  exit 1
}

# Transferidor de dados do bot (usado pelo "Transferir dados.bat").
# Copia a pasta "data" e o arquivo ".env" de um bot antigo para este bot (a pasta onde este arquivo está).
# Nada é apagado: os dados que este bot já tinha vão para uma pasta "data-backup-...".

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()

$titulo = 'Transferir dados do bot'
function Aviso([string]$texto, [string]$icone = 'Information') {
  [void][System.Windows.Forms.MessageBox]::Show($texto, $titulo, 'OK', $icone)
}
function UltimaMudanca($arquivos) {
  if (-not $arquivos) { return $null }
  return ($arquivos | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
}
function NomeDoBot([string]$pasta) {
  try { return (Get-Content (Join-Path $pasta 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json).nome } catch { return '(sem nome)' }
}

try {
  $destino = $PSScriptRoot
  if (-not (Test-Path (Join-Path $destino 'index.js')) -or -not (Test-Path (Join-Path $destino 'config.json'))) {
    Aviso "Este arquivo precisa ficar dentro da pasta do bot NOVO (junto do index.js).`n`nPasta atual:`n$destino" 'Warning'
    exit 1
  }

  # 1) escolher a pasta do bot antigo
  $janela = New-Object System.Windows.Forms.FolderBrowserDialog
  $janela.Description = 'Escolha a pasta do bot ANTIGO (a que tem os dados que você quer manter)'
  $janela.ShowNewFolderButton = $false
  if ($janela.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }
  $origem = $janela.SelectedPath

  # se escolheu a própria pasta "data", sobe um nível
  if ((Split-Path $origem -Leaf) -ieq 'data' -and (Test-Path (Join-Path (Split-Path $origem -Parent) 'config.json'))) {
    $origem = Split-Path $origem -Parent
  }
  if ((Resolve-Path $origem).Path.TrimEnd('\') -ieq (Resolve-Path $destino).Path.TrimEnd('\')) {
    Aviso 'Você escolheu a pasta deste mesmo bot. Escolha a pasta do bot ANTIGO.' 'Warning'
    exit 1
  }

  # 2) conferir se é mesmo um bot com dados
  $dataOrigem = Join-Path $origem 'data'
  $arqOrigem = @(Get-ChildItem $dataOrigem -Filter '*.json' -File -ErrorAction SilentlyContinue)
  if (-not (Test-Path (Join-Path $origem 'config.json')) -or $arqOrigem.Count -eq 0) {
    Aviso "Essa pasta não parece ser um bot com dados (não achei config.json e a pasta data com arquivos).`n`n$origem" 'Warning'
    exit 1
  }

  $dataDestino = Join-Path $destino 'data'
  $arqDestino = @(Get-ChildItem $dataDestino -Filter '*.json' -File -ErrorAction SilentlyContinue)
  $ultimaOrigem = UltimaMudanca $arqOrigem
  $ultimaDestino = UltimaMudanca $arqDestino
  $temEnv = Test-Path (Join-Path $origem '.env')
  $fmt = 'dd/MM/yyyy HH:mm'

  # 3) resumo e confirmação
  $linhas = @(
    "DE (bot antigo): $(NomeDoBot $origem)",
    $origem,
    "$($arqOrigem.Count) arquivo(s) de dados · última atividade em $($ultimaOrigem.ToString($fmt))",
    '',
    "PARA (este bot): $(NomeDoBot $destino)",
    $destino,
    ''
  )
  if ($temEnv) { $linhas += 'O token (.env) também será copiado.' } else { $linhas += 'Não achei o .env no bot antigo: configure o token depois.' }
  if ($arqDestino.Count -gt 0) {
    $linhas += "Os $($arqDestino.Count) arquivo(s) de dados que este bot já tem vão para uma cópia de segurança."
    if ($ultimaDestino -gt $ultimaOrigem) {
      $linhas += ''
      $linhas += "ATENÇÃO: este bot tem dados MAIS NOVOS ($($ultimaDestino.ToString($fmt))) que o antigo ($($ultimaOrigem.ToString($fmt))). Confira se escolheu as pastas certas."
    }
  }
  $linhas += ''
  $linhas += 'Antes de continuar, DESLIGUE o bot antigo (feche o terminal dele).'
  $linhas += ''
  $linhas += 'Copiar agora?'
  $icone = if ($ultimaDestino -and $ultimaDestino -gt $ultimaOrigem) { 'Warning' } else { 'Question' }
  $resp = [System.Windows.Forms.MessageBox]::Show(($linhas -join "`n"), $titulo, 'YesNo', $icone)
  if ($resp -ne [System.Windows.Forms.DialogResult]::Yes) { exit 0 }

  # 4) cópia de segurança do que este bot já tinha
  $carimbo = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
  $backup = $null
  if (Test-Path $dataDestino) {
    $backup = Join-Path $destino "data-backup-$carimbo"
    Move-Item $dataDestino $backup
  }

  # 5) copia os dados e o token
  Copy-Item $dataOrigem $dataDestino -Recurse -Force
  if ($temEnv) {
    $envDestino = Join-Path $destino '.env'
    if (Test-Path $envDestino) { Copy-Item $envDestino (Join-Path $destino ".env.backup-$carimbo") -Force }
    Copy-Item (Join-Path $origem '.env') $envDestino -Force
  }

  # 6) instala as dependências, se ainda não instalou
  $instalou = $true
  if (-not (Test-Path (Join-Path $destino 'node_modules'))) {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
      Write-Host 'Instalando as dependências do bot (npm install)... aguarde.'
      Push-Location $destino
      & npm install --no-audit --no-fund
      $instalou = ($LASTEXITCODE -eq 0)
      Pop-Location
    } else { $instalou = $false }
  }

  $fim = @("Pronto! $($arqOrigem.Count) arquivo(s) de dados copiados.")
  if ($backup) { $fim += "Os dados antigos deste bot estão guardados em: $(Split-Path $backup -Leaf)" }
  if (-not $instalou) { $fim += ''; $fim += 'Falta instalar: abra um terminal nesta pasta e rode  npm install  (precisa do Node.js).' }
  $fim += ''
  $fim += 'Agora é só ligar este bot (npm start). Pode apagar a pasta do bot antigo depois de conferir que está tudo certo.'
  Aviso ($fim -join "`n")
  exit 0
} catch {
  Aviso "Algo deu errado e nada foi apagado.`n`n$($_.Exception.Message)" 'Error'
  exit 1
}

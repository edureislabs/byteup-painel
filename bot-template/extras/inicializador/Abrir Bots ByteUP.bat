@echo off
rem Abre o "Bots ByteUP". Na primeira vez ele cria o atalho "Bots ByteUP" (com icone, sem janela preta) na
rem Area de Trabalho e no Menu Iniciar e esconde este arquivo. Depois, abra sempre por esse atalho.
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File "%~dp0inicializador.ps1"
exit /b

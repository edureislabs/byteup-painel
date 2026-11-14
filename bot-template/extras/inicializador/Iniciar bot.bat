@echo off
rem Abre o "Bots ByteUP" (Inicializador). Depois da primeira vez, use o atalho "Bots ByteUP" que ele cria (sem janela preta).
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File "%~dp0inicializador.ps1"

@echo off
rem Inicializador: dois cliques para configurar e ligar o seu bot (pode ficar em qualquer pasta). Nada de terminal.
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File "%~dp0inicializador.ps1"

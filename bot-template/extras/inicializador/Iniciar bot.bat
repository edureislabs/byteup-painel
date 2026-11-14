@echo off
rem Inicializador: dois cliques para escolher e ligar o seu bot (pode ficar em qualquer pasta).
title Inicializador de bots
powershell -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0inicializador.ps1"
if errorlevel 1 pause

@echo off
rem Transferidor de dados: de dois cliques neste arquivo (ele fica dentro da pasta do bot NOVO).
title Transferir dados do bot
powershell -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0transferir-dados.ps1"
if errorlevel 1 pause

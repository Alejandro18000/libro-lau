@echo off
chcp 65001 > nul
title Libro Interactivo
echo ==============================================================
echo   📖 Iniciando el Libro Interactivo
echo ==============================================================
echo.
echo Abriendo el libro en tu navegador...
start http://localhost:3000
npm run dev

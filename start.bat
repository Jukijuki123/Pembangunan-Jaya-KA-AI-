@echo off
title SIGAP AI Server (Production)
cd /d C:\Users\Lenovo\project\web\Pembangunan-Jaya-KA-AI-
echo ============================================
echo   SIGAP AI - Production Server
echo   http://localhost:3000
echo   Tutup jendela ini = server mati
echo ============================================
call npm run start
echo.
echo Server berhenti. Tekan tombol apa saja...
pause >nul

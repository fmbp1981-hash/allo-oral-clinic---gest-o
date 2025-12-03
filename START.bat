@echo off
echo ========================================
echo  ClinicaFlow - Iniciar Servidores
echo ========================================
echo.
echo Iniciando Backend e Frontend...
echo.
echo [1] Backend rodara em: http://localhost:3001
echo [2] Frontend rodara em: http://localhost:5173
echo.
echo Pressione Ctrl+C para parar os servidores
echo ========================================
echo.

REM Iniciar backend em nova janela
start "ClinicaFlow - Backend" cmd /k "cd backend && npm run dev"

REM Aguardar 3 segundos para backend iniciar
timeout /t 3 /nobreak >nul

REM Iniciar frontend em nova janela
start "ClinicaFlow - Frontend" cmd /k "npm run dev"

echo.
echo Servidores iniciados!
echo.
echo Para acessar o sistema:
echo - Abra o navegador em: http://localhost:5173
echo.
echo Para testar notificacoes:
echo - POST http://localhost:3001/api/notifications
echo.
pause

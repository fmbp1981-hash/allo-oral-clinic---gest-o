@echo off
echo ========================================
echo  ClinicaFlow - Setup Automatizado
echo ========================================
echo.

REM Verificar se está em diretório local ou Google Drive
echo Verificando localizacao do projeto...
cd | findstr /C:"G:\" >nul
if %errorlevel%==0 (
    echo [AVISO] Projeto esta no Google Drive!
    echo Recomendado: Mover para C:\Projects\allo-oral-clinic
    echo.
    choice /C SN /M "Deseja continuar mesmo assim (S) ou Cancelar (N)"
    if errorlevel 2 goto :eof
)

echo.
echo [1/5] Instalando dependencias do FRONTEND...
echo ========================================
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias do frontend
    pause
    goto :eof
)

echo.
echo [2/5] Instalando dependencias do BACKEND...
echo ========================================
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias do backend
    pause
    goto :eof
)
cd..

echo.
echo [3/5] Criando arquivo .env do FRONTEND...
echo ========================================
if not exist .env (
    echo VITE_API_URL=http://localhost:3001 > .env
    echo [OK] Arquivo .env criado
) else (
    echo [INFO] Arquivo .env ja existe
)

echo.
echo [4/5] Verificando .env do BACKEND...
echo ========================================
if not exist backend\.env (
    echo [AVISO] Arquivo backend\.env NAO encontrado!
    echo Por favor, configure manualmente com suas credenciais Supabase
    echo.
) else (
    echo [OK] Arquivo backend\.env encontrado
)

echo.
echo [5/5] Verificando estrutura de pastas...
echo ========================================
if not exist backend\src\services\notification.service.ts (
    echo [ERRO] Arquivo notification.service.ts NAO encontrado!
) else (
    echo [OK] Sistema de notificacoes encontrado
)

echo.
echo ========================================
echo  SETUP CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Proximos passos:
echo 1. Execute a migracao do banco (backend\supabase\migrations\02_add_user_id_to_notifications.sql)
echo 2. Inicie o backend: cd backend ^&^& npm run dev
echo 3. Inicie o frontend: npm run dev
echo 4. Acesse: http://localhost:5173
echo.
pause

@echo off
echo ========================================
echo  Copiando ClinicaFlow para C:\Projects
echo ========================================
echo.
echo Este processo pode levar 2-3 minutos...
echo Por favor, aguarde.
echo.

REM Criar diretório de destino
if not exist "C:\Projects" mkdir "C:\Projects"

REM Copiar projeto
xcopy "%~dp0*" "C:\Projects\allo-oral-clinic\" /E /I /H /Y /EXCLUDE:%~dp0exclude.txt

echo.
echo ========================================
echo  COPIA CONCLUIDA!
echo ========================================
echo.
echo Projeto copiado para: C:\Projects\allo-oral-clinic
echo.
echo Proximos passos:
echo 1. Abra um novo terminal
echo 2. cd C:\Projects\allo-oral-clinic
echo 3. npm install --legacy-peer-deps
echo 4. cd backend
echo 5. npm install
echo.
pause

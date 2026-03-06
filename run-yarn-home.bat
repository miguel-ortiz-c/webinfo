@echo off
chcp 65001 >nul
cls

echo ==========================================
echo   SISTEMA DE OPERACIONES EVERYTEL v1.0
echo ==========================================

:: ==========================================
:: 1. RUTAS BASE (FORMA SEGURA)
:: ==========================================
set "RP=%~dp0"

set "BACK_PATH=%RP%backend"
set "FRONT_PATH=%RP%frontend"
set "BACKUP_PATH=%RP%control_versiones"

echo [INFO] Ruta base: %RP%
echo [INFO] Backend : %BACK_PATH%
echo [INFO] Frontend: %FRONT_PATH%

:: ==========================================
:: 2. BACKUP DEL PROYECTO
:: ==========================================
for /f %%i in ('powershell -NoLogo -Command "Get-Date -Format \"yyyyMMdd_HHmmss\""') do set "DT=%%i"
set "DEST=%BACKUP_PATH%\%DT%"

echo.
echo [1/3] Creando respaldo del sistema...

mkdir "%DEST%\frontend" 2>nul
mkdir "%DEST%\backend" 2>nul

:: Frontend (estatico)
robocopy "%FRONT_PATH%" "%DEST%\frontend" /E /XO /NFL /NDL >nul

:: Backend (sin node_modules)
robocopy "%BACK_PATH%" "%DEST%\backend" /E /XD node_modules /XO /NFL /NDL >nul

:: Copiar .env si existe
if exist "%BACK_PATH%\.env" (
    copy "%BACK_PATH%\.env" "%DEST%\backend\" >nul
)

echo       Backup creado en: control_versiones\%DT%

:: ==========================================
:: 3. VERIFICAR BACKEND
:: ==========================================
echo.
echo [2/3] Verificando backend...

if not exist "%BACK_PATH%\package.json" (
    echo.
    echo [ERROR CRITICO]
    echo No se encontro package.json en:
    echo %BACK_PATH%
    pause
    exit /b
)

if not exist "%BACK_PATH%\node_modules" (
    echo       Instalando dependencias backend...
    cd /d "%BACK_PATH%"
    call npm install

    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b
    )
    echo       Dependencias instaladas correctamente.
) else (
    echo       Dependencias OK.
)

:: ==========================================
:: 4. ARRANQUE DEL SISTEMA
:: ==========================================
echo.
echo [3/3] Iniciando servicios...

:: Backend
cd /d "%BACK_PATH%"
start "BACKEND EVERYTEL - NO CERRAR" cmd /k "node server.js"

:: Frontend (Servido web)
start "" "http://192.168.1.69:9933/"


echo.
echo ==========================================
echo   SISTEMA INICIADO CORRECTAMENTE
echo   - Backend: ejecutandose
echo   - Frontend: abierto en navegador
echo ==========================================
echo.
echo Puedes minimizar esta ventana.
timeout /t 5

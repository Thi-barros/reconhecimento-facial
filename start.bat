@echo off
title Sistema de Controle de Acesso Facial
echo ================================================
echo Iniciando o sistema de controle de acesso facial
echo ================================================
echo.

REM Ativar o ambiente virtual
call "%~dp0.venv\Scripts\activate.bat"

REM Caminho base (pasta onde o script está)
set BASE_DIR=%~dp0

REM Caminho do ambiente virtual
set VENV_DIR=%BASE_DIR%.venv

REM Caminho do Python dentro do venv
set PYTHON_PATH=%VENV_DIR%\Scripts\python.exe

REM Verifica se o Python do venv existe
if not exist "%PYTHON_PATH%" (
    echo Ambiente virtual nao encontrado.
    echo Criando ambiente virtual...
    python -m venv "%VENV_DIR%"
)

REM Ativa o ambiente virtual
echo Ativando ambiente virtual...
call "%VENV_DIR%\Scripts\activate.bat"
if errorlevel 1 (
    echo Falha ao ativar o ambiente virtual.
    pause
    exit /b 1
)

REM Verifica se o Python esta acessível
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado nem no venv.
    pause
    exit /b 1
)
echo Python detectado com sucesso.
python --version
echo.

REM Entrando no backend
cd /d "%BASE_DIR%backend"

REM Verifica se dependências básicas estão instaladas
echo Verificando dependencias...
python -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias basicas...
    pip install fastapi uvicorn python-multipart opencv-python pillow numpy sqlalchemy >nul 2>&1
)

echo.
echo Escolha o modo de execucao:
echo [1] - Modo Teste
echo [2] - Modo Producao
echo.
set /p choice=Digite a opcao desejada (1 ou 2): 

if "%choice%"=="1" (
    echo Iniciando em modo TESTE...
    echo.
    uvicorn main:app --host 127.0.0.1 --port 8000
    pause
    exit /b 0
)

if "%choice%"=="2" (
    echo Iniciando em modo PRODUCAO...
    echo Verificando dependencias adicionais...
    python -c "import face_recognition" >nul 2>&1
    if errorlevel 1 (
        echo Instalando dependencias de producao...
        pip install face_recognition dlib cmake >nul 2>&1
    )
    echo.
    echo Abrindo sistema:
    echo - API: http://127.0.0.1:8000
    echo - Interface Web: http://127.0.0.1:3000
    echo.
    python main.py
    pause
    exit /b 0
)

echo Opcao invalida. Execute novamente e escolha 1 ou 2.
pause
exit /b 1

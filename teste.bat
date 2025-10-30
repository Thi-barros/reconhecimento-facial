@echo off
REM Executar Backend e Frontend do projeto

REM ------------------------------
REM Rodar Backend (FastAPI)
REM ------------------------------
echo Iniciando backend...
start cmd /k "cd /d %~dp0\backend && .venv\Scripts\activate && python main.py"

REM ------------------------------
REM Rodar Frontend (React)
REM ------------------------------
echo Iniciando frontend...
start cmd /k "cd /d %~dp0\frontend && npm start"

echo Todos os serviços iniciados.
pause

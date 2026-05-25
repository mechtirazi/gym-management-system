@echo off
echo ============================================
echo   GYM MANAGEMENT SYSTEM - Railway Deploy
echo ============================================
echo.

echo [1/6] Checking Railway login...
railway whoami
if %errorlevel% neq 0 (
    echo Not logged in. Opening browser login...
    railway login
)

echo.
echo [2/6] Creating Railway project...
railway init --name gym-management-system

echo.
echo [3/6] Adding MySQL database...
railway add --plugin mysql

echo.
echo [4/6] Adding Redis...
railway add --plugin redis

echo.
echo [5/6] Deploying Backend (gym-api)...
cd gym-api
railway up --service gym-api --detach
cd ..

echo.
echo [6/6] Deploying Frontend (gym-UI)...
cd gym-UI
railway up --service gym-ui --detach
cd ..

echo.
echo ============================================
echo   DONE! Check your Railway dashboard at:
echo   https://railway.app/dashboard
echo ============================================
pause

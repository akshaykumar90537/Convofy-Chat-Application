@echo off
:: Change directory to the folder where this batch file is located
cd /d "%~dp0"

echo ==========================================
echo Pulling latest changes from GitHub...
echo ==========================================
git pull origin main --no-edit

echo.
echo ==========================================
echo Pushing Convofy changes to GitHub...
echo ==========================================
git push origin main
echo.
echo ==========================================
echo Push completed! Press any key to close.
echo ==========================================
pause

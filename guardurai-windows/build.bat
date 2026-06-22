@echo off
echo ============================================
echo  Guardurai Windows — Build to .exe
echo ============================================
echo.

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found.
    echo Download it from https://www.python.org/downloads/
    echo Make sure to tick "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 ( echo Dependency install failed. & pause & exit /b 1 )

echo [2/3] Building Guardurai.exe ...
pyinstaller ^
    --onefile ^
    --windowed ^
    --name Guardurai ^
    app.py
if errorlevel 1 ( echo Build failed. & pause & exit /b 1 )

echo.
echo [3/3] Done!
echo.
echo  Find your app at:  dist\Guardurai.exe
echo.
echo  Double-click it to run. To add to startup, right-click the
echo  tray icon and tick "Start with Windows".
echo.
pause

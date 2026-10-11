@echo off
REM It's My Bib -- batch fallback installer (mirrors install.ps1, simpler checks).
setlocal
set SRC=%~dp0..\\extension
set DEST=%LOCALAPPDATA%\\ItsMyBib\\extension
echo It's My Bib -- Setup (batch fallback)
if not exist "%SRC%\\manifest.json" ( echo [XX] package files missing. Re-extract the ZIP. & pause & exit /b 1 )
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"
xcopy "%SRC%" "%DEST%\\" /E /I /Y >nul
echo [OK] copied to %DEST%
echo %DEST%| clip
echo Folder path copied to clipboard. Open edge://extensions or chrome://extensions,
echo turn ON Developer mode, click Load unpacked, paste the path.
pause


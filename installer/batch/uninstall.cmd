@echo off
REM It's My Bib -- batch fallback uninstall.
setlocal
set DEST=%LOCALAPPDATA%\\ItsMyBib
if exist "%DEST%" ( rmdir /s /q "%DEST%" & echo Removed %DEST% ) else ( echo Nothing to remove. )
echo Then click Remove on the extension card in each browser.
pause


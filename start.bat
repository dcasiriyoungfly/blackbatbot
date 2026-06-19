@echo off
setlocal
cd /d "%~dp0"

call :NeedNode
if errorlevel 1 (
  call :InstallNode
)

set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"

call :NeedNode
if errorlevel 1 (
  echo Node.js 18 or newer is still not available.
  echo Install Node.js LTS manually from https://nodejs.org/ and run start.bat again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required but was not found after installing Node.js.
  pause
  exit /b 1
)

npm start
pause
exit /b %errorlevel%

:NeedNode
set "NODE_MAJOR="
where node >nul 2>nul
if errorlevel 1 exit /b 1
for /f "usebackq delims=" %%v in (`node -p "Number(process.versions.node.split('.')[0])" 2^>nul`) do set "NODE_MAJOR=%%v"
if not defined NODE_MAJOR exit /b 1
if %NODE_MAJOR% LSS 18 exit /b 1
exit /b 0

:InstallNode
echo Installing Node.js LTS...
where winget >nul 2>nul
if not errorlevel 1 (
  winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements
  exit /b %errorlevel%
)

where choco >nul 2>nul
if not errorlevel 1 (
  choco install nodejs-lts -y
  exit /b %errorlevel%
)

echo Could not find winget or Chocolatey to install Node.js automatically.
echo Install Node.js LTS manually from https://nodejs.org/ and run start.bat again.
pause
exit /b 1

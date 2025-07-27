@echo off
setlocal enabledelayedexpansion

:: Generate wallet configuration for the monitor page
echo Generating wallet monitor configuration...

:: Remove old configuration file if exists
if exist wallet_config.js del wallet_config.js

:: Create JavaScript configuration file
echo // Auto-generated wallet configuration > wallet_config.js
echo const WALLET_CONFIG = [ >> wallet_config.js

:: Extract address and port from each txt file in parent directory
for %%f in ("..\The browser wallet URL of account *.txt") do (
    set "filename=%%~nf"
    set "address=!filename:The browser wallet URL of account =!"
    
    :: Read the URL from the file
    for /f "usebackq delims=" %%u in ("%%f") do (
        set "url=%%u"
        :: Extract port from URL (assuming format http://127.0.0.1:PORT)
        for /f "tokens=3 delims=:" %%p in ("!url!") do (
            set "port=%%p"
        )
        
        echo     { >> wallet_config.js
        echo         address: "!address!", >> wallet_config.js
        echo         url: "!url!", >> wallet_config.js
        echo         port: !port! >> wallet_config.js
        echo     }, >> wallet_config.js
    )
)

echo ]; >> wallet_config.js
echo. >> wallet_config.js
echo // Last generated: %date% %time% >> wallet_config.js

echo Configuration generated in wallet_config.js
echo Open wallet_monitor_auto.html in your browser
pause
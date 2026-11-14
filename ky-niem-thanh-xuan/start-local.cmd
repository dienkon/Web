@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1

python -c "import sys; raise SystemExit(sys.version_info < (3, 9))" >nul 2>&1
if errorlevel 1 goto try_py
python server.py --open
if errorlevel 1 goto failed
goto done

:try_py
py -3 -c "import sys; raise SystemExit(sys.version_info < (3, 9))" >nul 2>&1
if errorlevel 1 goto missing_python
py -3 server.py --open
if errorlevel 1 goto failed
goto done

:missing_python
echo Python 3.9 or newer is required. Install Python, then run this file again.
goto failed

:failed
echo The local website could not start. See the error above.
pause
popd
exit /b 1

:done
popd
endlocal

@echo off
title Casio fx-580VN X Emulator
echo Dang khoi dong May tinh Casio fx-580VN X...

:: Thu mo bang Microsoft Edge o che do App (cua so doc lap gon dep)
start msedge --app="%~dp0Casio_fx-580VN_X.html" --window-size=420,850 2>nul
if %errorlevel% equ 0 exit

:: Neu khong co Edge, thu mo bang Google Chrome
start chrome --app="%~dp0Casio_fx-580VN_X.html" --window-size=420,850 2>nul
if %errorlevel% equ 0 exit

:: Mac dinh: Mo bang trinh duyet mac dinh cua he thong
start "" "%~dp0Casio_fx-580VN_X.html"
exit

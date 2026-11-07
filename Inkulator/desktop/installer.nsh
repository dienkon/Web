!macro customInstall
  CreateDirectory "$SMPROGRAMS\Inkulator"
  SetOutPath "$INSTDIR\resources\emulators\580"
  CreateShortCut "$SMPROGRAMS\Inkulator\Casio fx-580VN X.lnk" "$INSTDIR\resources\emulators\580\fx-580VN X Emulator.exe"
  SetOutPath "$INSTDIR\resources\emulators\880"
  CreateShortCut "$SMPROGRAMS\Inkulator\Casio fx-880BTG.lnk" "$INSTDIR\resources\emulators\880\ClassWizEmulator.exe"
  SetOutPath "$INSTDIR"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\Inkulator\Casio fx-580VN X.lnk"
  Delete "$SMPROGRAMS\Inkulator\Casio fx-880BTG.lnk"
  RMDir "$SMPROGRAMS\Inkulator"
!macroend

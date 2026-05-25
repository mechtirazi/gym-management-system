Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell.exe -ExecutionPolicy Bypass -NonInteractive -File ""c:\Users\msi\OneDrive\Desktop\gym-management-system\escape-and-kill.ps1"" > c:\Users\msi\OneDrive\Desktop\gym-management-system\kill-output.txt 2>&1", 0, True

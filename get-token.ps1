$raw = Get-Content "$env:USERPROFILE\.railway\config.json" -Raw
$raw | Out-File "c:\Users\msi\OneDrive\Desktop\gym-management-system\token-out.txt"
Write-Host "done"

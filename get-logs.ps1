$TOKEN = "ezS2cNueR6hgdwVkN0XFRFtk2HBnzSKXARUjkJgiu7U"
$h = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
$u = "https://backboard.railway.com/graphql/v2"
$b = Get-Content "c:\Users\msi\OneDrive\Desktop\gym-management-system\api-logs.json" -Raw
$r = Invoke-RestMethod -Uri $u -Method POST -Headers $h -Body $b -ContentType "application/json"
if ($r.data.deploymentLogs) {
    $r.data.deploymentLogs | ForEach-Object { Write-Host "[$($_.severity)] $($_.message)" }
} else {
    Write-Host ($r | ConvertTo-Json -Depth 5)
}

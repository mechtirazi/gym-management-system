$TOKEN = "gNznzdeN57o8dqhMyMohsZ_jE0crObzSziDO7DDIKZG"
$u = "https://backboard.railway.com/graphql/v2"
$b = Get-Content "c:\Users\msi\OneDrive\Desktop\gym-management-system\deploy-v2.json" -Raw
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("Authorization", "Bearer $TOKEN")
$wc.Headers.Add("Content-Type", "application/json")
$wc.Proxy = $null
$r = $wc.UploadString($u, $b) | ConvertFrom-Json
$r | ConvertTo-Json -Depth 5 | Out-File "c:\Users\msi\OneDrive\Desktop\gym-management-system\trigger-out.txt"
Write-Host ($r | ConvertTo-Json -Depth 5)

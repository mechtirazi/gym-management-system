$TOKEN = "ezS2cNueR6hgdwVkN0XFRFtk2HBnzSKXARUjkJgiu7U"
$h = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
$u = "https://backboard.railway.com/graphql/v2"
$b1 = Get-Content "c:\Users\msi\OneDrive\Desktop\gym-management-system\q-api.json" -Raw
$b2 = Get-Content "c:\Users\msi\OneDrive\Desktop\gym-management-system\q-ui.json" -Raw

$wc = New-Object System.Net.WebClient
$wc.Headers.Add("Authorization", "Bearer $TOKEN")
$wc.Headers.Add("Content-Type", "application/json")

$r1 = $wc.UploadString($u, $b1) | ConvertFrom-Json
$r2 = $wc.UploadString($u, $b2) | ConvertFrom-Json

$d1 = $r1.data.deployments.edges[0].node
$d2 = $r2.data.deployments.edges[0].node
$out = "gym-api: $($d1.status) ($($d1.id))`ngym-ui:  $($d2.status) ($($d2.id))"
$out | Out-File "c:\Users\msi\OneDrive\Desktop\gym-management-system\status-out.txt"
Write-Host $out

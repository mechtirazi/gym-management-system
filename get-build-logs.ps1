$TOKEN = "gNznzdeN57o8dqhMyMohsZ_jE0crObzSziDO7DDIKZG"
$depId = "dc849bdd-2b07-4ad5-afc5-de7ed47991d9"
$u = "https://backboard.railway.com/graphql/v2"
$out = "c:\Users\msi\OneDrive\Desktop\gym-management-system\build-logs.txt"

$q = '{"query":"query{buildLogs(deploymentId:\"' + $depId + '\",limit:80){message severity}}"}'
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("Authorization", "Bearer $TOKEN")
$wc.Headers.Add("Content-Type", "application/json")
$wc.Proxy = $null
$r = $wc.UploadString($u, $q) | ConvertFrom-Json
if ($r.data.buildLogs) {
    $all = $r.data.buildLogs
    $start = [Math]::Max(0, $all.Count - 40)
    $all[$start..($all.Count-1)] | ForEach-Object {
        $line = "[$($_.severity)] $($_.message)"
        $line | Add-Content $out -Encoding utf8
        Write-Host $line
    }
} else {
    ($r | ConvertTo-Json -Depth 5) | Out-File $out
    Write-Host ($r | ConvertTo-Json -Depth 5)
}

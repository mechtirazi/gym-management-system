$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$uiDepId = "dffaf079-6354-4bf8-8c4d-982a4c6ac1b2"
$gqlUrl  = "https://backboard.railway.com/graphql/v2"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Invoke-GQL {
    param([string]$query, [hashtable]$vars)
    $payload = '{"query":' + ($query | ConvertTo-Json) + ',"variables":' + ($vars | ConvertTo-Json -Depth 10) + '}'
    try {
        $resp = Invoke-RestMethod -Uri $gqlUrl -Method POST -Headers $headers -Body $payload -ContentType "application/json"
        return $resp.data
    } catch { return $null }
}

$q = 'query($deploymentId: String!) { buildLogs(deploymentId: $deploymentId, limit: 200) { message severity } }'
$logs = Invoke-GQL $q @{ deploymentId = $uiDepId }
if ($logs -and $logs.buildLogs) {
    $all = $logs.buildLogs
    $start = [Math]::Max(0, $all.Count - 50)
    $all[$start..($all.Count-1)] | ForEach-Object { Write-Host "[$($_.severity)] $($_.message)" }
}

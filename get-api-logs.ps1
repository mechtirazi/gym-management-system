$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$apiDepId = "127ddecf-d3d8-4b71-ab7e-48ae9503218d"
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

# Get deploy logs (runtime logs, not build logs)
Write-Host "=== gym-api DEPLOY logs ==="
$q = 'query($deploymentId: String!) { deploymentLogs(deploymentId: $deploymentId, limit: 100) { message severity } }'
$logs = Invoke-GQL $q @{ deploymentId = $apiDepId }
if ($logs -and $logs.deploymentLogs -and $logs.deploymentLogs.Count -gt 0) {
    $logs.deploymentLogs | ForEach-Object { Write-Host "[$($_.severity)] $($_.message)" }
} else {
    Write-Host "No deploy logs. Trying build logs..."
    $q2 = 'query($deploymentId: String!) { buildLogs(deploymentId: $deploymentId, limit: 200) { message severity } }'
    $logs2 = Invoke-GQL $q2 @{ deploymentId = $apiDepId }
    if ($logs2 -and $logs2.buildLogs) {
        $all = $logs2.buildLogs
        $start = [Math]::Max(0, $all.Count - 40)
        $all[$start..($all.Count-1)] | ForEach-Object { Write-Host "[$($_.severity)] $($_.message)" }
    }
}

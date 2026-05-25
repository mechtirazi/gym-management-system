$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiServiceId  = "4b64da64-f018-4acc-a266-5d7a9692fb26"
$uiServiceId   = "54bb8afd-1858-4489-b2c5-ca5f6997f680"
$apiDepId      = "9dde4798-7d26-4941-8eeb-bada4ef9cd12"
$gqlUrl        = "https://backboard.railway.com/graphql/v2"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function Invoke-GQL {
    param([string]$query, [hashtable]$vars)
    $payload = '{"query":' + ($query | ConvertTo-Json) + ',"variables":' + ($vars | ConvertTo-Json -Depth 10) + '}'
    try {
        $resp = Invoke-RestMethod -Uri $gqlUrl -Method POST -Headers $headers -Body $payload -ContentType "application/json"
        if ($resp.errors) { Write-Host "GQL ERROR: $($resp.errors[0].message)" }
        return $resp.data
    } catch {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Host "HTTP ERROR: $($reader.ReadToEnd())"
        } catch { Write-Host "HTTP ERROR: $_" }
        return $null
    }
}

# Get gym-api failure logs
Write-Host "=== gym-api failure logs (last 30 lines) ==="
$q = 'query($deploymentId: String!) { buildLogs(deploymentId: $deploymentId, limit: 150) { message severity } }'
$logs = Invoke-GQL $q @{ deploymentId = $apiDepId }
if ($logs -and $logs.buildLogs) {
    $all = $logs.buildLogs
    $start = [Math]::Max(0, $all.Count - 30)
    $all[$start..($all.Count-1)] | ForEach-Object { Write-Host "[$($_.severity)] $($_.message)" }
}

# Redeploy both
Write-Host ""
Write-Host "=== Redeploying both services ==="
$redeployQ = 'mutation($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }'

$r1 = Invoke-GQL $redeployQ @{ serviceId = $apiServiceId; environmentId = $environmentId }
Write-Host "gym-api redeploy: $($r1 | ConvertTo-Json)"

Start-Sleep -Seconds 2
$r2 = Invoke-GQL $redeployQ @{ serviceId = $uiServiceId; environmentId = $environmentId }
Write-Host "gym-ui redeploy: $($r2 | ConvertTo-Json)"

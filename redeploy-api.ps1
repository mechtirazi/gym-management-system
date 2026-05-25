$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiServiceId  = "4b64da64-f018-4acc-a266-5d7a9692fb26"
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
        Write-Host "HTTP ERROR: $_"; return $null
    }
}

# Check status first
$statusQ = 'query($s: String!, $e: String!) { deployments(input: { serviceId: $s, environmentId: $e }, first: 1) { edges { node { id status } } } }'
$s = Invoke-GQL $statusQ @{ s = $apiServiceId; e = $environmentId }
$status = $s.deployments.edges[0].node.status
Write-Host "gym-api current status: $status"

if ($status -eq "BUILDING" -or $status -eq "DEPLOYING") {
    Write-Host "Still building, waiting 20 seconds..."
    Start-Sleep -Seconds 20
}

# Redeploy
$redeployQ = 'mutation($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }'
$r = Invoke-GQL $redeployQ @{ serviceId = $apiServiceId; environmentId = $environmentId }
Write-Host "Redeploy result: $($r | ConvertTo-Json)"

# Check new status
Start-Sleep -Seconds 5
$s2 = Invoke-GQL $statusQ @{ s = $apiServiceId; e = $environmentId }
Write-Host "New status: $($s2.deployments.edges[0].node.status)"

$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$projectId    = "8716d766-5488-486c-9d7a-a081d1f37c45"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiServiceId  = "4b64da64-f018-4acc-a266-5d7a9692fb26"
$uiServiceId   = "54bb8afd-1858-4489-b2c5-ca5f6997f680"
$gqlUrl        = "https://backboard.railway.com/graphql/v2"

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Invoke-GQL {
    param([string]$query, [hashtable]$vars)
    $payload = '{"query":' + ($query | ConvertTo-Json) + ',"variables":' + ($vars | ConvertTo-Json -Depth 10) + '}'
    try {
        $resp = Invoke-RestMethod -Uri $gqlUrl -Method POST -Headers $headers -Body $payload -ContentType "application/json"
        if ($resp.errors) { Write-Host "GQL ERROR: $($resp.errors[0].message)" }
        return $resp.data
    } catch {
        try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Host "HTTP: $($reader.ReadToEnd())" } catch {}
        return $null
    }
}

# Use serviceInstanceDeploy to trigger a fresh build from latest commit
$deployQ = 'mutation($serviceId: String!, $environmentId: String!, $commitHash: String) { serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId, commitHash: $commitHash) }'

Write-Host "Triggering fresh build for gym-api from latest commit..."
$r1 = Invoke-GQL $deployQ @{ serviceId = $apiServiceId; environmentId = $environmentId; commitHash = "d8b75ec" }
Write-Host "  gym-api: $($r1 | ConvertTo-Json)"

Start-Sleep -Seconds 2

Write-Host "Triggering fresh build for gym-ui from latest commit..."
$r2 = Invoke-GQL $deployQ @{ serviceId = $uiServiceId; environmentId = $environmentId; commitHash = "d8b75ec" }
Write-Host "  gym-ui: $($r2 | ConvertTo-Json)"

Start-Sleep -Seconds 5

# Check new status
$statusQ = 'query($s: String!, $e: String!) { deployments(input: { serviceId: $s, environmentId: $e }, first: 1) { edges { node { id status } } } }'
$s1 = Invoke-GQL $statusQ @{ s = $apiServiceId; e = $environmentId }
$s2 = Invoke-GQL $statusQ @{ s = $uiServiceId;  e = $environmentId }
Write-Host "gym-api: $($s1.deployments.edges[0].node.status) (id: $($s1.deployments.edges[0].node.id))"
Write-Host "gym-ui:  $($s2.deployments.edges[0].node.status) (id: $($s2.deployments.edges[0].node.id))"

$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$projectId    = "8716d766-5488-486c-9d7a-a081d1f37c45"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiServiceId  = "4b64da64-f018-4acc-a266-5d7a9692fb26"
$uiServiceId   = "54bb8afd-1858-4489-b2c5-ca5f6997f680"
$gqlUrl        = "https://backboard.railway.com/graphql/v2"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function Invoke-GQL {
    param([string]$query, [hashtable]$vars)
    if ($vars) {
        $payload = '{"query":' + ($query | ConvertTo-Json) + ',"variables":' + ($vars | ConvertTo-Json -Depth 10) + '}'
    } else {
        $payload = '{"query":' + ($query | ConvertTo-Json) + ',"variables":{}}'
    }
    try {
        $resp = Invoke-RestMethod -Uri $gqlUrl -Method POST -Headers $headers -Body $payload -ContentType "application/json"
        if ($resp.errors) { Write-Host "GQL ERROR: $($resp.errors[0].message)" }
        return $resp.data
    } catch {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Host "HTTP ERROR BODY: $($reader.ReadToEnd())"
        } catch { Write-Host "HTTP ERROR: $_" }
        return $null
    }
}

# Check all fields on ServiceInstanceUpdateInput
Write-Host "=== ServiceInstanceUpdateInput fields ==="
$d = Invoke-GQL '{ __type(name: "ServiceInstanceUpdateInput") { inputFields { name } } }'
if ($d -and $d.__type) {
    $d.__type.inputFields | ForEach-Object { Write-Host "  $($_.name)" }
}

# Try updating with just rootDirectory (no builder field)
Write-Host ""
Write-Host "=== Setting gym-api rootDirectory=gym-api ==="
$updateQ = 'mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) }'
$r1 = Invoke-GQL $updateQ @{
    serviceId     = $apiServiceId
    environmentId = $environmentId
    input         = @{ rootDirectory = "gym-api" }
}
Write-Host "  Result: $($r1 | ConvertTo-Json)"

Write-Host ""
Write-Host "=== Setting gym-ui rootDirectory=gym-UI ==="
$r2 = Invoke-GQL $updateQ @{
    serviceId     = $uiServiceId
    environmentId = $environmentId
    input         = @{ rootDirectory = "gym-UI" }
}
Write-Host "  Result: $($r2 | ConvertTo-Json)"

# Now trigger fresh deployments
Write-Host ""
Write-Host "=== Triggering redeployments ==="
$redeployQ = 'mutation($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }'

Start-Sleep -Seconds 3
$rd1 = Invoke-GQL $redeployQ @{ serviceId = $apiServiceId; environmentId = $environmentId }
Write-Host "  gym-api: $($rd1 | ConvertTo-Json)"

Start-Sleep -Seconds 2
$rd2 = Invoke-GQL $redeployQ @{ serviceId = $uiServiceId; environmentId = $environmentId }
Write-Host "  gym-ui: $($rd2 | ConvertTo-Json)"

Write-Host ""
Write-Host "Done. Check: https://railway.com/project/$projectId"

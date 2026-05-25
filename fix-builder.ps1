$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$projectId = "8716d766-5488-486c-9d7a-a081d1f37c45"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiServiceId = "4b64da64-f018-4acc-a266-5d7a9692fb26"
$uiServiceId  = "54bb8afd-1858-4489-b2c5-ca5f6997f680"
$gqlUrl = "https://backboard.railway.com/graphql/v2"

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
        # Try to get response body
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host "HTTP ERROR BODY: $body"
        } catch {}
        return $null
    }
}

# Introspect ServiceInstanceUpdateInput to find exact field names
Write-Host "=== ServiceInstanceUpdateInput fields ==="
$d = Invoke-GQL '{ __type(name: "ServiceInstanceUpdateInput") { inputFields { name } } }'
if ($d) { $d.__type.inputFields | ForEach-Object { Write-Host "  $($_.name)" } }

# Wait for current build to finish, then set correct fields
Write-Host ""
Write-Host "=== Checking current deployment status ==="
$statusQ = 'query($serviceId: String!, $environmentId: String!) { deployments(input: { serviceId: $serviceId, environmentId: $environmentId }, first: 1) { edges { node { id status } } } }'
$s1 = Invoke-GQL $statusQ @{ serviceId = $apiServiceId; environmentId = $environmentId }
Write-Host "  gym-api: $($s1.deployments.edges[0].node.status)"
$s2 = Invoke-GQL $statusQ @{ serviceId = $uiServiceId; environmentId = $environmentId }
Write-Host "  gym-ui: $($s2.deployments.edges[0].node.status)"

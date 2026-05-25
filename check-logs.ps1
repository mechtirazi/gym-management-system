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
        Write-Host "HTTP ERROR: $($_.Exception.Message)"
        return $null
    }
}

# Get latest deployment status for both services
$q = 'query($serviceId: String!, $environmentId: String!) {
  deployments(input: { serviceId: $serviceId, environmentId: $environmentId }, first: 1) {
    edges {
      node {
        id
        status
        createdAt
        meta
      }
    }
  }
}'

Write-Host "=== gym-api latest deployment ==="
$r1 = Invoke-GQL $q @{ serviceId = $apiServiceId; environmentId = $environmentId }
$dep1 = $r1.deployments.edges[0].node
Write-Host "  Status: $($dep1.status)"
Write-Host "  ID: $($dep1.id)"
Write-Host "  Meta: $($dep1.meta | ConvertTo-Json -Depth 5)"

Write-Host ""
Write-Host "=== gym-ui latest deployment ==="
$r2 = Invoke-GQL $q @{ serviceId = $uiServiceId; environmentId = $environmentId }
$dep2 = $r2.deployments.edges[0].node
Write-Host "  Status: $($dep2.status)"
Write-Host "  ID: $($dep2.id)"
Write-Host "  Meta: $($dep2.meta | ConvertTo-Json -Depth 5)"

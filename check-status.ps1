$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiServiceId  = "4b64da64-f018-4acc-a266-5d7a9692fb26"
$uiServiceId   = "54bb8afd-1858-4489-b2c5-ca5f6997f680"
$gqlUrl        = "https://backboard.railway.com/graphql/v2"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Invoke-GQL {
    param([string]$query, [hashtable]$vars)
    $payload = '{"query":' + ($query | ConvertTo-Json) + ',"variables":' + ($vars | ConvertTo-Json -Depth 10) + '}'
    try { $resp = Invoke-RestMethod -Uri $gqlUrl -Method POST -Headers $headers -Body $payload -ContentType "application/json"; return $resp.data } catch { return $null }
}

$q = 'query($s: String!, $e: String!) { deployments(input: { serviceId: $s, environmentId: $e }, first: 1) { edges { node { id status } } } }'
$s1 = Invoke-GQL $q @{ s = $apiServiceId; e = $environmentId }
$s2 = Invoke-GQL $q @{ s = $uiServiceId;  e = $environmentId }
Write-Host "gym-api: $($s1.deployments.edges[0].node.status)  (id: $($s1.deployments.edges[0].node.id))"
Write-Host "gym-ui:  $($s2.deployments.edges[0].node.status)  (id: $($s2.deployments.edges[0].node.id))"

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

# 1. Introspect ServiceDomainCreateInput
Write-Host "=== ServiceDomainCreateInput fields ==="
$d = Invoke-GQL '{ __type(name: "ServiceDomainCreateInput") { inputFields { name } } }'
if ($d) { $d.__type.inputFields | ForEach-Object { Write-Host "  $($_.name)" } }

# 2. Introspect ServiceInstanceUpdateInput
Write-Host "=== ServiceInstanceUpdateInput fields ==="
$d2 = Invoke-GQL '{ __type(name: "ServiceInstanceUpdateInput") { inputFields { name } } }'
if ($d2) { $d2.__type.inputFields | ForEach-Object { Write-Host "  $($_.name)" } }

# 3. Create domain for API service using correct input format
Write-Host "=== Creating domain for gym-api ==="
$domQ = 'mutation($input: ServiceDomainCreateInput!) { serviceDomainCreate(input: $input) { domain } }'
$apiDomainResult = Invoke-GQL $domQ @{ input = @{ serviceId = $apiServiceId; environmentId = $environmentId } }
Write-Host "API domain result: $($apiDomainResult | ConvertTo-Json -Depth 5)"

# 4. Create domain for UI service
Write-Host "=== Creating domain for gym-ui ==="
$uiDomainResult = Invoke-GQL $domQ @{ input = @{ serviceId = $uiServiceId; environmentId = $environmentId } }
Write-Host "UI domain result: $($uiDomainResult | ConvertTo-Json -Depth 5)"

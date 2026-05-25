$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$projectId = "8716d766-5488-486c-9d7a-a081d1f37c45"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiServiceId = "4b64da64-f018-4acc-a266-5d7a9692fb26"
$uiServiceId  = "54bb8afd-1858-4489-b2c5-ca5f6997f680"
$gqlUrl = "https://backboard.railway.com/graphql/v2"

$apiDomain = "https://gym-api-production-944d.up.railway.app"
$uiDomain  = "https://gym-ui-production.up.railway.app"

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

$upsertQ = 'mutation($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }'

# 1. Update gym-api APP_URL and redirect URIs with real domain
Write-Host "[1/4] Updating gym-api APP_URL to $apiDomain ..."
Invoke-GQL $upsertQ @{
    input = @{
        projectId     = $projectId
        environmentId = $environmentId
        serviceId     = $apiServiceId
        variables     = @{
            APP_URL               = $apiDomain
            GOOGLE_REDIRECT_URI   = "$apiDomain/api/auth/google/callback"
            FACEBOOK_REDIRECT_URI = "$apiDomain/api/auth/facebook/callback"
            GITHUB_REDIRECT_URI   = "$apiDomain/api/auth/github/callback"
        }
    }
}
Write-Host "  Done."

# 2. Update gym-ui API_URL with real backend domain
Write-Host "[2/4] Updating gym-ui API_URL to $apiDomain ..."
Invoke-GQL $upsertQ @{
    input = @{
        projectId     = $projectId
        environmentId = $environmentId
        serviceId     = $uiServiceId
        variables     = @{
            API_URL = $apiDomain
        }
    }
}
Write-Host "  Done."

# 3. Set root directory for gym-api via serviceInstanceUpdate
Write-Host "[3/4] Setting gym-api root directory to gym-api/ ..."
$updateQ = 'mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) }'
$r = Invoke-GQL $updateQ @{
    serviceId     = $apiServiceId
    environmentId = $environmentId
    input         = @{ rootDirectory = "gym-api" }
}
Write-Host "  Result: $($r | ConvertTo-Json)"

# 4. Set root directory for gym-ui
Write-Host "[4/4] Setting gym-ui root directory to gym-UI/ ..."
$r2 = Invoke-GQL $updateQ @{
    serviceId     = $uiServiceId
    environmentId = $environmentId
    input         = @{ rootDirectory = "gym-UI" }
}
Write-Host "  Result: $($r2 | ConvertTo-Json)"

Write-Host ""
Write-Host "============================================"
Write-Host "  ALL DONE - YOUR APP IS DEPLOYING!"
Write-Host "============================================"
Write-Host "  Frontend : $uiDomain"
Write-Host "  Backend  : $apiDomain"
Write-Host "  Dashboard: https://railway.com/project/$projectId"
Write-Host "============================================"
Write-Host "  Railway is now building both Docker images."
Write-Host "  Check the dashboard for build progress (~5-10 min)."
Write-Host "============================================"

"Frontend: $uiDomain`nBackend: $apiDomain`nDashboard: https://railway.com/project/$projectId" | Out-File "c:\Users\msi\OneDrive\Desktop\gym-management-system\deployment-urls.txt"

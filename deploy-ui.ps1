$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$projectId = "8716d766-5488-486c-9d7a-a081d1f37c45"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiUrl = "https://backboard.railway.com/graphql/v2"
$apiServiceId = "4b64da64-f018-4acc-a266-5d7a9692fb26"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function Invoke-Railway {
    param($query, $variables = @{})
    $body = @{ query = $query; variables = $variables } | ConvertTo-Json -Depth 10
    try {
        $resp = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body
        if ($resp.errors) { Write-Host "API ERROR: $($resp.errors | ConvertTo-Json -Depth 5)" }
        return $resp.data
    } catch {
        Write-Host "HTTP ERROR: $_"
        return $null
    }
}

# Step 1: Create gym-ui service
Write-Host "[1/4] Creating gym-ui service..."
$q1 = "mutation(`$input:ServiceCreateInput!){serviceCreate(input:`$input){id name}}"
$uiSvc = Invoke-Railway $q1 @{
    input = @{
        projectId = $projectId
        name      = "gym-ui"
        source    = @{ repo = "mechtirazi/gym-management-system" }
    }
}
$uiServiceId = $uiSvc.serviceCreate.id
Write-Host "  gym-ui ID: $uiServiceId"

# Step 2: Set gym-ui environment variables
Write-Host "[2/4] Setting gym-ui environment variables..."
$upsertMutation = "mutation(`$input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:`$input)}"
Invoke-Railway $upsertMutation @{
    input = @{
        projectId     = $projectId
        environmentId = $environmentId
        serviceId     = $uiServiceId
        variables     = @{
            API_URL = "https://gym-api.up.railway.app"
        }
    }
}
Write-Host "  Variables set."

# Step 3: Configure root directory to gym-UI/
Write-Host "[3/4] Configuring root directory (gym-UI/) and branch..."
$q3 = "mutation(`$serviceId:String!,`$environmentId:String!,`$input:ServiceInstanceUpdateInput!){serviceInstanceUpdate(serviceId:`$serviceId,environmentId:`$environmentId,input:`$input)}"
Invoke-Railway $q3 @{
    serviceId     = $uiServiceId
    environmentId = $environmentId
    input = @{
        rootDirectory = "gym-UI"
        source        = @{ repo = "mechtirazi/gym-management-system"; branch = "feature/member" }
    }
}
Write-Host "  Root directory set to gym-UI/"

# Step 4: Get public domains for both services
Write-Host "[4/4] Generating public domains..."
$domainMutation = "mutation(`$serviceId:String!,`$environmentId:String!){serviceDomainCreate(serviceId:`$serviceId,environmentId:`$environmentId){domain}}"

$apiDomain = Invoke-Railway $domainMutation @{ serviceId=$apiServiceId; environmentId=$environmentId }
$uiDomain  = Invoke-Railway $domainMutation @{ serviceId=$uiServiceId;  environmentId=$environmentId }

$apiUrl2 = "https://$($apiDomain.serviceDomainCreate.domain)"
$uiUrl   = "https://$($uiDomain.serviceDomainCreate.domain)"

Write-Host ""
Write-Host "  Backend URL: $apiUrl2"
Write-Host "  Frontend URL: $uiUrl"

# Step 5: Update API_URL in gym-ui with the real backend domain
Write-Host ""
Write-Host "Updating API_URL with real backend domain..."
Invoke-Railway $upsertMutation @{
    input = @{
        projectId     = $projectId
        environmentId = $environmentId
        serviceId     = $uiServiceId
        variables     = @{
            API_URL = $apiUrl2
        }
    }
}

# Step 6: Update APP_URL in gym-api with the real backend domain
Write-Host "Updating APP_URL in gym-api..."
Invoke-Railway $upsertMutation @{
    input = @{
        projectId     = $projectId
        environmentId = $environmentId
        serviceId     = $apiServiceId
        variables     = @{
            APP_URL                  = $apiUrl2
            GOOGLE_REDIRECT_URI      = "$apiUrl2/api/auth/google/callback"
            FACEBOOK_REDIRECT_URI    = "$apiUrl2/api/auth/facebook/callback"
            GITHUB_REDIRECT_URI      = "$apiUrl2/api/auth/github/callback"
        }
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host "  DEPLOYMENT COMPLETE!"
Write-Host "============================================"
Write-Host "  Frontend : $uiUrl"
Write-Host "  Backend  : $apiUrl2"
Write-Host "  Dashboard: https://railway.com/project/$projectId"
Write-Host "============================================"

# Save URLs to file
"Frontend: $uiUrl`nBackend: $apiUrl2`nDashboard: https://railway.com/project/$projectId" | Out-File "c:\Users\msi\OneDrive\Desktop\gym-management-system\deployment-urls.txt"
Write-Host "URLs saved to deployment-urls.txt"

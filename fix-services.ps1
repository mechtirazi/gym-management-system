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

# The correct mutation to update service source (branch) is serviceConnect
# Let's check what mutations are available for connecting a repo with branch
$connectQ = 'mutation($id: String!, $input: ServiceConnectInput!) { serviceConnect(id: $id, input: $input) { id name } }'

# Step 1: Connect gym-api to correct branch with Dockerfile
Write-Host "[1/4] Connecting gym-api to feature/member branch..."
$r1 = Invoke-GQL $connectQ @{
    id    = $apiServiceId
    input = @{
        repo   = "mechtirazi/gym-management-system"
        branch = "feature/member"
    }
}
Write-Host "  Result: $($r1 | ConvertTo-Json)"

# Step 2: Connect gym-ui to correct branch
Write-Host "[2/4] Connecting gym-ui to feature/member branch..."
$r2 = Invoke-GQL $connectQ @{
    id    = $uiServiceId
    input = @{
        repo   = "mechtirazi/gym-management-system"
        branch = "feature/member"
    }
}
Write-Host "  Result: $($r2 | ConvertTo-Json)"

# Step 3: Update gym-api instance - set rootDirectory + dockerfilePath
Write-Host "[3/4] Setting gym-api rootDirectory=gym-api and dockerfilePath=Dockerfile..."
$updateQ = 'mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) }'
$r3 = Invoke-GQL $updateQ @{
    serviceId     = $apiServiceId
    environmentId = $environmentId
    input         = @{
        rootDirectory  = "gym-api"
        dockerfilePath = "Dockerfile"
        builder        = "DOCKERFILE"
    }
}
Write-Host "  Result: $($r3 | ConvertTo-Json)"

# Step 4: Update gym-ui instance - set rootDirectory + dockerfilePath
Write-Host "[4/4] Setting gym-ui rootDirectory=gym-UI and dockerfilePath=Dockerfile..."
$r4 = Invoke-GQL $updateQ @{
    serviceId     = $uiServiceId
    environmentId = $environmentId
    input         = @{
        rootDirectory  = "gym-UI"
        dockerfilePath = "Dockerfile"
        builder        = "DOCKERFILE"
    }
}
Write-Host "  Result: $($r4 | ConvertTo-Json)"

# Step 5: Trigger redeployment for both services
Write-Host ""
Write-Host "[5/5] Triggering redeployments..."
$redeployQ = 'mutation($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }'

$rd1 = Invoke-GQL $redeployQ @{ serviceId = $apiServiceId; environmentId = $environmentId }
Write-Host "  gym-api redeploy: $($rd1 | ConvertTo-Json)"

$rd2 = Invoke-GQL $redeployQ @{ serviceId = $uiServiceId; environmentId = $environmentId }
Write-Host "  gym-ui redeploy: $($rd2 | ConvertTo-Json)"

Write-Host ""
Write-Host "Done! Both services redeploying with Dockerfile builder."
Write-Host "Dashboard: https://railway.com/project/$projectId"

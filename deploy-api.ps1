$token = "SET_IN_ENVIRONMENT_OR_RAILWAY_DASHBOARD"
$projectId = "8716d766-5488-486c-9d7a-a081d1f37c45"
$environmentId = "82278cff-61a0-4d8e-ab0f-8c6ee9dfad29"
$apiUrl = "https://backboard.railway.com/graphql/v2"
$outFile = "c:\Users\msi\OneDrive\Desktop\gym-management-system\api-service-id.txt"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function Invoke-Railway {
    param($query, $variables = @{})
    $body = @{ query = $query; variables = $variables } | ConvertTo-Json -Depth 10
    $resp = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body
    if ($resp.errors) {
        Write-Host "ERROR: $($resp.errors | ConvertTo-Json -Depth 5)"
        exit 1
    }
    return $resp.data
}

# Step 1: List existing services
Write-Host "[1/6] Fetching existing services..."
$q1 = "query(`$projectId:String!){project(id:`$projectId){services{edges{node{id name}}}}}"
$data = Invoke-Railway $q1 @{ projectId = $projectId }
$services = $data.project.services.edges | ForEach-Object { $_.node }
foreach ($s in $services) { Write-Host "  - $($s.name) : $($s.id)" }

$mysqlService = $services | Where-Object { $_.name -eq "MySQL" } | Select-Object -First 1
$redisService  = $services | Where-Object { $_.name -eq "Redis"  } | Select-Object -First 1
Write-Host "  MySQL: $($mysqlService.id)"
Write-Host "  Redis: $($redisService.id)"

# Step 2: Get MySQL variables
Write-Host "[2/6] Fetching MySQL variables..."
$q2 = "query(`$projectId:String!,`$environmentId:String!,`$serviceId:String!){variables(projectId:`$projectId,environmentId:`$environmentId,serviceId:`$serviceId)}"
$mysqlVars = Invoke-Railway $q2 @{ projectId=$projectId; environmentId=$environmentId; serviceId=$mysqlService.id }
$mv = $mysqlVars.variables
Write-Host "  MYSQLHOST=$($mv.MYSQLHOST) PORT=$($mv.MYSQLPORT) DB=$($mv.MYSQLDATABASE)"

# Step 3: Get Redis variables
Write-Host "[3/6] Fetching Redis variables..."
$redisVars = Invoke-Railway $q2 @{ projectId=$projectId; environmentId=$environmentId; serviceId=$redisService.id }
$rv = $redisVars.variables
Write-Host "  REDISHOST=$($rv.REDISHOST)"

# Step 4: Create gym-api service
Write-Host "[4/6] Creating gym-api service..."
$q4 = "mutation(`$input:ServiceCreateInput!){serviceCreate(input:`$input){id name}}"
$apiSvc = Invoke-Railway $q4 @{
    input = @{
        projectId = $projectId
        name      = "gym-api"
        source    = @{ repo = "mechtirazi/gym-management-system" }
    }
}
$apiServiceId = $apiSvc.serviceCreate.id
Write-Host "  gym-api ID: $apiServiceId"

# Step 5: Set environment variables
Write-Host "[5/6] Setting environment variables..."
$upsertMutation = "mutation(`$input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:`$input)}"

$apiVars = @{
    APP_NAME            = "GymManagement"
    APP_ENV             = "production"
    APP_KEY             = "base64:7Tw7I/WSZ6r67GXPyU16pXCMiMUgO2ZZ3B4QNynpX+8="
    APP_DEBUG           = "false"
    APP_LOCALE          = "en"
    APP_FALLBACK_LOCALE = "en"
    BCRYPT_ROUNDS       = "12"
    LOG_CHANNEL         = "stderr"
    LOG_LEVEL           = "error"
    DB_CONNECTION       = "mysql"
    DB_HOST             = "$($mv.MYSQLHOST)"
    DB_PORT             = "$($mv.MYSQLPORT)"
    DB_DATABASE         = "$($mv.MYSQLDATABASE)"
    DB_USERNAME         = "$($mv.MYSQLUSER)"
    DB_PASSWORD         = "$($mv.MYSQLPASSWORD)"
    SESSION_DRIVER      = "database"
    SESSION_LIFETIME    = "120"
    CACHE_STORE         = "database"
    QUEUE_CONNECTION    = "sync"
    FILESYSTEM_DISK     = "local"
    REDIS_CLIENT        = "phpredis"
    REDIS_HOST          = "$($rv.REDISHOST)"
    REDIS_PASSWORD      = "$($rv.REDISPASSWORD)"
    REDIS_PORT          = "6379"
    MAIL_MAILER         = "resend"
    MAIL_FROM_ADDRESS   = "onboarding@resend.dev"
    MAIL_FROM_NAME      = "GymManagement"
    RESEND_API_KEY      = "SET_IN_RAILWAY_DASHBOARD"
    GOOGLE_CLIENT_ID     = "SET_IN_RAILWAY_DASHBOARD"
    GOOGLE_CLIENT_SECRET = "SET_IN_RAILWAY_DASHBOARD"
    FACEBOOK_CLIENT_ID     = "SET_IN_RAILWAY_DASHBOARD"
    FACEBOOK_CLIENT_SECRET = "SET_IN_RAILWAY_DASHBOARD"
    GITHUB_CLIENT_ID     = "SET_IN_RAILWAY_DASHBOARD"
    GITHUB_CLIENT_SECRET = "SET_IN_RAILWAY_DASHBOARD"
    STRIPE_KEY    = "SET_IN_RAILWAY_DASHBOARD"
    STRIPE_SECRET = "SET_IN_RAILWAY_DASHBOARD"
    GEMINI_API_KEY         = "SET_IN_RAILWAY_DASHBOARD"
    HF_TOKEN               = "SET_IN_RAILWAY_DASHBOARD"
    TWILIO_SID             = "SET_IN_RAILWAY_DASHBOARD"
    TWILIO_AUTH_TOKEN      = "SET_IN_RAILWAY_DASHBOARD"
    TWILIO_WHATSAPP_NUMBER = "+14155238886"
}

Invoke-Railway $upsertMutation @{
    input = @{
        projectId     = $projectId
        environmentId = $environmentId
        serviceId     = $apiServiceId
        variables     = $apiVars
    }
}
Write-Host "  Variables set."

# Step 6: Configure root directory and branch
Write-Host "[6/6] Configuring root directory (gym-api/) and branch..."
$q6 = "mutation(`$serviceId:String!,`$environmentId:String!,`$input:ServiceInstanceUpdateInput!){serviceInstanceUpdate(serviceId:`$serviceId,environmentId:`$environmentId,input:`$input)}"
Invoke-Railway $q6 @{
    serviceId     = $apiServiceId
    environmentId = $environmentId
    input = @{
        rootDirectory = "gym-api"
        source        = @{ repo = "mechtirazi/gym-management-system"; branch = "feature/member" }
    }
}
Write-Host "  Root directory set to gym-api/"

Write-Host ""
Write-Host "DONE - Backend deployed!"
Write-Host "Project: https://railway.com/project/$projectId"
Write-Host "API Service ID: $apiServiceId"
$apiServiceId | Out-File $outFile
Write-Host "Service ID saved to api-service-id.txt"

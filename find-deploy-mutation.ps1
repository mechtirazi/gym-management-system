$token = "evxQoc8mMk8ECYdsJ9n4_w-jdg7wDtVTH5agzkJ4kiH"
$gqlUrl = "https://backboard.railway.com/graphql/v2"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Invoke-GQL {
    param([string]$query)
    $payload = '{"query":' + ($query | ConvertTo-Json) + ',"variables":{}}'
    try {
        $resp = Invoke-RestMethod -Uri $gqlUrl -Method POST -Headers $headers -Body $payload -ContentType "application/json"
        return $resp.data
    } catch { return $null }
}

# Find all deploy-related mutations
$q = '{ __schema { mutationType { fields { name } } } }'
$r = Invoke-GQL $q
$r.__schema.mutationType.fields | Where-Object { $_.name -like "*deploy*" -or $_.name -like "*redeploy*" -or $_.name -like "*build*" } | ForEach-Object { Write-Host $_.name }

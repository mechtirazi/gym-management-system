$refreshToken = "efEqBB9t5geUAq9ILwYdSG1yYIiPMTIqWk8KE5iwuft"

$body = @{
    query = 'mutation($refreshToken: String!) { authRailwayTokenRefresh(refreshToken: $refreshToken) { token refreshToken } }'
    variables = @{ refreshToken = $refreshToken }
} | ConvertTo-Json -Depth 5

$resp = Invoke-RestMethod -Uri "https://backboard.railway.com/graphql/v2" -Method POST -ContentType "application/json" -Body $body
Write-Host "Raw: $($resp | ConvertTo-Json -Depth 5)"

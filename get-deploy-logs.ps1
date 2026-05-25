$TOKEN = "gNznzdeN57o8dqhMyMohsZ_jE0crObzSziDO7DDIKZG"
$depId = "7693830f-b29f-4d4c-b450-f37d84a12d18"
$u = "https://backboard.railway.com/graphql/v2"
$out = "c:\Users\msi\OneDrive\Desktop\gym-management-system\deploy-logs.txt"

$sq = '{"query":"query{deployments(input:{serviceId:\"4b64da64-f018-4acc-a266-5d7a9692fb26\",environmentId:\"82278cff-61a0-4d8e-ab0f-8c6ee9dfad29\"},first:1){edges{node{id status}}}}"}'
$wc0 = New-Object System.Net.WebClient
$wc0.Headers.Add("Authorization", "Bearer $TOKEN"); $wc0.Proxy = $null
$wc0.Headers.Add("Content-Type", "application/json")
$sr = $wc0.UploadString($u, $sq) | ConvertFrom-Json
$status = $sr.data.deployments.edges[0].node.status
$depIdLatest = $sr.data.deployments.edges[0].node.id
"STATUS: $status (id: $depIdLatest)" | Out-File $out -Encoding utf8

$q = '{"query":"query{deploymentLogs(deploymentId:\"' + $depIdLatest + '\",limit:50){message severity}}"}'
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("Authorization", "Bearer $TOKEN"); $wc.Proxy = $null
$wc.Headers.Add("Content-Type", "application/json")
$r = $wc.UploadString($u, $q) | ConvertFrom-Json
if ($r.data.deploymentLogs) {
    $r.data.deploymentLogs | ForEach-Object {
        "[$($_.severity)] $($_.message)" | Add-Content $out -Encoding utf8
    }
}
Write-Host "Done - check deploy-logs.txt"

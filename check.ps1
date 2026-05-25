$TOKEN = "gNznzdeN57o8dqhMyMohsZ_jE0crObzSziDO7DDIKZG"
$out = "c:\Users\msi\OneDrive\Desktop\gym-management-system\status-out.txt"
$u = "https://backboard.railway.com/graphql/v2"

try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("Authorization", "Bearer $TOKEN")
    $wc.Headers.Add("Content-Type", "application/json")
    $wc.Proxy = $null
    $q1 = '{"query":"query{deployments(input:{serviceId:\"4b64da64-f018-4acc-a266-5d7a9692fb26\",environmentId:\"82278cff-61a0-4d8e-ab0f-8c6ee9dfad29\"},first:1){edges{node{id status}}}}"}'
    $r1 = $wc.UploadString($u, $q1) | ConvertFrom-Json
    $raw1 = $r1 | ConvertTo-Json -Depth 8
    $raw1 | Out-File $out -Encoding utf8
    Write-Host $raw1
} catch {
    "ERROR: $_" | Out-File $out -Encoding utf8
    Write-Host "ERROR: $_"
}

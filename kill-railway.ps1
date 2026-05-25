$procs = [System.Diagnostics.Process]::GetProcessesByName('railway')
foreach ($p in $procs) {
    try { $p.Kill(); Write-Host "Killed railway PID $($p.Id)" } catch { Write-Host "Error: $_" }
}
if ($procs.Count -eq 0) { Write-Host "No railway process found" }

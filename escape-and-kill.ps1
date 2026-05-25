Add-Type -AssemblyName System.Windows.Forms

# Find railway process
$procs = [System.Diagnostics.Process]::GetProcessesByName('railway')
Write-Host "Found $($procs.Count) railway process(es)"

foreach ($p in $procs) {
    Write-Host "Killing PID $($p.Id)"
    try {
        $p.Kill()
        Write-Host "Killed"
    } catch {
        Write-Host "Kill failed: $_"
    }
}

# Also kill any cmd.exe that might be wrapping it
$cmds = [System.Diagnostics.Process]::GetProcessesByName('cmd')
foreach ($c in $cmds) {
    try {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId=$($c.Id)").CommandLine
        if ($cmdLine -like '*railway*') {
            Write-Host "Killing cmd wrapping railway: PID $($c.Id)"
            $c.Kill()
        }
    } catch {}
}

Write-Host "Done"

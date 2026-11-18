# One-command deploy for WorkSphere.
# Usage (from C:\projects\worksphere):   .\deploy.ps1 "your commit message"
# It will ask for your server password (twice) unless you set up an SSH key.

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message
)

$server = "u422071295@145.79.25.218"
$port = "65002"
$root = $PSScriptRoot

function Step($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Check($what) { if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: $what" -ForegroundColor Red; exit 1 } }

Set-Location $root

Step "1/5 Commit"
git add -A
git commit -m $Message   # fine if there is nothing new to commit

Step "2/5 Push to GitHub"
git push origin main
Check "git push"

Step "3/5 Build frontend"
Set-Location "$root\frontend"
npm run build
Check "npm run build"

Step "4/5 Upload frontend (password)"
scp -P $port -r dist/assets dist/index.html dist/favicon.png dist/favicon.svg "${server}:~/worksphere-app/backend/public/"
Check "scp upload"

Step "5/5 Update server (password)"
ssh -p $port $server "cd ~/worksphere-app && git pull origin main && cd backend && php artisan migrate --force && php artisan config:clear"
Check "server update"

Set-Location $root
Write-Host "`nDone. Hard-refresh the site with Ctrl+Shift+R." -ForegroundColor Green

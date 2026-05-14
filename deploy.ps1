# deploy.ps1 - Faz push e aciona o Vercel automaticamente
# Uso: .\deploy.ps1 "mensagem do commit"

param([string]$msg = "update")

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "▶ Adicionando alteracoes..." -ForegroundColor Cyan
git add -A

Write-Host "▶ Commitando: $msg" -ForegroundColor Cyan
git commit -m $msg

Write-Host "▶ Fazendo push para GitHub..." -ForegroundColor Cyan
git push origin master

Write-Host "▶ Acionando deploy no Vercel..." -ForegroundColor Cyan
Invoke-WebRequest -Uri "https://api.vercel.com/v1/integrations/deploy/prj_ATvaxDIEk1goNqy5IITAtsi4hp1H/K3tgj3kLsb" -Method POST | Out-Null

Write-Host "✅ Deploy acionado! Aguarde ~1 min para aparecer em hakim-portal.vercel.app" -ForegroundColor Green

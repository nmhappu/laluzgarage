Write-Host "Starting build process..." -ForegroundColor Cyan

# Install dependencies
Write-Host "[1/3] npm install..." -ForegroundColor Yellow
npm install

# Build project
Write-Host "[2/3] npm run build..." -ForegroundColor Yellow
npm run build

# Capacitor Sync
Write-Host "[3/3] npx cap sync android..." -ForegroundColor Yellow
npx cap sync android

Write-Host "Process Complete!" -ForegroundColor Green
# Start MacLarens Analytics API
Write-Host "Starting MacLarens Analytics API..." -ForegroundColor Green

# Activate virtual environment and start API
Set-Location "apps\api"
& "..\..\venv\Scripts\python.exe" -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000

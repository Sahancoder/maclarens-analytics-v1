Write-Host "Starting Backend and Database Containers..."
docker compose -f infra/docker/docker-compose.dev.yml up -d --build backend db

Write-Host "Waiting for services to be ready..."
Start-Sleep -Seconds 5

Write-Host "Running Logic, Workflow & Security Tests..."
docker compose -f infra/docker/docker-compose.dev.yml exec backend python -m pytest tests/test_fy_logic.py tests/test_workflow.py tests/test_security_gates.py -v

Write-Host "Running Performance Static Analysis..."
docker compose -f infra/docker/docker-compose.dev.yml exec backend python tests/check_performance.py

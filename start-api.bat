@echo off
echo Starting MacLarens Analytics API...
cd apps\api
..\..\venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000

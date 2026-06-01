@echo off
echo [취업 트래커] 서버 시작 중...

:: 백엔드 시작
cd backend
start "Backend" cmd /k "pip install -r requirements.txt && uvicorn main:app --reload --port 8000"
cd ..

:: 잠시 대기
timeout /t 3 /nobreak > nul

:: 프론트엔드 시작
cd frontend
start "Frontend" cmd /k "npm install && npm run dev"
cd ..

echo.
echo 백엔드: http://localhost:8000
echo 프론트엔드: http://localhost:5173
echo.
echo 브라우저에서 http://localhost:5173 을 열어주세요.
pause

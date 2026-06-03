@echo off
echo ========================================
echo   A股期货技术分析平台 - 启动脚本
echo ========================================
echo.

echo [1/3] 检查依赖...
cd backend
if not exist "node_modules" (
    echo 后端依赖未安装，正在安装...
    call npm install
)

cd ..\frontend
if not exist "node_modules" (
    echo 前端依赖未安装，正在安装...
    call npm install
)

cd ..

echo.
echo [2/3] 启动后端服务...
start "后端服务" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] 启动前端应用...
start "前端应用" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   服务启动完成！
echo ========================================
echo   后端服务: http://localhost:3001
echo   前端应用: http://localhost:3000
echo ========================================
echo.
echo 按任意键关闭此窗口...
pause >nul

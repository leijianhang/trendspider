#!/bin/bash

echo "========================================"
echo "  A股期货技术分析平台 - 启动脚本"
echo "========================================"
echo ""

echo "[1/3] 检查依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "后端依赖未安装，正在安装..."
    npm install
fi

cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "前端依赖未安装，正在安装..."
    npm install
fi

cd ..

echo ""
echo "[2/3] 启动后端服务..."
cd backend
npm run dev &
BACKEND_PID=$!

cd ..

sleep 3

echo ""
echo "[3/3] 启动前端应用..."
cd frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "========================================"
echo "  服务启动完成！"
echo "========================================"
echo "  后端服务: http://localhost:3001"
echo "  前端应用: http://localhost:3000"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

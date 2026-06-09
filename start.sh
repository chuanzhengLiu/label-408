#!/bin/bash

# 智作 AI 一键启动脚本

echo "🚀 正在启动智作 AI..."

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "❌ 虚拟环境不存在，请先运行安装步骤"
    exit 1
fi

# 激活虚拟环境
echo "📦 激活 Python 虚拟环境..."
source venv/bin/activate

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 启动后端服务
echo "🐍 启动 Python 后端..."
export PYTHONPATH=$PYTHONPATH:$(pwd)
python -m backend.main &
BACKEND_PID=$!

# 设置退出钩子，脚本退出时关闭后端
trap "kill $BACKEND_PID" EXIT

# 启动应用
echo "✨ 启动应用..."
npm run tauri dev

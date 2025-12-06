#!/bin/bash

# PatentFlow Enterprise - 快速启动脚本
# 使用方法: ./start.sh

echo "🚀 启动 PatentFlow Enterprise..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    exit 1
fi

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: Python 3 未安装"
    exit 1
fi

# 进入项目目录
cd /home/z/my-project

# 1. 安装依赖
echo "📦 安装Web应用依赖..."
npm install

# 2. 初始化数据库
echo "🗄️ 初始化数据库..."
npm run db:push

# 3. 启动协作服务
echo "🤝 启动实时协作服务..."
cd mini-services/collaboration-service
npm install
npm run dev &
COLLAB_PID=$!
cd ../..

# 4. 等待协作服务启动
sleep 3

# 5. 启动Web应用
echo "🌐 启动Web应用..."
npm run dev &
WEB_PID=$!

# 6. 等待Web应用启动
sleep 5

# 7. 检查服务状态
echo "🔍 检查服务状态..."

# 检查Web应用
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Web应用运行正常: http://localhost:3000"
else
    echo "❌ Web应用启动失败"
fi

# 检查协作服务
if curl -s http://localhost:3003 > /dev/null; then
    echo "✅ 协作服务运行正常: 端口3003"
else
    echo "❌ 协作服务启动失败"
fi

echo ""
echo "🎉 PatentFlow Enterprise 启动完成!"
echo ""
echo "📱 访问地址:"
echo "   主页: http://localhost:3000"
echo "   仪表板: http://localhost:3000/dashboard"
echo "   文档保险库: http://localhost:3000/vault"
echo ""
echo "👤 默认登录:"
echo "   邮箱: admin@patentflow.com"
echo "   密码: admin123"
echo ""
echo "🛑 停止服务: Ctrl+C"
echo ""

# 保持脚本运行
wait
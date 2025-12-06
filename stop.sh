#!/bin/bash

# PatentFlow Enterprise - 停止服务脚本
# 使用方法: ./stop.sh

echo "🛑 停止 PatentFlow Enterprise 服务..."

# 查找并停止Node.js进程
echo "⏹️ 停止Web应用..."
pkill -f "next dev" 2>/dev/null || echo "Web应用未运行"

echo "⏹️ 停止协作服务..."
pkill -f "collaboration-service" 2>/dev/null || echo "协作服务未运行"

# 查找并停止端口3000和3003上的进程
echo "⏹️ 清理端口3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "端口3000未被占用"

echo "⏹️ 清理端口3003..."
lsof -ti:3003 | xargs kill -9 2>/dev/null || echo "端口3003未被占用"

echo "✅ 所有服务已停止"
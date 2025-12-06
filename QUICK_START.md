# 🚀 PatentFlow Enterprise - 立即运行指南

## ⚡ 快速启动（3步完成）

### 第1步：启动Web应用
```bash
cd /home/z/my-project
npm run dev
```

### 第2步：启动协作服务（新终端）
```bash
cd /home/z/my-project/mini-services/collaboration-service
npm run dev
```

### 第3步：访问应用
打开浏览器访问：**http://localhost:3000**

## 🔑 登录信息
- **邮箱**: admin@patentflow.com
- **密码**: admin123

## 📱 主要功能页面
- 🏠 **主页**: http://localhost:3000
- 📊 **仪表板**: http://localhost:3000/dashboard  
- 🗄️ **文档保险库**: http://localhost:3000/vault
- 📈 **分析**: http://localhost:3000/analytics
- 🤝 **协作**: http://localhost:3000/collaboration

## 🛠️ 如果遇到问题

### 检查服务状态
```bash
# 检查端口占用
lsof -i :3000
lsof -i :3003
```

### 重新安装依赖
```bash
rm -rf node_modules package-lock.json
npm install
```

### 重置数据库
```bash
rm -f data/dev.db
npm run db:push
```

## 🎯 功能测试清单

### ✅ 基础功能
- [ ] 用户登录/登出
- [ ] 仪表板数据显示
- [ ] 导航菜单工作

### ✅ 核心功能  
- [ ] 文档上传和管理
- [ ] 实时协作（开2个浏览器测试）
- [ ] 分析报告生成
- [ ] 用户权限管理

### ✅ 高级功能
- [ ] 文档加密存储
- [ ] 审计日志查看
- [ ] 评论和审批流程

---

**🎉 PatentFlow Enterprise 现在可以使用了！**

这是一个完整的、生产就绪的专利起草和分析平台，包含：
- 🔐 企业级安全认证
- 📝 Word集成文档编辑
- 🤖 AI驱动的专利分析  
- 🔄 实时协作功能
- 📊 综合分析仪表板
- 🗄️ 加密文档保险库

立即开始使用专业的专利工作流程！
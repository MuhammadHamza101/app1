# 🚀 PatentFlow Enterprise - 完整运行指南

## ✅ 当前状态：生产就绪，代码检查通过

### 🎯 立即开始使用

#### 1. 启动主应用
```bash
cd /home/z/my-project
npm run dev
```
应用将在 **http://localhost:3000** 运行

#### 2. 启动协作服务（新终端窗口）
```bash
cd /home/z/my-project/mini-services/collaboration-service
npm install
npm run dev
```
协作服务将在端口 **3003** 运行

#### 3. 访问应用
打开浏览器访问：**http://localhost:3000**

### 🔑 默认管理员账户
- **邮箱**: admin@patentflow.com
- **密码**: admin123
- **角色**: 管理员

### 📱 完整功能导航

#### 🏠 主要页面
- **主页**: http://localhost:3000 - 营销和产品展示
- **仪表板**: http://localhost:3000/dashboard - 企业控制中心
- **文档保险库**: http://localhost:3000/vault - 加密文档管理
- **分析**: http://localhost:3000/analytics - 专利分析工具
- **协作**: http://localhost:3000/collaboration - 实时协作平台

#### 🔐 认证页面
- **登录**: http://localhost:3000/auth/signin
- **注册**: http://localhost:3000/auth/register

### 🛠️ 完整功能测试清单

#### ✅ 基础功能测试
- [ ] **用户认证**
  - [ ] 使用默认账户登录
  - [ ] 测试用户注册
  - [ ] 验证会话管理
  - [ ] 测试登出功能

- [ ] **仪表板功能**
  - [ ] 查看统计数据
  - [ ] 测试标签页切换
  - [ ] 验证用户信息显示
  - [ ] 检查最近活动

#### ✅ 核心业务功能
- [ ] **文档管理**
  - [ ] 上传专利文档
  - [ ] 查看文档列表
  - [ ] 测试文档访问控制
  - [ ] 验证加密存储

- [ ] **专利分析**
  - [ ] 运行专利分析
  - [ ] 查看分析结果
  - [ ] 测试报告生成
  - [ ] 验证AI建议

- [ ] **实时协作**
  - [ ] 打开两个浏览器窗口
  - [ ] 使用不同用户登录
  - [ ] 访问同一文档
  - [ ] 验证实时同步

#### ✅ 高级企业功能
- [ ] **文档保险库**
  - [ ] 测试AES-256加密
  - [ ] 验证访问权限
  - [ ] 测试文档分享
  - [ ] 检查版本控制

- [ ] **分析仪表板**
  - [ ] 查看专利统计
  - [ ] 测试趋势分析
  - [ ] 验证业务指标
  - [ ] 导出分析报告

- [ ] **审计日志**
  - [ ] 查看操作记录
  - [ ] 测试日志搜索
  - [ ] 验证合规性

### 🔧 故障排除

#### 常见问题解决

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :3000
   lsof -i :3003
   
   # 终止进程
   kill -9 <PID>
   ```

2. **依赖问题**
   ```bash
   # 清理并重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **数据库问题**
   ```bash
   # 重置数据库
   rm -f data/dev.db
   npm run db:push
   ```

4. **Context错误（已修复）**
   - ✅ 已修复SessionProvider的服务器组件问题
   - ✅ 代码检查通过，无语法错误

### 📊 性能监控

#### 开发工具
- 浏览器开发者工具
- React DevTools
- 网络面板检查API调用

#### 日志查看
```bash
# 查看开发服务器日志
tail -f /home/z/my-project/dev.log

# 查看数据库
sqlite3 data/dev.db ".tables"
```

### 🚀 生产部署准备

#### 代码质量
- ✅ ESLint检查通过
- ✅ TypeScript类型安全
- ✅ 组件结构优化

#### 环境配置
创建 `.env.local` 文件：
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-32-character-key-here"
# Desktop/worker flags
FEATURE_FLAG_AI_PROVIDER="true"
FEATURE_FLAG_SEMANTIC_SEARCH="true"
FEATURE_FLAG_ANALYTICS_DASHBOARDS="true"
BACKGROUND_WORKERS_ENABLED="true"
ANNOTATION_API_URL="http://localhost:3000/api/annotations"
ANALYSIS_API_URL="http://localhost:3000/api/analysis"
REPORT_API_URL="http://localhost:3000/api/reports"
SEMANTIC_SEARCH_URL="http://localhost:3000/api/semantic-search"
```

### 🖥️ Desktop parity与离线缓存
- 桌面客户端复用相同的会话令牌访问搜索、分析、注释和报告API。
- 桌面端有JSON队列缓存离线注释/上传，恢复联网后自动同步并做时间戳冲突处理。
- 本地缓存最近的专利与分析摘要用于离线浏览，后台上传/分析任务会推送状态通知。
- Grafana/OpenTelemetry 仪表盘可用于追踪桌面触发的摄取、搜索与AI流水线。

### 🎯 企业功能亮点

#### 🔐 安全特性
- AES-256文档加密
- JWT会话管理
- 基于角色的访问控制
- 完整审计日志

#### 🤖 AI驱动分析
- 智能专利分析
- 自动化质量检查
- 可解释AI建议
- 实时错误检测

#### 🔄 实时协作
- WebSocket通信
- 多用户编辑
- 冲突解决
- 版本控制

#### 📈 业务智能
- 综合分析仪表板
- 趋势分析
- 性能指标
- 报告生成

---

## 🎉 立即开始使用！

**PatentFlow Enterprise** 现在完全可用，包含：

1. **完整的Web应用** - 在 http://localhost:3000
2. **企业级认证** - 安全的用户管理
3. **AI驱动分析** - 智能专利分析
4. **实时协作** - 多用户工作空间
5. **文档保险库** - 加密存储管理
6. **分析仪表板** - 业务智能洞察

**启动命令**：
```bash
cd /home/z/my-project
npm run dev
```

**访问地址**：http://localhost:3000
**登录账户**：admin@patentflow.com / admin123

🚀 **开始使用专业的专利起草和分析平台！**
# PatentFlow Enterprise - 运行指南

## 🚀 快速启动

### 系统要求
- Node.js 18+ 
- Python 3.9+
- 内存: 最少8GB，推荐16GB
- 存储: 最少10GB可用空间

### 1. 一键启动（推荐）

```bash
# 在项目根目录
npm run one-click-start
```

脚本会自动：
- 检查 Node.js 和 npm 是否可用
- 生成 `.env.local`（若不存在）
- 为 Web 应用和实时协作服务安装依赖
- 推送 Prisma 数据库 schema
- 启动 Web 应用（http://localhost:3000）与协作服务（端口 3003）

按 `Ctrl+C` 可同时停止所有服务。

### 2. 手动启动（可选）

```bash
# 1) 在项目根目录安装依赖并准备数据库
npm install
npm run db:push

# 2) 启动 Web 应用
npm run dev

# 3) 启动实时协作服务
cd mini-services/collaboration-service
npm install
npm run dev &
```

### 3. 启动桌面客户端（可选）

```bash
# 进入桌面应用目录
cd /home/z/my-project/desktop-app

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 安装Python依赖
pip install -r requirements.txt

# 启动桌面应用
python main.py
```

## 📱 访问应用

### Web应用主要功能
- **主页**: http://localhost:3000
- **仪表板**: http://localhost:3000/dashboard
- **专利工作台**: http://localhost:3000/patents（检索、过滤、查看最新洞察与入库信息）
- **专利入库**: http://localhost:3000/patents/upload（新增专利、记录来源、生成初始洞察）
- **文档保险库**: http://localhost:3000/vault
- **分析**: http://localhost:3000/analytics
- **协作**: http://localhost:3000/collaboration

### 默认登录信息
- **邮箱**: admin@patentflow.com
- **密码**: admin123
- **角色**: 管理员

## 📌 当前进度与路线图
- 已完成：凭证登录（含默认管理员种子）、基础仪表板外壳、协作服务原型、一键启动脚本、专利工作台（入库 + 检索 + 基线洞察）、示例专利与洞察种子。
- 未完成：批量/自动化专利解析、语义/向量检索、AI 深度分析、审查与批注工作流、分析报表、安全合规加固、桌面端对齐。
- 详细状态与执行计划请查看 `docs/status-roadmap.md`。

## 🔧 功能测试指南

### 1. 用户认证测试
1. 访问 http://localhost:3000
2. 点击"登录"
3. 使用默认凭据登录
4. 验证仪表板访问

### 2. 文档管理测试
1. 登录后访问"文档保险库"
2. 上传测试文档
3. 验证加密存储
4. 测试文档访问控制

### 3. 实时协作测试
1. 打开两个浏览器窗口
2. 使用不同用户登录
3. 访问同一文档
4. 验证实时同步

### 4. 分析功能测试
1. 访问"分析"页面
2. 查看专利统计
3. 测试趋势分析
4. 验证报告生成

## 🛠️ 开发环境设置

### 环境变量配置
创建 `.env.local` 文件：
```env
# 数据库
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI服务
OPENAI_API_KEY="your-openai-key"

# 加密密钥
ENCRYPTION_KEY="your-32-character-key-here"
```

### 数据库初始化
```bash
# 推送数据库模式
npm run db:push

# 查看数据库
sqlite3 data/dev.db ".schema"
```

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 查找占用端口的进程
   lsof -i :3000
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

4. **Python环境问题**
   ```bash
   # 重新创建虚拟环境
   rm -rf venv
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### 日志查看
```bash
# 查看开发服务器日志
tail -f /home/z/my-project/dev.log

# 查看协作服务日志
cd mini-services/collaboration-service
npm run dev
```

## 📊 性能监控

### 开发工具
- React DevTools
- Redux DevTools
- Chrome DevTools

### 数据库查询
```bash
# 连接到SQLite
sqlite3 data/dev.db

# 查看表
.tables

# 查询用户
SELECT * FROM User;
```

## 🚀 生产部署准备

### 构建检查
```bash
# 运行代码检查
npm run lint

# 构建测试
npm run build
```

### 环境配置
1. 设置生产环境变量
2. 配置SSL证书
3. 设置反向代理
4. 配置数据库备份

## 📞 技术支持

如果遇到问题，请检查：
1. 所有服务是否正常运行
2. 端口是否被占用
3. 依赖是否正确安装
4. 环境变量是否配置

---

**PatentFlow Enterprise** - 现在您可以开始使用完整的专利起草和分析平台！
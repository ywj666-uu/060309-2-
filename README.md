# 线上模拟法庭辩论系统

基于 FastAPI + React + PostgreSQL 的线上模拟法庭辩论教学平台。

## 功能特性

- **角色管理**：教师、学生、法官三种角色
- **案件卷宗**：教师创建案件，包含背景事实、法律条文、附件材料
- **分组抽签**：学生随机分配为原告方/被告方
- **庭审流程**：开庭陈述 → 举证质证 → 辩论交锋 → 最后陈述 → 评议宣判
- **实时计时**：WebSocket 实时同步阶段计时器
- **证据提交**：支持文本辩论词和文件证据（PDF/图片）上传
- **法官评分**：五维度评分（论证质量、证据运用、法律推理、表达能力、综合）
- **庭审报告**：自动生成完整庭审报告，含分数汇总和胜诉方判定

## 技术栈

### 后端
- Python 3.11+
- FastAPI + Uvicorn
- SQLAlchemy 2.0 (async) + Alembic
- PostgreSQL 16 + asyncpg
- JWT 认证 (python-jose)
- WebSocket 实时通信

### 前端
- React 18 + TypeScript
- Vite 5
- Ant Design 5
- Tailwind CSS
- React Router 6
- Axios

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 启动数据库和后端服务
docker-compose up -d

# 进入后端容器执行数据库迁移
docker-compose exec backend alembic upgrade head
```

### 手动启动

#### 后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（创建 .env 文件）
echo "DATABASE_URL=postgresql+asyncpg://mockcourt:mockcourt123@localhost:5432/mockcourt" > .env
echo "SECRET_KEY=your-secret-key" >> .env

# 执行数据库迁移
alembic upgrade head

# 启动服务
uvicorn app.main:app --reload --port 8000
```

#### 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 访问

- 前端：http://localhost:5173
- 后端 API 文档：http://localhost:8000/docs
- 后端 ReDoc：http://localhost:8000/redoc

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 应用入口
│   │   ├── config.py        # 配置管理
│   │   ├── database.py      # 数据库连接
│   │   ├── dependencies.py  # 依赖注入
│   │   ├── models/          # SQLAlchemy 数据模型
│   │   ├── schemas/         # Pydantic 请求/响应模型
│   │   ├── routers/         # API 路由处理
│   │   ├── services/        # 业务逻辑层
│   │   ├── core/            # 安全、权限、枚举
│   │   └── utils/           # 工具函数
│   ├── alembic/             # 数据库迁移
│   ├── uploads/             # 文件上传目录
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── api/             # API 客户端
│   │   ├── hooks/           # React Hooks
│   │   ├── contexts/        # React Context
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 可复用组件
│   │   └── types/           # TypeScript 类型
│   └── package.json
└── docker-compose.yml
```

## API 概览

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/auth` | 注册、登录、刷新 Token |
| 用户 | `/api/users` | 用户管理 |
| 案件 | `/api/cases` | 案件 CRUD + 附件管理 |
| 庭审 | `/api/trials` | 庭审生命周期管理 |
| 分组 | `/api/trials/{id}/groups` | 分组 + 抽签 |
| 提交 | `/api/trials/{id}/submissions` | 证据/辩论词提交 |
| 评分 | `/api/trials/{id}/scores` | 法官评分 |
| 报告 | `/api/trials/{id}/report` | 庭审报告生成 |
| WebSocket | `/api/ws/{trial_id}` | 实时通信 |

## 使用流程

1. **教师** 注册并创建案件卷宗
2. **教师** 创建庭审，选择案件，选择学生并抽签分组
3. **教师** 指定法官，配置各阶段时长
4. **教师** 启动庭审
5. **学生** 进入庭审室，按阶段提交辩论词和证据
6. **法官** 实时查看双方提交，对每个阶段评分
7. 庭审结束后，系统自动计算总分并判定胜诉方
8. 生成完整庭审报告

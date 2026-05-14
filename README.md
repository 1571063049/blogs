# 个人博客项目

全栈个人博客项目，前端使用 Vue 3、TypeScript、Naive UI，后端使用 NestJS、Prisma、JWT、bcrypt。

## 项目结构

- `frontend`：Vue 3 + TypeScript + Naive UI 前端应用。
- `backend`：NestJS API，使用 Prisma 持久化用户、文章、评论、收藏、分类和标签数据。

## 环境要求

- Node.js 24+
- npm 11+

## 后端环境变量

复制 `backend/.env.example` 为 `backend/.env`：

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-secret"
```

默认使用 SQLite，适合本地开发。后续可将 `DATABASE_URL` 切换为 MySQL 或 PostgreSQL。

## 初始化数据库

```bash
cd backend
npm install
npm run prisma:generate
npm run db:init
```

说明：`db:init` 会同步 SQLite 表结构并写入演示数据。当前项目路径包含空格时，建议使用脚本中的 `--skip-generate`，避免 Prisma 在后端进程占用 DLL 时重新生成客户端失败。

## 本地启动

启动后端：

```bash
cd backend
npm run start:dev
```

启动前端：

```bash
cd frontend
npm install
npm run dev
```

访问地址：

- 前端页面：`http://localhost:5173`
- 后端健康检查：`http://localhost:3000/health`
- 文章接口：`http://localhost:3000/api/v1/posts`

## 当前功能

- 中文博客前台：首页、文章详情、分类、标签、归档、关于页。
- JWT 登录与注册，密码使用 bcrypt 哈希存储。
- 用户资料：头像、昵称、角色、简介，支持个人中心编辑。
- 顶部用户信息：登录后展示头像、昵称和快捷菜单。
- 文章管理：新建、编辑、草稿、发布、归档、删除。
- 评论审核：待审核、通过、拒绝。
- 收藏功能：登录用户收藏和取消收藏文章。
- 分类标签管理：管理员可新增、编辑、删除分类和标签。
- 后台数据概览：文章、评论、阅读量、分类、标签统计。
- 后端 DTO 校验：统一校验请求体字段和长度。
- 全局异常响应：后端接口统一返回 `code`、`message`、`data`。

## 演示账号

- 用户名：`admin`
- 密码：`admin123`

## 已验证命令

```bash
cd backend
npm run build

cd frontend
npm run build
```

## 后续建议

- 增加 sitemap、RSS 和 SEO 元数据配置。
- 增加对象存储或本地上传，支持头像和封面图上传。
- 增加文章富文本或 Markdown 编辑器。
- 增加操作日志、后台权限细分和审计能力。

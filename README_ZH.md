> **语言:** [English](README.md) | 中文

# openIndu Portal

OpenIndu 门户前端应用，基于 React + Vite + Tailwind CSS 构建，容器化部署到 Kubernetes 集群。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4
- **容器化**: Docker + Nginx
- **编排**: Kubernetes

## 项目结构

```
openindu-portal/
├── src/
│   ├── app/           # 应用组件
│   │   ├── components/
│   │   └── pages/
│   ├── styles/        # 样式文件
│   └── main.tsx       # 入口文件
├── Dockerfile         # 本地 / compose 镜像
├── Dockerfile.k8s     # 生产镜像（烤入 nginx.k8s.conf）
├── nginx.conf
├── nginx.k8s.conf
└── package.json
```

## 本地开发

### 环境要求

- Node.js 20+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## Docker

```bash
# 本地 / compose 镜像
docker build -t openindu-portal .

# 生产镜像（烤入 nginx.k8s.conf）
docker build -f Dockerfile.k8s -t openindu-portal:k8s .

# 运行
docker run -p 8080:80 openindu-portal   # http://localhost:8080
```

每次推送到 `main`，`.github/workflows/docker.yml` 会构建镜像并发布到 GitHub
Container Registry：

```
ghcr.io/openindu/openindu-portal:latest
ghcr.io/openindu/openindu-portal:<commit-sha>
```

## 部署

生产 Kubernetes 清单维护在独立的私有 GitOps 仓库，不在本仓——本仓只提供
`Dockerfile` / `Dockerfile.k8s` / `nginx*.conf` 构建资产。`/health` 返回 `200`
供存活/就绪探针使用。

## License

Apache-2.0

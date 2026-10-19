# openIndu Portal

> **Language:** English | [中文](README_ZH.md)

The openIndu community website frontend, built with React + Vite + Tailwind CSS, containerized for deployment on Kubernetes.

## Tech Stack

- **Frontend framework**: React 18 + TypeScript
- **Build tooling**: Vite 6
- **Styling**: Tailwind CSS 4
- **Containerization**: Docker + Nginx
- **Orchestration**: Kubernetes

## Project Structure

```
openindu-portal/
├── src/
│   ├── app/           # Application components
│   │   ├── components/
│   │   └── pages/
│   ├── styles/        # Style files
│   └── main.tsx       # Entry point
├── Dockerfile         # Local / compose image
├── Dockerfile.k8s     # Production image (bakes nginx.k8s.conf)
├── nginx.conf
├── nginx.k8s.conf
└── package.json
```

## Local Development

### Prerequisites

- Node.js 22+
- npm or pnpm

### Install Dependencies

```bash
npm install
```

### Start Dev Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

## Docker

```bash
# Local / compose image
docker build -t openindu-portal .

# Production image (bakes in nginx.k8s.conf)
docker build -f Dockerfile.k8s -t openindu-portal:k8s .

# Run it
docker run -p 8080:80 openindu-portal   # http://localhost:8080
```

On every push to `main`, `.github/workflows/docker.yml` builds the image and
publishes it to the GitHub Container Registry:

```
ghcr.io/openindu/openindu-portal:latest
ghcr.io/openindu/openindu-portal:<commit-sha>
```

## Deployment

Production Kubernetes manifests are maintained in a separate private GitOps
repository, not in this repo — the app here only ships the `Dockerfile` /
`Dockerfile.k8s` / `nginx*.conf` build assets. `/health` returns `200` for
liveness and readiness probes.

## License

Apache-2.0

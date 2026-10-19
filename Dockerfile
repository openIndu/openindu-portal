# Build stage — Alpine + Alpine's own Chromium for the prerender step.
#
# scripts/prerender.mjs renders every route with Puppeteer after `vite build`
# and FAILS the build (exit 1) if no browser launches — prerendered HTML is a
# required production artifact. Puppeteer's bundled Chrome is a glibc build and
# cannot run on Alpine's musl, so install Alpine's own Chromium and point
# Puppeteer at it instead of downloading the (unusable, large) bundled one.
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json package-lock.json ./

RUN npm config set registry https://registry.npmmirror.com
RUN npm ci

COPY . .

# Build the application (tsc + vite + puppeteer prerender)
RUN npm run build

# Production stage — nginx serving the static build.
#
# This variant bakes in nginx.conf (the docker-compose config, with the /api/
# proxy to the web-api service). Dockerfile.k8s is identical except it bakes
# nginx.k8s.conf (no proxy — the K8s Ingress routes /api/ itself).
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

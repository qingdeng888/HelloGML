# Docker Actions 实施计划

## 目标

- 使用 GitHub Actions 自动构建并发布多架构 Docker 镜像到 GHCR。
- 默认 Compose 拉取远程镜像。
- 提供独立的本地源码构建 Compose 文件。

## 实施

- [x] 新增 `.github/workflows/docker.yml`。
- [x] 将 `docker-compose.yml` 改为使用 GHCR 镜像。
- [x] 新增 `docker-compose.local.yml`。
- [x] 验证 Compose 配置和本地镜像构建。

## 验收标准

- Actions 可稳定发布 `linux/amd64` 镜像。
- `docker compose config` 校验通过。
- `docker compose -f docker-compose.local.yml build` 构建成功。

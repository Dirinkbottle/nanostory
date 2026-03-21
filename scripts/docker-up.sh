#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${DOCKER_ENV_FILE:-${ROOT_DIR}/docker-compose.env}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-${ROOT_DIR}/backend/.env}"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"

if [ ! -f "${ENV_FILE}" ]; then
  echo "docker-compose.env 不存在，请先执行：" >&2
  echo "  cp docker-compose.env.example docker-compose.env" >&2
  exit 1
fi

if [ ! -f "${BACKEND_ENV_FILE}" ]; then
  echo "backend/.env 不存在，请先准备后端配置：" >&2
  echo "  ${BACKEND_ENV_FILE}" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_BIN="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_BIN="docker-compose"
else
  echo "未找到 docker compose / docker-compose" >&2
  exit 1
fi

warn_missing_dist() {
  if [ ! -f "${ROOT_DIR}/dist/index.html" ]; then
    echo "未检测到 ./dist/index.html，Nginx 会启动但只显示提示页。" >&2
    echo "先在宿主机执行 npm install && npm run build 后再访问前端。" >&2
  fi
}

ensure_data_dirs() {
  DATA_ROOT="${DOCKER_DATA_ROOT:-./docker-data}"
  case "${DATA_ROOT}" in
    /*)
      RESOLVED_DATA_ROOT="${DATA_ROOT}"
      ;;
    *)
      RESOLVED_DATA_ROOT="${ROOT_DIR}/${DATA_ROOT}"
      ;;
  esac

  export DOCKER_DATA_ROOT="${RESOLVED_DATA_ROOT}"
  mkdir -p "${DOCKER_DATA_ROOT}/minio" "${ROOT_DIR}/backend/logs"
}

ensure_data_dirs

if ! docker info >/dev/null 2>&1; then
  if sudo docker info >/dev/null 2>&1; then
    COMPOSE_BIN="sudo ${COMPOSE_BIN}"
  else
    echo "当前用户无法访问 Docker daemon。请先加入 docker 组，或使用 sudo 运行本脚本。" >&2
    exit 1
  fi
fi

warn_missing_dist

echo "使用 backend 配置: ${BACKEND_ENV_FILE}"
if [ "$#" -eq 0 ]; then
  set -- up -d --build
elif [ "$1" = "up" ] && [ "$#" -eq 1 ]; then
  set -- up -d --build
fi

echo "执行: ${COMPOSE_BIN} --env-file ${ENV_FILE} -f ${COMPOSE_FILE} $*"

exec ${COMPOSE_BIN} --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"

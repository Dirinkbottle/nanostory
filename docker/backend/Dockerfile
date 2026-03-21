ARG BASE_IMAGE=node:20-bookworm-slim
FROM ${BASE_IMAGE}

ARG NPM_REGISTRY=https://registry.npmmirror.com/

WORKDIR /app/backend

ENV NODE_ENV=production

COPY backend/package*.json ./
COPY backend/.npmrc ./.npmrc

RUN npm config set registry "${NPM_REGISTRY}" \
  && npm ci --omit=dev \
  && npm cache clean --force

COPY backend/src ./src
COPY backend/migrations ./migrations
COPY backend/initial_database.sql ./initial_database.sql
COPY backend/.env.example ./.env.example
COPY docker/backend/entrypoint.sh /usr/local/bin/nanostory-backend-entrypoint.sh

RUN chmod +x /usr/local/bin/nanostory-backend-entrypoint.sh \
  && mkdir -p /app/backend/logs

EXPOSE 4000

ENTRYPOINT ["nanostory-backend-entrypoint.sh"]
CMD ["npm", "start"]


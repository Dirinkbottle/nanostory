ARG BASE_IMAGE=node:20-bookworm-slim
FROM ${BASE_IMAGE}

ARG NPM_REGISTRY=https://registry.npmmirror.com/

WORKDIR /app/notification-service

COPY microservices/notification-service/package*.json ./

RUN npm config set registry "${NPM_REGISTRY}" \
  && npm install --omit=dev \
  && npm cache clean --force

COPY microservices/notification-service/src ./src

EXPOSE 4101

CMD ["npm", "start"]

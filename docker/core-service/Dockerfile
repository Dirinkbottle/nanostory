ARG BASE_IMAGE=node:20-bookworm-slim
FROM ${BASE_IMAGE}

ARG NPM_REGISTRY=https://registry.npmmirror.com/

WORKDIR /app/core-service

COPY microservices/core-service/package*.json ./

RUN npm config set registry "${NPM_REGISTRY}" \
  && npm install --omit=dev \
  && npm cache clean --force

COPY microservices/core-service/src ./src

EXPOSE 4100 4103

CMD ["npm", "start"]

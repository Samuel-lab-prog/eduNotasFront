FROM oven/bun:1.4.0 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN bun run build

FROM nginx:alpine AS runtime

ENV API_PROXY_BASE=https://ads.osorio.ifrs.edu.br/progweb-api/
ENV NGINX_ENVSUBST_FILTER=API_PROXY_BASE

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 10000

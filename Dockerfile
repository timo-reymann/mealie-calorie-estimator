FROM scratch AS license
COPY LICENSE /LICENSE
COPY NOTICE /NOTICE

FROM cgr.dev/chainguard/wolfi-base AS builder
USER root
RUN apk add --no-cache nodejs-22 npm
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm install --ignore-scripts --no-save @rolldown/binding-linux-x64-gnu@1.0.3
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM cgr.dev/chainguard/wolfi-base AS runner
USER root
RUN apk add --no-cache nodejs-22 npm
WORKDIR /app
COPY --from=license / /
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev && npm install --ignore-scripts --no-save @rolldown/binding-linux-x64-gnu@1.0.3
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data && \
    adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["node", "dist/index.js"]

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm install @rolldown/binding-linux-x64-gnu --no-save
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install @rolldown/binding-linux-x64-gnu --no-save
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 8000
CMD ["node", "dist/index.js"]

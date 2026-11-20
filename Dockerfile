FROM node:24.14.0-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24.14.0-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir data && chown node:node data
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]

# Utility Watch core image. v0 runs the CLI and (soon) the MCP server via tsx.
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first for layer caching.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY plugins/example-provider/package.json plugins/example-provider/package.json
RUN npm install --no-audit --no-fund

# Copy the rest of the source.
COPY . .

ENV NODE_ENV=production

# Default command is the health check; compose / deploy override this
# (db:migrate, or the MCP server once it exists).
CMD ["npm", "run", "-s", "utility-watch", "--", "doctor"]

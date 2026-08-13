FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl unzip ffmpeg webp \
    && curl -fsSL https://rclone.org/install.sh | bash \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ARG UID=1000
ARG GID=1000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Numeric USER instead of a named account: node:22-bookworm-slim already
# ships a "node" user/group at 1000:1000, so creating our own "app" user
# would collide on the default UID/GID. Numeric UID:GID sidesteps that
# regardless of what the base image already defines, and still lets deploy
# override UID/GID to match the tree owner on the home server.
RUN chown -R "${UID}:${GID}" /app
USER ${UID}:${GID}
EXPOSE 3001
CMD ["node", "src/server/index.ts"]

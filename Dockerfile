FROM node:24-alpine AS base

RUN apk add --no-cache ca-certificates curl unzip ffmpeg libwebp-tools rclone postgresql17-client bash

ARG UID=1000
ARG GID=1000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Numeric USER instead of a named account: node:24-alpine already
# ships a "node" user/group at 1000:1000, so creating our own "app" user
# would collide on the default UID/GID. Numeric UID:GID sidesteps that
# regardless of what the base image already defines, and still lets deploy
# override UID/GID to match the tree owner on the home server.
RUN chown -R "${UID}:${GID}" /app

# /thumbnails is where THUMBNAIL_CACHE_DIR gets bind-mounted (see
# docker-compose.yml). Docker initializes a fresh named volume from
# whatever already exists at the mount path in the image, ownership
# included, so this directory must exist here with the right owner or the
# volume comes up root:root and the non-root USER below can't write to it.
RUN mkdir -p /thumbnails && chown -R "${UID}:${GID}" /thumbnails
USER ${UID}:${GID}
EXPOSE 3001
CMD ["node", "src/server/index.ts"]

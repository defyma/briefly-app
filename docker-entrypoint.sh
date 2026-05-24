#!/bin/sh
set -eu

mkdir -p /app/data /app/.next/cache/images

# When /app/data is bind-mounted from the host, ownership from the image is replaced.
# Fix it on container start, then drop privileges before running Next.js.
chown -R nextjs:nextjs /app/data /app/.next 2>/dev/null || true
chmod 775 /app/data 2>/dev/null || true

exec su-exec nextjs "$@"

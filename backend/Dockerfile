# The API as a container image, for any host that runs one (a container platform, or a VPS with Docker).
# Production today runs it on the VPS with systemd instead (deploy-backend.yml); HOSTING.md has both paths.
#
# Build from the repository root: the API also runs the Lab and judge code in frontend/src and serves content/.
#   docker build -f backend/Dockerfile -t tech-katta-api .
#   docker run --rm -p 8080:8080 --env-file backend/.env tech-katta-api
# Settings are environment variables (backend/.env.example); without the sign-in ones, sign-in is off and
# content is still served. The base image is the official Node image, from AWS's public mirror of Docker Hub.
FROM public.ecr.aws/docker/library/node:22-alpine

WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080

# dependencies first, so a code-only change reuses this layer
COPY backend/package.json backend/package-lock.json backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force

# frontend/package.json marks frontend/src as ES modules, which the API imports
COPY frontend/package.json frontend/package.json
COPY frontend/src frontend/src
COPY backend/src backend/src
COPY backend/scripts backend/scripts
COPY content content

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1
CMD ["node", "backend/src/server.js"]

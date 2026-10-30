# syntax=docker/dockerfile:1
# =============================================================================
# Image de production du front GestStock : Angular compilé, servi par Nginx.
#   docker build -t geststock-frontend .
# Nginx sert l'application et transmet /api au backend (BACKEND_URL, défaut http://backend:8080) :
# même origine pour le navigateur, donc ni CORS ni URL d'API en dur dans le bundle.
# =============================================================================

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Configuration production : environment.prod.ts, mock exclu (angular.json).
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
# Gabarit : ${BACKEND_URL} remplacé au démarrage du conteneur (envsubst de l'image officielle).
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
# En-têtes de sécurité, inclus par chaque location qui ajoute ses propres en-têtes.
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/gestion-stock/browser /usr/share/nginx/html
ENV BACKEND_URL=http://backend:8080
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1

# =============================================================================
# TaskFlow - Dockerfile (Multi-stage Build)
# =============================================================================
# Stage 1 : Build de l'application avec Node.js
# Stage 2 : Serveur nginx pour les fichiers statiques
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 : Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM docker.io/node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances (mode CI pour reproductibilité)
RUN npm ci

# Copie du code source
COPY . .

# Build de l'application
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 : Production avec nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM docker.io/nginx:alpine

# Copie des fichiers buildés
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration nginx personnalisée (SPA routing)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exposition du port
EXPOSE 80

# Commande de démarrage
CMD ["nginx", "-g", "daemon off;"]

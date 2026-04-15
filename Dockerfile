FROM node:18-alpine

# Instalar rclone
RUN apk add --no-cache curl bash && \
    curl https://rclone.org/install.sh | bash && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["bash", "scripts/start-server.sh"]

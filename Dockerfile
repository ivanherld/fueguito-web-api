FROM node:18-alpine

# Instalar rclone
RUN apk add --no-cache curl bash unzip && \
    curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip && \
    unzip rclone-current-linux-amd64.zip && \
    mv rclone-*-linux-amd64/rclone /usr/local/bin/ && \
    rm -rf rclone-* && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código
COPY . .

RUN chmod +x scripts/start-server.sh scripts/bootstrap-rclone.sh

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["bash", "scripts/start-server.sh"]

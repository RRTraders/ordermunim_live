FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Install Xvfb for headless display and needed system libs
RUN apt-get update && apt-get install -y \
    xvfb \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy package definitions
COPY package*.json ./
RUN npm install --production

# Copy app files
COPY . .

# Clean local sessions and temporary png files
RUN rm -rf sessions/* *.png

RUN chmod +x start.sh 2>/dev/null || true

ENV NODE_ENV=production
ENV DISPLAY=:99

# Startup: launch Xvfb + server
CMD ["bash", "-c", "Xvfb :99 -screen 0 1280x800x24 -ac &>/dev/null & sleep 1 && node server.js"]

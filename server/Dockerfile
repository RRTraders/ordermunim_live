FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Install Xvfb for virtual display window (bypasses bot detection)
RUN apt-get update && apt-get install -y \
    xvfb \
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

# Ensure playwright chromium is installed
RUN npx playwright install chromium

# Copy app files
COPY . .

# Clean local sessions and temporary png files if copied
RUN rm -rf sessions/* *.png
RUN chmod +x start.sh

ENV NODE_ENV=production

# Start using startup script
CMD ["/bin/bash", "./start.sh"]

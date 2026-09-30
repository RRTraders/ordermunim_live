FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Install Xvfb and dependencies for virtual display and Chrome
RUN apt-get update && apt-get install -y \
    xvfb \
    wget \
    gnupg \
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

# Install Google Chrome stable directly from Google (.deb)
RUN wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && (dpkg -i /tmp/chrome.deb || apt-get update && apt-get install -yf) \
    && rm -f /tmp/chrome.deb \
    || true

# Copy package definitions
COPY package*.json ./
RUN npm install --production

# Ensure playwright chromium and chrome dependencies are installed
RUN npx playwright install chromium && (npx playwright install chrome || true)

# Copy app files
COPY . .

# Clean local sessions and temporary png files if copied
RUN rm -rf sessions/* *.png
RUN chmod +x start.sh

ENV NODE_ENV=production

# Start using startup script
CMD ["/bin/bash", "./start.sh"]

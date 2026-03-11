# Use Apify's Camoufox image with pre-installed browsers
FROM apify/actor-node-playwright-camoufox:22-1.56.1

# Copy package files first
COPY package*.json ./

# Install dependencies - Apify base image handles permissions
RUN npm install

# Copy source code
COPY . .

# Set the start command
CMD ["node", "src/main.js"]

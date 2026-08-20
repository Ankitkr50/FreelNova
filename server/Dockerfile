FROM node:20-alpine

# Install openssl for Prisma Client compatibility
RUN apk add --no-cache openssl

# Set working directory inside container
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy remaining source code
COPY . .

# Generate Prisma Client code
RUN npx prisma generate

# Expose backend port
EXPOSE 5000

# Start clustering node production script
CMD ["npm", "run", "start"]

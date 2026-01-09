FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment for Next.js
ENV NEXT_PUBLIC_API_URL=http://localhost:3001

# Run the development server (bind to 0.0.0.0 for Docker)
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]


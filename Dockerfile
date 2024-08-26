FROM node:20-alpine
USER root
RUN mkdir -p /var/app
WORKDIR /var/app
COPY .env /var/app/.env
COPY package*.json ./
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3333
CMD ["node", "dist/src/main.js"]
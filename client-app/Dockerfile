FROM node:17-slim

WORKDIR /usr/src/client-app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

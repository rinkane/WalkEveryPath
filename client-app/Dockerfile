FROM node:17-slim

WORKDIR /usr/src/client-app

RUN apt-get update
RUN echo y | apt-get install git
RUN npm install -g @angular/cli

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

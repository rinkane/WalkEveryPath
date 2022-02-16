FROM node:17-slim as build-stage

WORKDIR /usr/src/client-app

RUN apt-get update
RUN echo y | apt-get install git
RUN npm install -g @angular/cli

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

#FROM nginx:1.21

#COPY --from=build-stage /usr/src/client-app/dist/client-app/ /usr/share/nginx/html

#COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# import base image
FROM node:8-alpine

# expose HTTP
EXPOSE 8080

# install system dependencies
RUN apk update && apk add --no-cache git python py-pip make g++

# copy the app src to the container
RUN mkdir -p /app
COPY . /app
WORKDIR /app

# install app dependencies
RUN npm install
RUN npm install -g bower
RUN bower install --allow-root

# fix for k8s permission problems
RUN mkdir /.pm2 && chmod 777 /.pm2 && chmod 777 /app

# start app
CMD npm run serve

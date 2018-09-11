# import base image
FROM node:6-alpine

# expose HTTP
EXPOSE 8080

# install system dependencies
RUN apk add --no-cache --virtual .gyp git python make g++

# copy the app src to the container
RUN mkdir -p /www
COPY . /www
WORKDIR /www

# install app dependencies (backend)
RUN npm install

# install app depedencies (frontend)
RUN npm install -g bower
RUN bower install --allow-root

# clean up node-gyp
RUN apk del .gyp

# install nginx
RUN apk update && apk add nginx

# override nginx default config
RUN rm -rf /etc/nginx/conf.d/default.conf
ADD conf/nginx/default.conf /etc/nginx/conf.d/default.conf

# start nginx
RUN mkdir -p /run/nginx && nginx

# start app
CMD npm run serve

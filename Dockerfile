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

# download wait-for-it
RUN apk update && apk add ca-certificates wget && update-ca-certificates
RUN wget https://raw.githubusercontent.com/eficode/wait-for/master/wait-for
RUN chmod +x wait-for
RUN chmod +x bin/start

# start the app
CMD npm start

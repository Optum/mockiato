# import base image
FROM node:8-alpine

# expose HTTP
EXPOSE 3000 8080

# install system dependencies
RUN apk update && apk add --no-cache git python py-pip make g++ nginx

# copy the app src to the container
RUN mkdir -p /app
COPY . /app
WORKDIR /app

# install app dependencies (backend)
RUN npm install

# install app depedencies (frontend)
RUN npm install -g bower
RUN bower install --allow-root

# override nginx default config
RUN rm -rf /etc/nginx/conf.d/default.conf
ADD conf/nginx/default.conf /etc/nginx/conf.d/default.conf

# update nginx to match worker_processes to no. of cpu's
RUN sed -i -e "s/worker_processes  1/worker_processes \
  $(cat /proc/cpuinfo | grep processor | wc -l)/" /etc/nginx/nginx.conf

# chown webroot for better mounting
RUN mkdir -p /usr/share/nginx/html
RUN chown -Rf nginx.nginx /usr/share/nginx/html

# allow nginx to run
RUN mkdir -p /run/nginx

# install and config supervisor
RUN pip install wheel
RUN pip install supervisor supervisor-stdout
ADD conf/supervisord/supervisord.conf /etc/supervisord.conf

# start app
CMD /usr/bin/supervisord -n -c /etc/supervisord.conf

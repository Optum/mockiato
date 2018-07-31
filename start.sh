#!/bin/sh

./wait-for $MQ_HOST:$MQ_PORT -- ./wait-for $MONGODB_HOST:27017 -- npm start
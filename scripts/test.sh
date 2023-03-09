#!/bin/bash
dir=`dirname $0`
cd "$dir"

docker compose -f ../test/docker-nginx-git/docker-compose.yml up -d

exit;

docker compose -f ../test/docker-nginx-git/docker-compose.yml up -d

./wait-for-it.sh localhost:8180 -t 10

sleep 1s

yarn test:run

docker compose -f ../test/docker-nginx-git/docker-compose.yml down

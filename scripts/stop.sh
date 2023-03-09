#!/bin/bash
cd `dirname $0`
dir=`pwd`

docker rm -f $(docker ps -q)

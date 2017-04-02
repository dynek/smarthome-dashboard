FROM alpine:3.5

MAINTAINER Pierrick Brossin <github@bs-network.net>

# exposed ports
EXPOSE  2080
EXPOSE  8888

# install nodejs
RUN apk --no-cache add nodejs

# app sources
COPY ./src /src/

# install app dependencies
RUN cd /src \
 && npm install

WORKDIR /

CMD ["node", "/src/backend/server.js"]

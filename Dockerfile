FROM alpine:3.5

MAINTAINER Pierrick Brossin <github@bs-network.net>

# exposed ports
EXPOSE  2080
EXPOSE  8888

# install nodejs
RUN set -ex \
    && ALPINE_VERSION="$(sed -r 's|(\d+\.\d+).*|\1|' /etc/alpine-release)" \
    && echo -e "https://alpine.global.ssl.fastly.net/alpine/v${ALPINE_VERSION}/main\nhttps://alpine.global.ssl.fastly.net/alpine/v${ALPINE_VERSION}/community" > /etc/apk/repositories \
    && apk --no-cache upgrade \
    && apk --no-cache add nodejs \
    && cd / ; rm -rf /tmp/* /var/cache/apk/*

# app sources
COPY ./src /src/

# install app dependencies
RUN cd /src \
 && npm install

WORKDIR /

CMD ["node", "/src/backend/server.js"]

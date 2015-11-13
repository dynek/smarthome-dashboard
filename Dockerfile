FROM debian:jessie

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && \
apt-get dist-upgrade --yes && \
apt-get install curl --yes && \
curl --silent --location https://deb.nodesource.com/setup_0.12 | bash - && \
apt-get install --yes nodejs && \
apt-get clean autoclean && \
rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Bundle app source
COPY ./src /src/
# Install app dependencies
RUN cd /src; npm install

EXPOSE  2080
EXPOSE  8888

WORKDIR /

CMD ["node", "/src/backend/server.js"]

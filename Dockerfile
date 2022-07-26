FROM node:latest AS install
WORKDIR /app
COPY ./package.json ./package-lock.json /app/
RUN npm install

FROM install AS run
COPY server.js /app/
COPY src /app/src

# Explicitly add Tini rather than relying on --init
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

CMD [ "npm", "start" ]

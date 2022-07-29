FROM node:latest AS install
WORKDIR /app
COPY ./package.json ./package-lock.json /app/
RUN npm install

COPY . /gitRepo
ADD docker/jq /bin/jq
ADD docker/addGitVersion.sh /tmp/addGitVersion.sh
RUN /tmp/addGitVersion.sh

FROM node:latest AS run
WORKDIR /app
COPY --from=install /app/ /app/
COPY server.js /app/
COPY src /app/src

# Explicitly add Tini rather than relying on --init
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

CMD [ "node", "server.js" ]

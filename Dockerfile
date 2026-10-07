# Node 20 on Debian 12 (bookworm): matches the Node 18-20 requirement of
# Strapi 4.25 (package.json engines), and bookworm's package repositories are
# supported, so installing ffmpeg below works (buster and bullseye are archived)
FROM node:20.18.3-bookworm

EXPOSE 1337

WORKDIR /opt/app

# ffmpeg converts uploaded video and audio (src/api/utils/media-processing)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY ./ .

RUN npm install
ENV PATH /opt/node_modules/.bin:$PATH

CMD ["npm", "run", "develop"]

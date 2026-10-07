FROM node:16.17.0

EXPOSE 1337

WORKDIR /opt/app

# ffmpeg converts uploaded videos to HLS (src/api/utils/video-processing)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY ./ .

RUN npm install
ENV PATH /opt/node_modules/.bin:$PATH

CMD ["npm", "run", "develop"]

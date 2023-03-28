FROM node:16.17.0

EXPOSE 1337

WORKDIR /opt/app

COPY ./ .

RUN npm install
ENV PATH /opt/node_modules/.bin:$PATH

CMD ["npm", "run", "develop"]

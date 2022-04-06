FROM node:lts-alpine as base
RUN mkdir -p /usr/src/app 
RUN chown -R node:node /usr/src/app
WORKDIR /usr/src/app
COPY --chown=node:node . .
RUN npm i ts-node typescript -g
USER node

FROM base as dev
ENV NODE_ENV=development
RUN npm ci
CMD ["npm", "run", "dev"]

FROM base as prod
ENV NODE_ENV=production
RUN npm ci --production
CMD ["npm", "start"]

EXPOSE 3001
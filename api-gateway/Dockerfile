FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./

ENV PORT=8001
EXPOSE 8001

CMD ["npm", "start"]

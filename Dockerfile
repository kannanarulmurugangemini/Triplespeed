FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY www.triplespeed.com ./www.triplespeed.com

RUN mkdir -p uploads

ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]

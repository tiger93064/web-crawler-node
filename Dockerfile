FROM node:14.20.0
COPY index.js package.json electron-crawler.db /app/
WORKDIR /app
RUN npm install && npm cache clean --force
EXPOSE 80
CMD [ "node", "index.js" ]
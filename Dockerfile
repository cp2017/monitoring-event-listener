FROM node:6.9.2

WORKDIR /opt/monitoring-event-listener
COPY package.json .
RUN npm install
CMD ["npm", "index.js"]

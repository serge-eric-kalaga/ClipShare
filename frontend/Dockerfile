FROM node:lts-alpine3.22

WORKDIR /app

COPY package.json /app
# COPY package-lock.json /app

RUN npm install --legacy-peer-deps  && npm install -g nodemon

COPY . .

CMD ["npm", "run", "dev", "--", "--port", "5173", "--hostname", "0.0.0.0"]

EXPOSE 5173
#Base Image node:12.18.4-alpine
FROM node:14-alpine
#Set working directory to /app
WORKDIR /app
#Set PATH /app/node_modules/.bin
ENV PATH /app/node_modules/.bin:$PATH
#Copy package.json in the image
COPY package.json ./

#Install Packages
RUN npm install

#Copy the app
COPY . ./
#Expose application port
EXPOSE 5500

#Start the app
CMD ["npm", "run", "start"]
# Use the base image with Node.js 8.11.3
FROM node:8.11.3

# Copy the current directory into the Docker image
COPY . /mm-processor
# Set working directory for future use
WORKDIR /mm-processor

# Install the dependencies from package.json
RUN npm install
CMD npm start

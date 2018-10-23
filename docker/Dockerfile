# Use the base image with Node.js 8.11.3
FROM openjdk:latest

# RUN apt-get install -y openjdk-8-jdk
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash
RUN apt-get install -y nodejs build-essential

# Copy the current directory into the Docker image
COPY . /mm-processor
# Set working directory for future use
WORKDIR /mm-processor

# Install the dependencies from package.json
RUN npm install
CMD npm start

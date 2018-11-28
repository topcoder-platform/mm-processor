# Use the base image with Node.js 8.12
FROM ubuntu:18.04

ENV MONO_VERSION 5.16.0.179

RUN apt-get update
RUN apt-get install -y build-essential g++ gcc cmake git wget curl unzip libtinfo-dev libz-dev
RUN wget -qO- https://deb.nodesource.com/setup_8.x | bash - && apt-get install -y nodejs

RUN apt-get install -y build-essential cmake git wget zip unzip libtinfo-dev libz-dev

RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF

RUN echo "deb https://download.mono-project.com/repo/ubuntu stable-bionic main" > /etc/apt/sources.list.d/mono-official-stable.list \
  && apt-get update \
  && apt-get install -y mono-runtime openjdk-8-jdk binutils curl mono-devel ca-certificates-mono fsharp mono-vbnc nuget referenceassemblies-pcl

RUN apt-get install -y pkg-config libgdiplus libunwind8 libssl-dev gettext libssl-dev libcurl4-openssl-dev zlib1g libicu-dev uuid-dev unzip

# Copy the current directory into the Docker image
COPY . /mm-processor
# Set working directory for future use
WORKDIR /mm-processor

# Install the dependencies from package.json
RUN npm install

# Source the env varialbes
RUN /bin/bash -c "source env.sh"

# Start the application
CMD npm start
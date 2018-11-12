# Use the base image with Node.js 8.12
FROM node:8.12-jessie

ENV MONO_VERSION 5.16.0.179

RUN echo "deb http://http.debian.net/debian jessie-backports main" >> /etc/apt/sources.list

RUN apt-get update
RUN apt-get install -y -t jessie-backports openjdk-8-jdk

RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF

RUN echo "deb http://download.mono-project.com/repo/debian stable-jessie/snapshots/$MONO_VERSION main" > /etc/apt/sources.list.d/mono-official-stable.list \
  && apt-get update \
  && apt-get install -y mono-runtime openjdk-8-jdk binutils curl mono-devel ca-certificates-mono fsharp mono-vbnc nuget referenceassemblies-pcl \
  && rm -rf /var/lib/apt/lists/* /tmp/*

# Copy the current directory into the Docker image
COPY . /mm-processor
# Set working directory for future use
WORKDIR /mm-processor

# Install the dependencies from package.json
RUN npm install --unsafe-perm
CMD bash

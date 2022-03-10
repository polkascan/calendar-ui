# STAGE 1: layered build of PolkADAPT submodule and Polkascan Explorer application.

FROM node:lts-alpine as builder

# Install the application dependencies.

WORKDIR /app

COPY package.json .
RUN npm i

# Copy the rest of the files and build the application.
COPY . .

ARG ENV_CONFIG=production
ENV ENV_CONFIG=$ENV_CONFIG

RUN npm exec ng build -- --configuration ${ENV_CONFIG}


# STAGE 2: Nginx setup to serve the application.

FROM nginx:stable-alpine

# Allow for various nginx proxy configuration.
ARG NGINX_CONF=nginx/calendar-ui.conf
ENV NGINX_CONF=$NGINX_CONF

# Remove default nginx configs.
RUN rm -rf /etc/nginx/conf.d/*

# Copy the nginx config.
COPY ${NGINX_CONF} /etc/nginx/conf.d/

# Remove default nginx website.
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from ‘builder’ stage to default nginx public folder.
COPY --from=builder /app/dist/calendar-ui /usr/share/nginx/html

# Copy config.json file for runtime environment variables.
ARG CONFIG_JSON=src/assets/config.json
ENV CONFIG_JSON=$CONFIG_JSON
COPY $CONFIG_JSON /usr/share/nginx/html/assets/config.json

EXPOSE 80

CMD ["/bin/sh",  "-c",  "exec nginx -g 'daemon off;'"]

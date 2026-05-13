FROM nginx:alpine

# Build argument to select which nginx configuration to use
ARG NGINX_CONFIG=nginx.prod.conf

# Copy the selected configuration as the default nginx site configuration
COPY ./nginx/${NGINX_CONFIG} /etc/nginx/conf.d/default.conf

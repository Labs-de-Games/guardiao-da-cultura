FROM nginx:alpine

RUN apk add --no-cache gettext

# Build argument to select which nginx configuration to use
ARG NGINX_CONFIG=nginx.production.conf

# Copy the selected configuration template
COPY ./nginx/${NGINX_CONFIG}.template /etc/nginx/conf.d/default.conf.template

# Generate the config from template at runtime and start nginx
CMD ["sh", "-c", "envsubst '$FRONTEND_PORT $BACKEND_PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]

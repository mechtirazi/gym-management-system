#!/bin/bash
set -e

export PORT="${PORT:-80}"
export API_URL="${API_URL:-http://localhost:8000}"

echo "Starting gym-ui on PORT=$PORT with API_URL=$API_URL"

# Inject API_URL into built JS files
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|API_URL_PLACEHOLDER|${API_URL}|g" {} \;

# Use nginx's built-in template engine to substitute $PORT in nginx.conf
# The template is at /etc/nginx/templates/default.conf.template
# nginx docker image auto-processes /etc/nginx/templates/*.template -> /etc/nginx/conf.d/
export NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/templates
export NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d

# Manually run envsubst since we need it before nginx starts
envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Nginx config:"
cat /etc/nginx/conf.d/default.conf

exec "$@"

#!/bin/bash
set -e

# Railway injects PORT env var — default to 80 if not set
export PORT="${PORT:-80}"
API_URL="${API_URL:-http://localhost:8000}"

echo "Starting with PORT=$PORT and API_URL=$API_URL"

# Replace API URL placeholder in all built JS files
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|API_URL_PLACEHOLDER|${API_URL}|g" {} \;

# Substitute $PORT in nginx config
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf > /tmp/default.conf
cp /tmp/default.conf /etc/nginx/conf.d/default.conf

echo "Nginx configured on port $PORT. Starting..."
exec "$@"

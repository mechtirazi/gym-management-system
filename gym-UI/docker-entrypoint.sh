#!/bin/bash
set -e

# Replace the API URL placeholder in all JS files at container startup
# This allows the API_URL to be injected as a Railway environment variable
API_URL="${API_URL:-http://localhost:8000}"

echo "Injecting API_URL: $API_URL"

# Replace placeholder in all built JS files
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|API_URL_PLACEHOLDER|${API_URL}|g" {} \;

echo "API URL injection complete. Starting nginx..."
exec "$@"

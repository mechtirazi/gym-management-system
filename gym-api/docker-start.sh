#!/bin/bash
set -e

PORT="${PORT:-8080}"
echo "=== Gym API Startup on PORT=$PORT ==="

# Write nginx config with CORS headers
cat > /etc/nginx/sites-available/default << NGINX
server {
    listen $PORT;
    server_name _;
    root /var/www/html/public;
    index index.php;

    # Handle CORS preflight OPTIONS requests
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
    add_header 'Access-Control-Expose-Headers' 'Authorization' always;

    location / {
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With';
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain';
            return 204;
        }
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }
}
NGINX

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Passport
if [ ! -f storage/oauth-public.key ]; then
    php artisan passport:keys --force
fi
chmod 600 storage/oauth-*.key 2>/dev/null || true
chown www-data:www-data storage/oauth-*.key 2>/dev/null || true
php artisan passport:client --personal --name="Gym Personal Access Client" --no-interaction 2>/dev/null || true

# Cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start php-fpm in background then nginx in foreground
echo "Starting php-fpm..."
php-fpm -D

echo "Starting nginx on port $PORT..."
exec nginx -g "daemon off;"

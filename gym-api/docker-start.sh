#!/bin/bash
set -e

PORT="${PORT:-8080}"
echo "=== Gym API Startup on PORT=$PORT ==="

# Write nginx config
cat > /etc/nginx/sites-available/default << NGINX
server {
    listen $PORT;
    server_name _;
    root /var/www/html/public;
    index index.php;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php\$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        fastcgi_param REQUEST_METHOD \$request_method;
        fastcgi_param HTTP_ORIGIN \$http_origin;
        fastcgi_param HTTP_ACCESS_CONTROL_REQUEST_METHOD \$http_access_control_request_method;
        fastcgi_param HTTP_ACCESS_CONTROL_REQUEST_HEADERS \$http_access_control_request_headers;
        include fastcgi_params;
    }
}
NGINX

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

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

# Start php-fpm in foreground mode in background using & 
# then start nginx in foreground
echo "Starting php-fpm..."
php-fpm --nodaemonize &
PHP_PID=$!

echo "Waiting for php-fpm to be ready..."
sleep 2

echo "Starting nginx on port $PORT..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for either process to exit
wait $PHP_PID $NGINX_PID

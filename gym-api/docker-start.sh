#!/bin/bash

PORT="${PORT:-8080}"
echo "=== Starting Gym API on PORT=$PORT ==="

# Clear any stale config/route/service caches that may have been built
# with local dev paths or wrong env values, then rebuild from current env vars.
echo "Clearing and rebuilding Laravel caches..."
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache

# Ensure Passport keys exist and are readable by php-fpm user.
if [ ! -f /var/www/html/storage/oauth-public.key ] || [ ! -f /var/www/html/storage/oauth-private.key ]; then
  echo "Passport keys missing. Generating..."
  php artisan passport:keys --force || true
fi

chown www-data:www-data /var/www/html/storage/oauth-*.key 2>/dev/null || true
chmod 640 /var/www/html/storage/oauth-*.key 2>/dev/null || true

# Remove conflicting nginx default site
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/conf.d/default.conf

# Write nginx config with dynamic PORT
cat > /etc/nginx/sites-available/gym-api << NGINX
server {
    listen $PORT;
    server_name _;
    root /var/www/html/public;
    index index.php;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \\.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/gym-api /etc/nginx/sites-enabled/gym-api

echo "Nginx config written for port $PORT"

# Copy supervisord config
cp /var/www/html/supervisord.conf /etc/supervisor/conf.d/gym-api.conf

echo "Starting supervisord..."
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf

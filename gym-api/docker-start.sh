#!/bin/bash
set -e

PORT="${PORT:-8080}"
echo "=== Starting Gym API on PORT=$PORT ==="

# Remove any conflicting default nginx configs
rm -f /etc/nginx/conf.d/default.conf
rm -f /etc/nginx/sites-enabled/default

# Write nginx config
cat > /etc/nginx/sites-available/gym-api << NGINX
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
        include fastcgi_params;
    }
}
NGINX

# Enable the site
ln -sf /etc/nginx/sites-available/gym-api /etc/nginx/sites-enabled/gym-api

# Test nginx config
echo "Testing nginx config..."
nginx -t

echo "Starting php-fpm..."
/usr/local/sbin/php-fpm --nodaemonize --fpm-config /usr/local/etc/php-fpm.conf &
PHP_PID=$!
echo "php-fpm started with PID $PHP_PID"

# Wait for php-fpm socket to be ready
echo "Waiting for php-fpm to be ready..."
for i in $(seq 1 10); do
    if /usr/local/sbin/php-fpm -t 2>/dev/null; then
        break
    fi
    sleep 1
done
sleep 2

echo "Starting nginx on port $PORT..."
/usr/sbin/nginx -g "daemon off;" &
NGINX_PID=$!
echo "nginx started with PID $NGINX_PID"

echo "=== Both services running. Waiting... ==="
wait $PHP_PID $NGINX_PID
echo "A process exited. Shutting down."

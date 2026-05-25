#!/bin/bash

PORT="${PORT:-8080}"
echo "=== Starting Gym API on PORT=$PORT ==="

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

echo "Starting php-fpm..."
/usr/local/sbin/php-fpm --nodaemonize --fpm-config /usr/local/etc/php-fpm.conf &
PHP_PID=$!
echo "php-fpm started with PID $PHP_PID"

# Wait for php-fpm to start
echo "Waiting for php-fpm..."
sleep 2

echo "Starting nginx on port $PORT..."
/usr/sbin/nginx -g "daemon off;" &
NGINX_PID=$!
echo "nginx started with PID $NGINX_PID"

echo "Both services running. Waiting..."
wait -n
echo "A process exited. Shutting down."

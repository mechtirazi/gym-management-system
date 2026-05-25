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
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
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

# Write supervisord config
mkdir -p /var/log/supervisor
cat > /etc/supervisor/conf.d/app.conf << SUPERVISOR
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:php-fpm]
command=/usr/local/sbin/php-fpm --nodaemonize
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/php-fpm.err.log
stdout_logfile=/var/log/supervisor/php-fpm.out.log

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/nginx.err.log
stdout_logfile=/var/log/supervisor/nginx.out.log
SUPERVISOR

# Laravel setup
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

echo "Running migrations..."
php artisan migrate --force

if [ ! -f storage/oauth-public.key ]; then
    php artisan passport:keys --force
fi
chmod 600 storage/oauth-*.key 2>/dev/null || true
chown www-data:www-data storage/oauth-*.key 2>/dev/null || true
php artisan passport:client --personal --name="Gym Personal Access Client" --no-interaction 2>/dev/null || true

php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Starting supervisord (nginx + php-fpm) on port $PORT..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf

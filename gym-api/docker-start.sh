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
mkdir -p /var/log/supervisor /var/run
cat > /etc/supervisor/conf.d/app.conf << SUPERVISOR
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid
loglevel=info

[program:php-fpm]
command=/usr/local/sbin/php-fpm --nodaemonize --fpm-config /usr/local/etc/php-fpm.conf
autostart=true
autorestart=true
priority=1
stderr_logfile=/var/log/supervisor/php-fpm.err.log
stdout_logfile=/var/log/supervisor/php-fpm.out.log

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
priority=10
stderr_logfile=/var/log/supervisor/nginx.err.log
stdout_logfile=/var/log/supervisor/nginx.out.log

[program:laravel-setup]
command=/bin/bash -c "sleep 3 && php /var/www/html/artisan migrate --force 2>&1 || true"
autostart=true
autorestart=false
startsecs=0
priority=5
stderr_logfile=/var/log/supervisor/setup.err.log
stdout_logfile=/var/log/supervisor/setup.out.log
SUPERVISOR

echo "Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf

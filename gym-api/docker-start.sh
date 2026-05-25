#!/bin/bash

PORT="${PORT:-8080}"
echo "=== Starting Gym API on PORT=$PORT ==="

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

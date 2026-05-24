#!/bin/bash
set -e

PORT="${PORT:-80}"
echo "=== Gym API Startup on PORT=$PORT ==="

# Apache reads APACHE_PORT via envvars — set it
export APACHE_PORT=$PORT

# Write a clean ports.conf with just the right port
cat > /etc/apache2/ports.conf << EOF
Listen $PORT
EOF

# Update VirtualHost port
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$PORT>/" /etc/apache2/sites-available/000-default.conf
sed -i "s/<VirtualHost \*:8080>/<VirtualHost *:$PORT>/" /etc/apache2/sites-available/000-default.conf 2>/dev/null || true

echo "ports.conf:"
cat /etc/apache2/ports.conf

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating APP_KEY..."
    php artisan key:generate --force
fi

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Passport keys
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

echo "=== Starting Apache on port $PORT ==="
exec apache2-foreground

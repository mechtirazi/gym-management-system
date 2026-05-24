#!/bin/bash
set -e

PORT="${PORT:-80}"
echo "=== Gym API Startup on PORT=$PORT ==="

# Rewrite ports.conf cleanly — no sed, no corruption
printf "Listen %s\n" "$PORT" > /etc/apache2/ports.conf

# Update VirtualHost port in site config
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost *:$PORT>/" /etc/apache2/sites-available/000-default.conf

echo "Apache will listen on port $PORT"

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

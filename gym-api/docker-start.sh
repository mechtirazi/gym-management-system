#!/bin/bash
set -e

# Railway injects PORT — default to 80
export PORT="${PORT:-80}"
echo "=== Gym API Startup on PORT=$PORT ==="

# Make Apache listen on $PORT instead of hardcoded 80
sed -i "s/Listen 80/Listen $PORT/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$PORT>/" /etc/apache2/sites-available/*.conf

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating APP_KEY..."
    php artisan key:generate --force
fi

# Run database migrations
echo "Running migrations..."
php artisan migrate --force

# Generate Passport keys if they don't exist
if [ ! -f storage/oauth-public.key ]; then
    echo "Generating Passport keys..."
    php artisan passport:keys --force
fi

# Fix key permissions
chmod 600 storage/oauth-*.key 2>/dev/null || true
chown www-data:www-data storage/oauth-*.key 2>/dev/null || true

# Create Passport personal access client if needed
php artisan passport:client --personal --name="Gym Personal Access Client" --no-interaction 2>/dev/null || true

# Cache config for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "=== Starting Apache on port $PORT ==="
exec apache2-foreground

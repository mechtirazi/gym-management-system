FROM php:8.2-fpm

# Install system dependencies + nginx + supervisor
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev \
    zip unzip libzip-dev default-mysql-client \
    nginx supervisor \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Get Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . /var/www/html/

# Install PHP dependencies
RUN composer install --optimize-autoloader --no-dev --no-interaction

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Generate passport keys at build time so they exist in the image
RUN php artisan passport:keys --force 2>/dev/null || true
RUN chown www-data:www-data storage/oauth-*.key 2>/dev/null || true
RUN chmod 640 storage/oauth-*.key 2>/dev/null || true

# Strip Windows CRLF from startup script and make executable
COPY docker-start.sh /usr/local/bin/docker-start.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-start.sh && chmod +x /usr/local/bin/docker-start.sh

# Set PHP upload limits at build time
RUN echo "upload_max_filesize = 20M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 25M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

# Force Docker cache bust on every deploy so route/config cache is always fresh
ARG CACHE_BUST=1

EXPOSE 8080

CMD ["/usr/local/bin/docker-start.sh"]

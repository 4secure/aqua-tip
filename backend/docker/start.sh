#!/bin/sh
set -e

# Run migrations on every deploy
php artisan migrate --force

# Cache configuration for production performance
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Start supervisor (PHP-FPM + Nginx)
exec /usr/bin/supervisord -c /etc/supervisord.conf

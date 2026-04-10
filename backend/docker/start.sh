#!/bin/sh
set -e

# Run migrations on every deploy
php artisan migrate --force

# Seed plans (updateOrCreate = safe to re-run)
php artisan db:seed --class=PlanSeeder --force

# Cache configuration (reads Railway env vars at runtime)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Start supervisor (PHP-FPM + Nginx)
exec /usr/bin/supervisord -c /etc/supervisord.conf

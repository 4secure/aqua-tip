<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'slug' => 'free',
                'name' => 'Free',
                'daily_credit_limit' => 5,
                'price_cents' => 0,
                'is_popular' => false,
                'sort_order' => 1,
                'is_active' => true,
                'features' => [
                    '5 searches per day',
                    'Threat search',
                ],
                'description' => 'Search threats with 5 daily lookups.',
            ],
            [
                'slug' => 'basic',
                'name' => 'Basic',
                'daily_credit_limit' => 30,
                'price_cents' => 1000,
                'is_popular' => false,
                'sort_order' => 2,
                'is_active' => true,
                'features' => [
                    '30 searches per day',
                    'All threat lookups',
                    'Full indicator data',
                    'Search history',
                    'Priority data access',
                    'Dark web monitoring',
                ],
                'description' => 'For individuals who need regular threat intelligence.',
            ],
            [
                'slug' => 'pro',
                'name' => 'Pro',
                'daily_credit_limit' => 50,
                'price_cents' => 2900,
                'is_popular' => true,
                'sort_order' => 3,
                'is_active' => true,
                'features' => [
                    '50 searches per day',
                    'All threat lookups',
                    'Full indicator data',
                    'Search history',
                    'Priority data access',
                    'Dark web monitoring',
                ],
                'description' => 'For security professionals and analysts.',
            ],
            [
                'slug' => 'enterprise',
                'name' => 'Enterprise',
                'daily_credit_limit' => 200,
                'price_cents' => null,
                'is_popular' => false,
                'sort_order' => 4,
                'is_active' => true,
                'features' => [
                    '200 searches per day',
                    'All threat lookups',
                    'Full indicator data',
                    'Search history',
                    'Priority data access',
                    'Dark web monitoring',
                    'API access',
                ],
                'description' => 'For teams and organizations with advanced needs.',
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan,
            );
        }
    }
}

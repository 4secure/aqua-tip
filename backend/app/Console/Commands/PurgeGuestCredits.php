<?php

namespace App\Console\Commands;

use App\Models\Credit;
use Illuminate\Console\Command;

class PurgeGuestCredits extends Command
{
    protected $signature = 'credits:purge-guests';

    protected $description = 'Delete guest credit rows older than 7 days';

    public function handle(): int
    {
        $deleted = Credit::whereNull('user_id')
            ->where('updated_at', '<', now()->subDays(7))
            ->delete();

        $this->info("Deleted {$deleted} guest credit row(s).");

        return self::SUCCESS;
    }
}

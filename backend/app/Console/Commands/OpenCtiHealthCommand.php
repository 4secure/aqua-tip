<?php

namespace App\Console\Commands;

use App\Exceptions\OpenCtiConnectionException;
use App\Exceptions\OpenCtiQueryException;
use App\Services\OpenCtiService;
use Illuminate\Console\Command;

class OpenCtiHealthCommand extends Command
{
    protected $signature = 'opencti:health';

    protected $description = 'Check OpenCTI API connectivity';

    public function handle(OpenCtiService $service): int
    {
        try {
            $result = $service->healthCheck();

            $this->info('OpenCTI is reachable');
            $this->line("  Version: {$result['version']}");

            return self::SUCCESS;
        } catch (OpenCtiConnectionException|OpenCtiQueryException $e) {
            $this->error("OpenCTI is not reachable: {$e->getMessage()}");

            return self::FAILURE;
        }
    }
}

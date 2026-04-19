<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SessionService;

class SyncSessionStatuses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:sync-status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize session statuses (upcoming -> ongoing -> completed) based on current time.';

    /**
     * Execute the console command.
     */
    public function handle(SessionService $sessionService)
    {
        $this->info('Starting session status synchronization...');
        
        $sessionService->syncSessionStatuses();
        
        $this->info('Session statuses synchronized successfully.');
    }
}

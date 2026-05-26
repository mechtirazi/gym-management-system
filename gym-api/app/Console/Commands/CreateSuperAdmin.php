<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateSuperAdmin extends Command
{
    protected $signature = 'admin:create
                            {--name= : First name}
                            {--last-name= : Last name}
                            {--email= : Email address}
                            {--password= : Password}';

    protected $description = 'Create a new super admin user';

    public function handle(): int
    {
        $this->info('Creating a new Super Admin...');

        // Gather inputs interactively if not passed as options
        $name     = $this->option('name')      ?? $this->ask('First name');
        $lastName = $this->option('last-name') ?? $this->ask('Last name');
        $email    = $this->option('email')     ?? $this->ask('Email address');
        $password = $this->option('password')  ?? $this->secret('Password (min 8 chars)');

        // Validate
        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            ['email' => 'required|email|unique:users,email', 'password' => 'required|min:8']
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        $user = User::create([
            'name'              => $name,
            'last_name'         => $lastName,
            'email'             => $email,
            'password'          => Hash::make($password),
            'role'              => User::ROLE_SUPER_ADMIN,
            'status'            => 'active',
            'email_verified_at' => now(),
            'creation_date'     => now(),
        ]);

        $this->info("✓ Super admin created successfully!");
        $this->table(
            ['Field', 'Value'],
            [
                ['ID',    $user->id_user],
                ['Name',  $user->name . ' ' . $user->last_name],
                ['Email', $user->email],
                ['Role',  $user->role],
            ]
        );

        return self::SUCCESS;
    }
}

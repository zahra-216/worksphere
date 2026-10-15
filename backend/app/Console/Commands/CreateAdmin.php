<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateAdmin extends Command
{
    protected $signature = 'worksphere:create-admin';
    protected $description = 'Create a WorkSphere admin account';

    public function handle()
    {
        $data = [
            'name' => $this->ask('Name'),
            'email' => $this->ask('Email'),
            'password' => $this->secret('Password (min 8 characters)'),
        ];

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        $admin = User::create($data + ['role' => 'admin', 'status' => 'active']);
        $admin->update(['staff_code' => 'ADM' . str_pad($admin->id, 4, '0', STR_PAD_LEFT)]);

        $this->info('Admin created: ' . $admin->email);
        return self::SUCCESS;
    }
}

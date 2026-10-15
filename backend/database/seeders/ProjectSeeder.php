<?php

namespace Database\Seeders;

use App\Models\Project;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['IMS', 'Media', 'Marketing'] as $name) {
            Project::firstOrCreate(['name' => $name]);
        }
    }
}

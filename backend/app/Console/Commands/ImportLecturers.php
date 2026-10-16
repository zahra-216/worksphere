<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportLecturers extends Command
{
    protected $signature = 'worksphere:import-lecturers
                            {--lms-db=lms : Name of the LMS database}
                            {--dry-run : Only show what would happen}';

    protected $description = 'Copy lecturers from the LMS into WorkSphere (keeps their QR token and password)';

    public function handle()
    {
        $lmsDb = $this->option('lms-db');
        $dry = $this->option('dry-run');

        $lecturers = DB::table("{$lmsDb}.lecturers")->orderBy('id')->get();

        $imported = 0;
        $skipped = 0;
        $noEmail = [];
        $newToken = [];

        foreach ($lecturers as $l) {
            $email = $l->email ?: strtolower($l->username) . '@worksphere.local';

            // Already imported? (same email or same QR token)
            $exists = DB::table('users')->where(function ($q) use ($email, $l) {
                $q->where('email', $email);
                if ($l->qr_token) {
                    $q->orWhere('qr_token', $l->qr_token);
                }
            })->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            if (!$l->email) {
                $noEmail[] = "{$l->name} ({$l->username})";
            }
            if (!$l->qr_token) {
                $newToken[] = $l->name;
            }

            $imported++;
            if ($dry) {
                continue;
            }

            // Query builder on purpose: the password is already hashed, so don't hash it again
            $id = DB::table('users')->insertGetId([
                'name' => $l->name,
                'email' => $email,
                'password' => $l->password,
                'role' => 'lecturer',
                'status' => 'active',
                'qr_token' => $l->qr_token ?: Str::random(40),
                'joined_date' => $l->created_at ? Carbon::parse($l->created_at)->toDateString() : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('users')->where('id', $id)->update([
                'staff_code' => 'LEC' . str_pad($id, 4, '0', STR_PAD_LEFT),
            ]);
        }

        $this->info(($dry ? '[DRY RUN] ' : '') . "Imported: {$imported}   Skipped (already there): {$skipped}");

        if ($noEmail) {
            $this->warn('No email in the LMS, so a placeholder @worksphere.local email was used. Edit these in WorkSphere:');
            foreach ($noEmail as $n) {
                $this->line("  - {$n}");
            }
        }

        if ($newToken) {
            $this->warn('No QR token in the LMS, so a new one was made (they need a new QR): ' . implode(', ', $newToken));
        }

        return self::SUCCESS;
    }
}

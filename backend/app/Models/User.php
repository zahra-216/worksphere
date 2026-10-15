<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'staff_code', 'name', 'email', 'password', 'role', 'nic', 'phone',
        'position', 'employment_type', 'university', 'joined_date',
        'photo', 'status', 'qr_token',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'joined_date' => 'date',
        'password' => 'hashed',
    ];

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    // Gives the user a unique QR token if they don't have one yet.
    // Lecturers imported from the LMS keep their existing token.
    public function ensureQrToken(): string
    {
        if (!$this->qr_token) {
            $this->qr_token = Str::random(40);
            $this->save();
        }

        return $this->qr_token;
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function gateLogs()
    {
        return $this->hasMany(GateLog::class);
    }
}

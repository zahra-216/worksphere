<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    protected $fillable = [
        'user_id', 'leave_type', 'start_date', 'end_date', 'reason',
        'status', 'decided_by', 'decided_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'decided_at' => 'datetime',
    ];

    protected $appends = ['total_days'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function decider()
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function getTotalDaysAttribute(): int
    {
        return $this->start_date->diffInDays($this->end_date) + 1;
    }
}

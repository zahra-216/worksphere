<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = [
        'project_id', 'assigned_to', 'created_by', 'title', 'description',
        'start_date', 'due_date', 'completed_date', 'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'completed_date' => 'date',
    ];

    protected $appends = ['days_taken'];

    public function project()
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Days from start date to completed date (or to today while still pending)
    public function getDaysTakenAttribute(): int
    {
        $end = $this->completed_date ?? now();

        return max(0, $this->start_date->startOfDay()->diffInDays($end->copy()->startOfDay()));
    }

    // Keeps status and completed_date in sync
    public function markCompleted(): void
    {
        $this->update(['status' => 'completed', 'completed_date' => now()->toDateString()]);
    }

    public function markPending(): void
    {
        $this->update(['status' => 'pending', 'completed_date' => null]);
    }
}

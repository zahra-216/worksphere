<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    // Conversion rules (counted in "short leave" units):
    //   3 short leaves = 1 half day, 2 half days = 1 full day  =>  1 full day = 6 units
    public const UNITS_SHORT = 1;
    public const UNITS_HALF = 3;
    public const UNITS_FULL = 6;

    // A short leave is a 1 hour permission. A half day is 3 hours or more.
    public const SHORT_MINUTES = 60;
    public const HALF_MIN_MINUTES = 180; // at least this many minutes

    protected $fillable = [
        'user_id', 'leave_type', 'duration_type', 'start_date', 'end_date',
        'start_time', 'end_time', 'reason', 'status', 'decided_by', 'decided_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'decided_at' => 'datetime',
    ];

    protected $appends = ['total_days', 'units', 'duration_label'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function decider()
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    // Calendar days covered (full leave can span many days; half/short are always one day)
    public function getCalendarDaysAttribute(): int
    {
        return $this->start_date->diffInDays($this->end_date) + 1;
    }

    // Size of this request in short-leave units
    public function getUnitsAttribute(): int
    {
        return match ($this->duration_type) {
            'short' => self::UNITS_SHORT,
            'half' => self::UNITS_HALF,
            default => $this->calendar_days * self::UNITS_FULL,
        };
    }

    // Size in days: 1, 0.5 or 0.17 for a single request
    public function getTotalDaysAttribute(): float
    {
        return round($this->units / self::UNITS_FULL, 2);
    }

    public function getDurationLabelAttribute(): string
    {
        return match ($this->duration_type) {
            'short' => 'Short leave',
            'half' => 'Half day',
            default => 'Full day',
        };
    }

    // Turn a pile of units into the biggest whole pieces: 8 units => 1 day + 1 half day + 2 short leaves
    public static function breakdown(int $units): array
    {
        return [
            'full' => intdiv($units, self::UNITS_FULL),
            'half' => intdiv($units % self::UNITS_FULL, self::UNITS_HALF),
            'short' => $units % self::UNITS_HALF,
        ];
    }

    public static function describeUnits(int $units): string
    {
        $b = self::breakdown($units);
        $parts = [];
        if ($b['full']) $parts[] = $b['full'] . ($b['full'] === 1 ? ' day' : ' days');
        if ($b['half']) $parts[] = $b['half'] . ($b['half'] === 1 ? ' half day' : ' half days');
        if ($b['short']) $parts[] = $b['short'] . ($b['short'] === 1 ? ' short leave' : ' short leaves');

        return $parts ? implode(', ', $parts) : '0 days';
    }
}

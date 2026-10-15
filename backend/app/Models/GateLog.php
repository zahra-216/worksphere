<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GateLog extends Model
{
    protected $fillable = ['user_id', 'scan_type', 'scanned_at', 'gate_device_id'];

    protected $casts = ['scanned_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function device()
    {
        return $this->belongsTo(GateDevice::class, 'gate_device_id');
    }
}

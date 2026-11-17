<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScanDevice extends Model
{
    protected $fillable = ['name', 'token_hash', 'registered_by', 'last_used_at', 'revoked_at'];

    protected $hidden = ['token_hash'];

    protected $casts = [
        'last_used_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public static function hash(string $key): string
    {
        return hash('sha256', $key);
    }

    // The device that sent this key, if it is registered and not revoked
    public static function fromKey(?string $key): ?self
    {
        $key = trim((string) $key);

        return $key === ''
            ? null
            : static::where('token_hash', static::hash($key))->whereNull('revoked_at')->first();
    }

    public function registrar()
    {
        return $this->belongsTo(User::class, 'registered_by');
    }
}

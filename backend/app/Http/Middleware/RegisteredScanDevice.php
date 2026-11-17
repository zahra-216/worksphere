<?php

namespace App\Http\Middleware;

use App\Models\ScanDevice;
use Closure;
use Illuminate\Http\Request;

// Only devices the admin registered may use the attendance scanner.
// The device sends its key in the X-Scan-Device header.
class RegisteredScanDevice
{
    public function handle(Request $request, Closure $next)
    {
        $device = ScanDevice::fromKey($request->header('X-Scan-Device'));

        if (!$device) {
            return response()->json([
                'message' => 'This device is not allowed to mark attendance. Register it first.',
                'code' => 'device_not_registered',
            ], 403);
        }

        $device->forceFill(['last_used_at' => now()])->save();

        return $next($request);
    }
}

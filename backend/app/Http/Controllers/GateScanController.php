<?php

namespace App\Http\Controllers;

use App\Models\GateDevice;
use App\Models\GateLog;
use App\Models\User;
use Illuminate\Http\Request;

class GateScanController extends Controller
{
    // Camera page: tablet opens this once and bookmarks it
    public function scanner($deviceKey)
    {
        $device = GateDevice::where('device_key', $deviceKey)->where('is_active', true)->first();

        if (!$device) {
            abort(403, 'Invalid or inactive device.');
        }

        return view('gate-scanner', compact('device', 'deviceKey'));
    }

    // Called every time the camera reads a QR code
    public function scan(Request $request, $deviceKey)
    {
        $device = GateDevice::where('device_key', $deviceKey)->where('is_active', true)->first();

        if (!$device) {
            return response()->json(['success' => false, 'message' => 'Device not authorized.'], 403);
        }

        $device->update(['last_used_at' => now()]);

        $token = trim((string) $request->input('token'));
        $user = $token === '' ? null : User::where('qr_token', $token)->where('status', 'active')->first();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Card not recognized.'], 404);
        }

        // Ignore a second tap within 10 seconds
        $recent = GateLog::where('user_id', $user->id)
            ->where('scanned_at', '>=', now()->subSeconds(10))
            ->exists();

        if ($recent) {
            return response()->json(['success' => false, 'message' => 'Already scanned, please wait.'], 429);
        }

        // In or out depends on today's last scan
        $lastToday = GateLog::where('user_id', $user->id)
            ->whereDate('scanned_at', now()->toDateString())
            ->orderByDesc('scanned_at')
            ->first();

        $scanType = ($lastToday && $lastToday->scan_type === 'in') ? 'out' : 'in';

        GateLog::create([
            'user_id' => $user->id,
            'scan_type' => $scanType,
            'scanned_at' => now(),
            'gate_device_id' => $device->id,
        ]);

        return response()->json([
            'success' => true,
            'name' => $user->name,
            'ref' => $user->staff_code,
            'type' => $user->role,
            'scan_type' => $scanType,
            'date' => now()->format('d M Y'),
            'time' => now()->format('h:i A'),
        ]);
    }
}

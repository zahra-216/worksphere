<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GateLog;
use App\Models\User;
use Illuminate\Http\Request;

class SelfScanController extends Controller
{
    private function person(Request $request): ?User
    {
        $token = trim((string) $request->input('token'));

        return $token === ''
            ? null
            : User::where('qr_token', $token)->where('status', 'active')->first();
    }

    private function nextType(User $user): string
    {
        $last = GateLog::where('user_id', $user->id)
            ->whereDate('scanned_at', now()->toDateString())
            ->orderByDesc('scanned_at')
            ->first();

        return ($last && $last->scan_type === 'in') ? 'out' : 'in';
    }

    // Step 1: QR scanned, find the person
    public function verify(Request $request)
    {
        $user = $this->person($request);

        if (!$user) {
            return response()->json(['message' => 'QR code not recognized.'], 404);
        }

        return response()->json([
            'name' => $user->name,
            'next' => $this->nextType($user),
        ]);
    }

    // Step 2: Check In / Check Out clicked
    public function mark(Request $request)
    {
        $user = $this->person($request);

        if (!$user) {
            return response()->json(['message' => 'QR code not recognized.'], 404);
        }

        $recent = GateLog::where('user_id', $user->id)
            ->where('scanned_at', '>=', now()->subSeconds(10))
            ->exists();

        if ($recent) {
            return response()->json(['message' => 'Already recorded, please wait.'], 429);
        }

        $type = $this->nextType($user);

        GateLog::create([
            'user_id' => $user->id,
            'scan_type' => $type,
            'scanned_at' => now(),
        ]);

        return response()->json([
            'name' => $user->name,
            'ref' => $user->staff_code,
            'role' => $user->role,
            'scan_type' => $type,
            'date' => now()->format('d M Y'),
            'time' => now()->format('h:i A'),
        ]);
    }
}
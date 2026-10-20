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

    private function todayCount(User $user): int
    {
        return GateLog::where('user_id', $user->id)
            ->whereDate('scanned_at', now()->toDateString())
            ->count();
    }

    private function details(User $user, string $next): array
    {
        return [
            'name' => $user->name,
            'ref' => $user->staff_code,
            'role' => $user->role,
            'next' => $next,
            'date' => now()->format('d M Y'),
            'time' => now()->format('h:i A'),
        ];
    }

    public function verify(Request $request)
    {
        $user = $this->person($request);

        if (!$user) {
            return response()->json(['message' => 'QR code not recognized.'], 404);
        }

        $count = $this->todayCount($user);

        if ($count >= 2) {
            return response()->json(['message' => $user->name . ' has already checked in and out today.'], 422);
        }

        return response()->json($this->details($user, $count === 0 ? 'in' : 'out'));
    }

    public function mark(Request $request)
    {
        $user = $this->person($request);

        if (!$user) {
            return response()->json(['message' => 'QR code not recognized.'], 404);
        }

        $count = $this->todayCount($user);

        if ($count >= 2) {
            return response()->json(['message' => 'Already checked in and out today.'], 422);
        }

        $type = $count === 0 ? 'in' : 'out';

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
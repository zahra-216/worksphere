<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

// What a normal phone scanner sees. Read only: it NEVER marks attendance.
// Keep this to the basics (no email, phone, NIC, photo...).
class PublicQrController extends Controller
{
    public function show($token)
    {
        $user = User::where('qr_token', $token)->where('status', 'active')->first();

        if (!$user) {
            return response()->json(['message' => 'This QR code is not recognized.'], 404);
        }

        return response()->json([
            'name' => $user->name,
            'staff_code' => $user->staff_code,
            'role' => $user->role,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class PasswordController extends Controller
{
    // Logged-in user changes their own password
    public function change(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => $data['password']]);

        // Log out every other device
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Password changed.']);
    }

    // Sends the reset email. Same answer whether the email exists or not.
    public function forgot(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);

        $user = User::where('email', $data['email'])->where('status', 'active')->first();

        if ($user) {
            Password::sendResetLink(['email' => $user->email]);
        }

        return response()->json(['message' => 'If that email is registered, a reset link has been sent.']);
    }

    // The link in the email opens the website, which sends token + email + new password here
    public function reset(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => $password])->save();
            $user->tokens()->delete();   // log out everywhere
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'This reset link is invalid or has expired.'], 422);
        }

        return response()->json(['message' => 'Password reset. You can now log in.']);
    }
}

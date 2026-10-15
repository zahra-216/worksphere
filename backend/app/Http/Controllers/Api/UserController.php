<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class UserController extends Controller
{
    private const PREFIX = ['staff' => 'STF', 'lecturer' => 'LEC', 'intern' => 'INT'];

    // GET /api/users?role=staff|lecturer|intern&search=...&status=active
    public function index(Request $request)
    {
        $search = $request->query('search');

        $users = User::query()
            ->where('role', '!=', 'admin')
            ->when($request->query('role'), fn($q, $role) => $q->where('role', $role))
            ->when($request->query('status'), fn($q, $status) => $q->where('status', $status))
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('staff_code', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 10));

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'role' => ['required', Rule::in(['staff', 'lecturer', 'intern'])],
            'nic' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:30',
            'position' => 'nullable|string|max:100',
            'employment_type' => 'nullable|string|max:50',
            'university' => 'nullable|string|max:150',
            'joined_date' => 'nullable|date',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'password' => 'nullable|string|min:8',
        ]);

        // If no password is given, make a temporary one and show it once
        $generated = empty($data['password']);
        $plain = $generated ? Str::random(10) : $data['password'];
        $data['password'] = $plain;

        unset($data['photo']);
        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('users', 'public');
        }

        $user = User::create($data);
        $user->update(['staff_code' => self::PREFIX[$user->role] . str_pad($user->id, 4, '0', STR_PAD_LEFT)]);
        $user->ensureQrToken();

        return response()->json([
            'user' => $user->fresh(),
            'temp_password' => $generated ? $plain : null,
        ], 201);
    }

    public function show($id)
    {
        return response()->json(User::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        abort_if($user->role === 'admin', 403, 'Admin accounts cannot be edited here.');

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'nic' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:30',
            'position' => 'nullable|string|max:100',
            'employment_type' => 'nullable|string|max:50',
            'university' => 'nullable|string|max:150',
            'joined_date' => 'nullable|date',
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'photo' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'password' => 'nullable|string|min:8',
        ]);

        unset($data['photo']);
        if ($request->hasFile('photo')) {
            if ($user->photo) {
                Storage::disk('public')->delete($user->photo);
            }
            $data['photo'] = $request->file('photo')->store('users', 'public');
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json($user->fresh());
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        abort_if($user->role === 'admin', 403, 'Admin accounts cannot be deleted here.');

        if ($user->photo) {
            Storage::disk('public')->delete($user->photo);
        }
        $user->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    // GET /api/users/{id}/qr  -> SVG image of this person's unique QR
    public function qr($id)
    {
        $user = User::findOrFail($id);
        $svg = QrCode::size(300)->generate($user->ensureQrToken());

        return response($svg)->header('Content-Type', 'image/svg+xml');
    }
}

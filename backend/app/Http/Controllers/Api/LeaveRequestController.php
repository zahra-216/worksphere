<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\LeaveDecided;
use App\Mail\LeaveRequested;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class LeaveRequestController extends Controller
{
    // Admin sees all. Everyone else sees only their own.
    // Filters: status, search (name)
    public function index(Request $request)
    {
        $user = $request->user();

        $leaves = LeaveRequest::with('user')
            ->when(!$user->isAdmin(), fn($q) => $q->where('user_id', $user->id))
            ->when($request->query('status'), fn($q, $s) => $q->where('status', $s))
            ->when($user->isAdmin() && $request->query('search'), function ($q, $s) {
                $q->whereHas('user', fn($u) => $u->where('name', 'like', "%{$s}%")
                    ->orWhere('staff_code', 'like', "%{$s}%"));
            })
            ->orderByDesc('created_at')
            ->paginate((int) $request->query('per_page', 10));

        return response()->json($leaves);
    }

    public function show(Request $request, $id)
    {
        $leave = LeaveRequest::with('user')->findOrFail($id);
        abort_unless($request->user()->isAdmin() || $leave->user_id === $request->user()->id, 403);

        return response()->json($leave);
    }

    // No "one day ahead" rule here on purpose (emergencies). That is only a note on the form.
    public function store(Request $request)
    {
        $user = $request->user();
        abort_if($user->isAdmin(), 403, 'Admins do not request leave.');

        $data = $request->validate([
            'leave_type' => ['required', Rule::in(['annual', 'sick', 'casual'])],
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string|max:1000',
        ]);

        $leave = LeaveRequest::create($data + ['user_id' => $user->id]);
        $leave->load('user');

        // Email the admin(s). A mail problem should never block the request.
        try {
            $emails = User::where('role', 'admin')->where('status', 'active')->pluck('email');
            if ($emails->isNotEmpty()) {
                Mail::to($emails)->send(new LeaveRequested($leave));
            }
        } catch (\Throwable $e) {
            Log::error('Leave request email failed: ' . $e->getMessage());
        }

        return response()->json($leave, 201);
    }

    // Admin only: approve or reject
    public function decide(Request $request, $id)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['approved', 'rejected'])]]);

        $leave = LeaveRequest::with('user')->findOrFail($id);

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'This request was already ' . $leave->status . '.'], 422);
        }

        $leave->update([
            'status' => $data['status'],
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        try {
            Mail::to($leave->user->email)->send(new LeaveDecided($leave));
        } catch (\Throwable $e) {
            Log::error('Leave decision email failed: ' . $e->getMessage());
        }

        return response()->json($leave->fresh('user'));
    }

    // Staff can cancel their own pending request
    public function destroy(Request $request, $id)
    {
        $leave = LeaveRequest::findOrFail($id);
        $user = $request->user();

        abort_unless($user->isAdmin() || ($leave->user_id === $user->id && $leave->status === 'pending'), 403);

        $leave->delete();

        return response()->json(['message' => 'Leave request removed.']);
    }
}

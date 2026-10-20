<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GateLog;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class GateLogController extends Controller
{
    // GET /api/gate-log?date=2026-10-15
    // Gives the Staff Attendance screen: today's counts + each person's first in / last out
    public function index(Request $request)
    {
        $date = $request->query('date', now()->toDateString());
        $lateAfter = Carbon::parse($date . ' ' . Setting::get('late_after', '08:30'));

        $logs = GateLog::with('user')
            ->whereDate('scanned_at', $date)
            ->orderBy('scanned_at')
            ->get();

        $records = $logs->groupBy('user_id')->map(function ($userLogs) use ($lateAfter) {
            $user = $userLogs->first()->user;
            if (!$user) {
                return null;
            }

            $in = $userLogs->firstWhere('scan_type', 'in');
            $out = $userLogs->where('scan_type', 'out')->last();

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'staff_code' => $user->staff_code,
                'role' => $user->role,
                'photo_url' => $user->photo_url,
                'check_in' => $in?->scanned_at,
                'check_out' => $out?->scanned_at,
                'late' => $in ? $in->scanned_at->gt($lateAfter) : false,
            ];
        })->filter()->values();

        $total = User::where('role', '!=', 'admin')->where('status', 'active')->count();
        $present = $records->count();

        return response()->json([
            'date' => $date,
            'summary' => [
                'present' => $present,
                'absent' => max(0, $total - $present),
                'late' => $records->where('late', true)->count(),
            ],
            'records' => $records,
        ]);
    }

    public function history(Request $request)
    {
        try {
            $start = Carbon::createFromFormat('!Y-m', $request->query('month', now()->format('Y-m')))->startOfMonth();
        } catch (\Throwable $e) {
            $start = now()->startOfMonth();
        }
        $end = $start->copy()->endOfMonth();

        $lateTime = Setting::get('late_after', '08:30');
        $search = trim((string) $request->query('search'));

        $logs = GateLog::with('user')
            ->whereBetween('scanned_at', [$start, $end])
            ->when($search !== '', fn($q) => $q->whereHas('user', fn($u) => $u
                ->where('name', 'like', "%$search%")
                ->orWhere('staff_code', 'like', "%$search%")))
            ->orderBy('scanned_at')
            ->get();

        $rows = $logs->groupBy(fn($l) => $l->user_id . '|' . $l->scanned_at->toDateString())
            ->map(function ($g) use ($lateTime) {
                $user = $g->first()->user;
                if (!$user) {
                    return null;
                }

                $date = $g->first()->scanned_at->toDateString();
                $in = $g->firstWhere('scan_type', 'in');
                $out = $g->where('scan_type', 'out')->last();

                return [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'staff_code' => $user->staff_code,
                    'role' => $user->role,
                    'date' => $date,
                    'check_in' => $in?->scanned_at,
                    'check_out' => $out?->scanned_at,
                    'late' => $in ? $in->scanned_at->gt(Carbon::parse("$date $lateTime")) : false,
                ];
            })
            ->filter()
            ->sortBy([['date', 'desc'], ['name', 'asc']])
            ->values();

        return response()->json(['month' => $start->format('Y-m'), 'rows' => $rows]);
    }

}

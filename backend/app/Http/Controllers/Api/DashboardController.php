<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GateLog;
use App\Models\LeaveRequest;
use App\Models\Setting;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    // Admin gets the big picture. Everyone else gets their own numbers.
    public function index(Request $request)
    {
        $user = $request->user();

        return response()->json($user->isAdmin() ? $this->admin() : $this->personal($user));
    }

    private function admin(): array
    {
        $monthStart = now()->startOfMonth();

        $people = fn(string $role) => [
            'total' => User::where('role', $role)->where('status', 'active')->count(),
            'new_this_month' => User::where('role', $role)->where('created_at', '>=', $monthStart)->count(),
        ];

        $byProject = Task::query()
            ->selectRaw('project_id, count(*) as total')
            ->groupBy('project_id')
            ->with('project')
            ->get()
            ->map(fn($row) => [
                'project' => $row->project?->name ?? 'Unknown',
                'total' => (int) $row->total,
            ])
            ->values();

        return [
            'staff' => $people('staff'),
            'lecturers' => $people('lecturer'),
            'interns' => $people('intern'),
            'pending_leaves' => [
                'total' => LeaveRequest::where('status', 'pending')->count(),
                'new_this_week' => LeaveRequest::where('status', 'pending')
                    ->where('created_at', '>=', now()->startOfWeek())->count(),
            ],
            'upcoming_leave_requests' => LeaveRequest::with('user')
                ->where('status', 'pending')
                ->orderBy('start_date')
                ->limit(5)
                ->get(),
            'work_allocation' => [
                'total_tasks' => $byProject->sum('total'),
                'by_project' => $byProject,
            ],
        ];
    }

    private function personal(User $user): array
    {
        $allowed = (int) Setting::get('default_leave_days', 14);

        $used = LeaveRequest::where('user_id', $user->id)
            ->where('status', 'approved')
            ->whereYear('start_date', now()->year)
            ->get()
            ->sum('total_days');

        $todayLogs = GateLog::where('user_id', $user->id)
            ->whereDate('scanned_at', now()->toDateString())
            ->orderBy('scanned_at')
            ->get();

        return [
            'tasks' => [
                'pending' => Task::where('assigned_to', $user->id)->where('status', 'pending')->count(),
                'completed' => Task::where('assigned_to', $user->id)->where('status', 'completed')->count(),
                'recent_pending' => Task::with('project')
                    ->where('assigned_to', $user->id)
                    ->where('status', 'pending')
                    ->orderBy('start_date')
                    ->limit(5)
                    ->get(),
            ],
            'leave' => [
                'allowed' => $allowed,
                'used' => $used,
                'remaining' => max(0, $allowed - $used),
                'pending_requests' => LeaveRequest::where('user_id', $user->id)->where('status', 'pending')->count(),
            ],
            'attendance_today' => [
                'check_in' => $todayLogs->firstWhere('scan_type', 'in')?->scanned_at,
                'check_out' => $todayLogs->where('scan_type', 'out')->last()?->scanned_at,
            ],
        ];
    }
}

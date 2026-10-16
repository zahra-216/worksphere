<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GateLog;
use App\Models\LeaveRequest;
use App\Models\Setting;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

// All reports take ?month=2026-10 (default: this month). Admin only.
class ReportController extends Controller
{
    // Cards + attendance trend (the top of the Reports screen)
    public function summary(Request $request)
    {
        [$start, $end] = $this->month($request);

        $today = now()->toDateString();
        $total = $this->people()->count();
        $present = GateLog::whereDate('scanned_at', $today)->distinct()->count('user_id');
        $onLeave = LeaveRequest::where('status', 'approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->count();

        return response()->json([
            'month' => $start->format('Y-m'),
            'total_staff' => $total,
            'present_today' => $present,
            'on_leave_today' => $onLeave,
            'absent_today' => max(0, $total - $present - $onLeave),
            'attendance_trend' => $this->trend($start, $end, $total),
        ]);
    }

    // Per person: days present, days late, days on leave
    public function attendance(Request $request)
    {
        [$start, $end] = $this->month($request);
        $lateAfter = Setting::get('late_after', '08:30');

        $people = $this->people($request->query('role'))->orderBy('name')->get(['id', 'name', 'staff_code', 'role']);

        $logs = GateLog::whereIn('user_id', $people->pluck('id'))
            ->whereBetween('scanned_at', [$start, $end->copy()->endOfDay()])
            ->orderBy('scanned_at')
            ->get()
            ->groupBy('user_id');

        $leaves = $this->approvedLeaves($start, $end)->groupBy('user_id');

        $rows = $people->map(function ($p) use ($logs, $leaves, $lateAfter, $start, $end) {
            $days = $logs->get($p->id, collect())->groupBy(fn($l) => $l->scanned_at->toDateString());

            $late = $days->filter(function ($dayLogs, $date) use ($lateAfter) {
                $first = $dayLogs->firstWhere('scan_type', 'in');
                return $first && $first->scanned_at->gt(Carbon::parse("$date $lateAfter"));
            })->count();

            return [
                'user_id' => $p->id,
                'name' => $p->name,
                'staff_code' => $p->staff_code,
                'role' => $p->role,
                'days_present' => $days->count(),
                'days_late' => $late,
                'days_on_leave' => $this->leaveDaysInMonth($leaves->get($p->id, collect()), $start, $end),
            ];
        });

        return response()->json(['month' => $start->format('Y-m'), 'rows' => $rows->values()]);
    }

    // Per person: requests by status + approved leave days in the month
    public function leaves(Request $request)
    {
        [$start, $end] = $this->month($request);

        $leaves = LeaveRequest::with('user:id,name,staff_code,role')
            ->whereDate('start_date', '<=', $end)
            ->whereDate('end_date', '>=', $start)
            ->get()
            ->groupBy('user_id');

        $rows = $leaves->map(function ($userLeaves) use ($start, $end) {
            $u = $userLeaves->first()->user;

            return [
                'user_id' => $u?->id,
                'name' => $u?->name,
                'staff_code' => $u?->staff_code,
                'role' => $u?->role,
                'pending' => $userLeaves->where('status', 'pending')->count(),
                'approved' => $userLeaves->where('status', 'approved')->count(),
                'rejected' => $userLeaves->where('status', 'rejected')->count(),
                'approved_days' => $this->leaveDaysInMonth($userLeaves->where('status', 'approved'), $start, $end),
            ];
        })->values();

        return response()->json(['month' => $start->format('Y-m'), 'rows' => $rows]);
    }

    // Tasks that started in the month: per person and per project, with days taken
    public function work(Request $request)
    {
        [$start, $end] = $this->month($request);

        $tasks = Task::with(['project', 'assignee:id,name,staff_code,role'])
            ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
            ->when($request->query('project_id'), fn($q, $id) => $q->where('project_id', $id))
            ->get();

        $summarize = fn($group) => [
            'total' => $group->count(),
            'completed' => $group->where('status', 'completed')->count(),
            'pending' => $group->where('status', 'pending')->count(),
            'days_taken' => $group->sum('days_taken'),
        ];

        return response()->json([
            'month' => $start->format('Y-m'),
            'by_person' => $tasks->groupBy('assigned_to')->map(fn($g) => [
                'user_id' => $g->first()->assignee?->id,
                'name' => $g->first()->assignee?->name,
                'staff_code' => $g->first()->assignee?->staff_code,
            ] + $summarize($g))->values(),
            'by_project' => $tasks->groupBy('project_id')->map(fn($g) => [
                'project' => $g->first()->project?->name,
            ] + $summarize($g))->values(),
        ]);
    }

    // Headcount by role and who joined in the month
    public function staff(Request $request)
    {
        [$start, $end] = $this->month($request);

        $counts = User::where('role', '!=', 'admin')
            ->selectRaw('role, status, count(*) as total')
            ->groupBy('role', 'status')
            ->get();

        return response()->json([
            'month' => $start->format('Y-m'),
            'headcount' => $counts,
            'joined_this_month' => User::where('role', '!=', 'admin')
                ->whereBetween('joined_date', [$start->toDateString(), $end->toDateString()])
                ->orderBy('joined_date')
                ->get(['id', 'name', 'staff_code', 'role', 'joined_date']),
        ]);
    }

    // ---------- helpers ----------

    private function month(Request $request): array
    {
        try {
            $start = Carbon::createFromFormat('!Y-m', $request->query('month', now()->format('Y-m')));
        } catch (\Throwable $e) {
            $start = now()->startOfMonth();
        }

        return [$start->startOfMonth(), $start->copy()->endOfMonth()];
    }

    private function people(?string $role = null)
    {
        return User::where('role', '!=', 'admin')
            ->where('status', 'active')
            ->when($role, fn($q, $r) => $q->where('role', $r));
    }

    private function approvedLeaves(Carbon $start, Carbon $end)
    {
        return LeaveRequest::where('status', 'approved')
            ->whereDate('start_date', '<=', $end)
            ->whereDate('end_date', '>=', $start)
            ->get();
    }

    // Counts only the leave days that fall inside the month
    private function leaveDaysInMonth($leaves, Carbon $start, Carbon $end): int
    {
        return $leaves->sum(function ($l) use ($start, $end) {
            $from = $l->start_date->copy()->max($start->copy()->startOfDay());
            $to = $l->end_date->copy()->min($end->copy()->startOfDay());

            return $to->gte($from) ? $from->diffInDays($to) + 1 : 0;
        });
    }

    // One point per day: present vs absent. Weekends are skipped unless someone scanned in.
    private function trend(Carbon $start, Carbon $end, int $total): array
    {
        $last = $end->gt(now()) ? now()->startOfDay() : $end->copy()->startOfDay();

        $logs = GateLog::whereBetween('scanned_at', [$start, $end->copy()->endOfDay()])
            ->get(['user_id', 'scanned_at'])
            ->groupBy(fn($l) => $l->scanned_at->toDateString());

        $leaves = $this->approvedLeaves($start, $end);

        $trend = [];
        for ($d = $start->copy(); $d->lte($last); $d->addDay()) {
            $key = $d->toDateString();
            $present = $logs->has($key) ? $logs[$key]->pluck('user_id')->unique()->count() : 0;

            if ($d->isWeekend() && $present === 0) {
                continue;
            }

            $day = $d->copy();
            $onLeave = $leaves->filter(fn($l) => $l->start_date->lte($day) && $l->end_date->gte($day))->count();

            $trend[] = [
                'date' => $key,
                'present' => $present,
                'absent' => max(0, $total - $present - $onLeave),
            ];
        }

        return $trend;
    }
}

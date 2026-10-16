<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    // Admin sees all tasks. Staff / interns / lecturers see only their own.
    // Filters: project_id, status, assigned_to (admin only), search
    public function index(Request $request)
    {
        $user = $request->user();

        $tasks = Task::with(['project', 'assignee:id,name,staff_code,role'])
            ->when(!$user->isAdmin(), fn($q) => $q->where('assigned_to', $user->id))
            ->when($user->isAdmin() && $request->query('assigned_to'), fn($q, $id) => $q->where('assigned_to', $id))
            ->when($request->query('project_id'), fn($q, $id) => $q->where('project_id', $id))
            ->when($request->query('status'), fn($q, $s) => $q->where('status', $s))
            ->when($request->query('search'), fn($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->orderByDesc('created_at')
            ->paginate((int) $request->query('per_page', 10));

        return response()->json($tasks);
    }

    // Admin can assign to anyone. Others can only add tasks for themselves.
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'project_id' => ['required', Rule::exists('projects', 'id')->whereNull('deleted_at')],
            'assigned_to' => [$user->isAdmin() ? 'required' : 'nullable',
                Rule::exists('users', 'id')->where(fn($q) => $q->where('role', '!=', 'admin'))],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'start_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['nullable', Rule::in(['pending', 'completed'])],
            'completed_date' => 'nullable|date',
        ]);

        if (!$user->isAdmin()) {
            $data['assigned_to'] = $user->id;
        }

        $data['created_by'] = $user->id;
        $data = $this->resolveCompletion($data, null);

        $task = Task::create($data);

        return response()->json($task->load(['project', 'assignee:id,name,staff_code,role']), 201);
    }

    public function show(Request $request, $id)
    {
        $task = Task::with(['project', 'assignee:id,name,staff_code,role'])->findOrFail($id);
        $this->authorizeTask($request, $task);

        return response()->json($task);
    }

    // Also used to mark a task pending / completed
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $task = Task::findOrFail($id);
        $this->authorizeTask($request, $task);

        $data = $request->validate([
            'project_id' => ['sometimes', Rule::exists('projects', 'id')->whereNull('deleted_at')],
            'assigned_to' => ['sometimes',
                Rule::exists('users', 'id')->where(fn($q) => $q->where('role', '!=', 'admin'))],
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'start_date' => 'sometimes|required|date',
            'due_date' => 'nullable|date',
            'status' => ['sometimes', Rule::in(['pending', 'completed'])],
            'completed_date' => 'nullable|date',
        ]);

        if (!$user->isAdmin()) {
            unset($data['assigned_to']);   // only admin can reassign
        }

        $data = $this->resolveCompletion($data, $task);
        $task->update($data);

        return response()->json($task->fresh(['project', 'assignee:id,name,staff_code,role']));
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $task = Task::findOrFail($id);

        // Admin can delete any task. Others can delete any task assigned to them.
        abort_unless($user->isAdmin() || $task->assigned_to === $user->id, 403);

        $task->delete();

        return response()->json(['message' => 'Task deleted.']);
    }

    private function authorizeTask(Request $request, Task $task): void
    {
        $user = $request->user();
        abort_unless($user->isAdmin() || $task->assigned_to === $user->id, 403);
    }

    // Keeps status and completed_date matching each other
    private function resolveCompletion(array $data, ?Task $task): array
    {
        $status = $data['status'] ?? $task?->status ?? 'pending';

        if ($status === 'completed') {
            $completed = $data['completed_date']
                ?? $task?->completed_date?->toDateString()
                ?? now()->toDateString();
            $start = $data['start_date'] ?? $task?->start_date->toDateString();

            if (Carbon::parse($completed)->lt(Carbon::parse($start))) {
                throw ValidationException::withMessages([
                    'completed_date' => 'Completed date cannot be before the start date.',
                ]);
            }

            $data['status'] = 'completed';
            $data['completed_date'] = $completed;
        } else {
            $data['status'] = 'pending';
            $data['completed_date'] = null;
        }

        return $data;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    // Everyone logged in can list (for dropdowns)
    public function index()
    {
        return response()->json(
            Project::withCount('tasks')->orderBy('name')->get()
        );
    }

    // Admin only below
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:projects,name,NULL,id,deleted_at,NULL',
            'description' => 'nullable|string|max:1000',
        ]);

        return response()->json(Project::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:255|unique:projects,name,' . $project->id . ',id,deleted_at,NULL',
            'description' => 'nullable|string|max:1000',
        ]);

        $project->update($data);

        return response()->json($project);
    }

    // Soft delete: old tasks keep their project name
    public function destroy($id)
    {
        Project::findOrFail($id)->delete();

        return response()->json(['message' => 'Project deleted.']);
    }
}

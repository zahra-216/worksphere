<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private function defaults(): array
    {
        return [
            'institution_name' => 'TT Metro Campus',
            'academic_year' => (string) now()->year,
            'late_after' => '08:30',        // check-ins after this time count as late
            'default_leave_days' => '14',   // yearly leave days for each person
        ];
    }

    // Any logged-in user can read (the leave form needs default_leave_days)
    public function index()
    {
        $out = [];
        foreach ($this->defaults() as $key => $default) {
            $out[$key] = Setting::get($key, $default);
        }
        $out['default_leave_days'] = (int) $out['default_leave_days'];

        return response()->json($out);
    }

    // Admin only
    public function update(Request $request)
    {
        $data = $request->validate([
            'institution_name' => 'sometimes|required|string|max:255',
            'academic_year' => 'sometimes|required|string|max:20',
            'late_after' => 'sometimes|required|date_format:H:i',
            'default_leave_days' => 'sometimes|required|integer|min:0|max:365',
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        return $this->index();
    }
}

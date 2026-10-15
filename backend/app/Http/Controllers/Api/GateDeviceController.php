<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GateDevice;
use Illuminate\Http\Request;

class GateDeviceController extends Controller
{
    public function index()
    {
        return response()->json(GateDevice::orderByDesc('created_at')->get());
    }

    // The key is only returned here, once. Open the scanner at /gate-scanner/{device_key}
    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:255']);

        $device = GateDevice::create([
            'name' => $data['name'],
            'device_key' => GateDevice::generateKey(),
            'is_active' => true,
        ]);

        return response()->json([
            'device' => $device,
            'scanner_url' => url('/gate-scanner/' . $device->device_key),
            'message' => 'Device created. Copy the link now.',
        ], 201);
    }

    public function toggle($id)
    {
        $device = GateDevice::findOrFail($id);
        $device->update(['is_active' => !$device->is_active]);

        return response()->json($device);
    }

    public function destroy($id)
    {
        GateDevice::findOrFail($id)->delete();

        return response()->json(['message' => 'Device removed.']);
    }
}

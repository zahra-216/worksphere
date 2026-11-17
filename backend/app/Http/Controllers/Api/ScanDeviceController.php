<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScanDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ScanDeviceController extends Controller
{
    // Active (not revoked) devices
    public function index()
    {
        return response()->json(
            ScanDevice::with('registrar:id,name')->whereNull('revoked_at')->orderByDesc('created_at')->get()
        );
    }

    // Is the device that is asking registered? (the scan page asks this on load)
    public function status(Request $request)
    {
        $device = ScanDevice::fromKey($request->header('X-Scan-Device'));

        return response()->json(['registered' => (bool) $device, 'name' => $device?->name]);
    }

    // Register the device that is asking. The key is shown once and kept in that browser.
    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:60']);

        $key = Str::random(48);

        $device = ScanDevice::create([
            'name' => $data['name'],
            'token_hash' => ScanDevice::hash($key),
            'registered_by' => $request->user()->id,
        ]);

        return response()->json(['device' => $device, 'key' => $key], 201);
    }

    // Revoke: the device stops working immediately
    public function destroy($id)
    {
        ScanDevice::whereNull('revoked_at')->findOrFail($id)->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Device removed.']);
    }
}

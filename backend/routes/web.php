<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Http\Controllers\GateScanController;

Route::get('/gate-scanner/{deviceKey}', [GateScanController::class, 'scanner'])
    ->name('gate-scanner.show');
Route::post('/gate-scanner/{deviceKey}/scan', [GateScanController::class, 'scan'])
    ->name('gate-scanner.scan');


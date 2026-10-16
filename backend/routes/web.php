<?php

use App\Http\Controllers\GateScanController;
use Illuminate\Support\Facades\Route;

Route::get('/gate-scanner/{deviceKey}', [GateScanController::class, 'scanner'])
    ->name('gate-scanner.show');
Route::post('/gate-scanner/{deviceKey}/scan', [GateScanController::class, 'scan'])
    ->name('gate-scanner.scan');

Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '^(?!api).*$');
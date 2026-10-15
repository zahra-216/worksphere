<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GateDeviceController;
use App\Http\Controllers\Api\GateLogController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use App\Http\Middleware\AdminOnly;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Any logged-in user
    Route::get('/projects', [ProjectController::class, 'index']);

    Route::apiResource('tasks', TaskController::class);   // admin: all tasks, others: own tasks only

    Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
    Route::get('/leave-requests/{id}', [LeaveRequestController::class, 'show']);
    Route::delete('/leave-requests/{id}', [LeaveRequestController::class, 'destroy']);

    // Admin only
    Route::middleware(AdminOnly::class)->group(function () {

        Route::get('/users/{user}/qr', [UserController::class, 'qr']);
        Route::apiResource('users', UserController::class);

        Route::post('/projects', [ProjectController::class, 'store']);
        Route::put('/projects/{id}', [ProjectController::class, 'update']);
        Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);

        Route::patch('/leave-requests/{id}/decision', [LeaveRequestController::class, 'decide']);

        Route::get('/gate-log', [GateLogController::class, 'index']);

        Route::get('/gate-devices', [GateDeviceController::class, 'index']);
        Route::post('/gate-devices', [GateDeviceController::class, 'store']);
        Route::post('/gate-devices/{id}/toggle', [GateDeviceController::class, 'toggle']);
        Route::delete('/gate-devices/{id}', [GateDeviceController::class, 'destroy']);
    });
});

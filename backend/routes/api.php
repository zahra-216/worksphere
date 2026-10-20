<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GateLogController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use App\Http\Middleware\AdminOnly;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SelfScanController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/forgot-password', [PasswordController::class, 'forgot'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [PasswordController::class, 'change']);

    // Any logged-in user
    Route::get('/dashboard', [DashboardController::class, 'index']);   // admin: totals, others: own numbers
    Route::get('/settings', [SettingController::class, 'index']);
    Route::get('/projects', [ProjectController::class, 'index']);

    Route::apiResource('tasks', TaskController::class);   // admin: all tasks, others: own tasks only

    Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
    Route::get('/leave-requests/{id}', [LeaveRequestController::class, 'show']);
    Route::delete('/leave-requests/{id}', [LeaveRequestController::class, 'destroy']);

    // Admin only
    Route::middleware(AdminOnly::class)->group(function () {

        Route::put('/settings', [SettingController::class, 'update']);

        Route::get('/users/{user}/qr', [UserController::class, 'qr']);
        Route::apiResource('users', UserController::class);

        Route::post('/projects', [ProjectController::class, 'store']);
        Route::put('/projects/{id}', [ProjectController::class, 'update']);
        Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);

        Route::patch('/leave-requests/{id}/decision', [LeaveRequestController::class, 'decide']);

        Route::post('/attendance/verify', [SelfScanController::class, 'verify'])->middleware('throttle:30,1');
        Route::post('/attendance/mark', [SelfScanController::class, 'mark'])->middleware('throttle:30,1');

        Route::get('/gate-log', [GateLogController::class, 'index']);
        Route::get('/gate-log/history', [GateLogController::class, 'history']);

        Route::prefix('reports')->group(function () {
            Route::get('/summary', [ReportController::class, 'summary']);
            Route::get('/attendance', [ReportController::class, 'attendance']);
            Route::get('/leaves', [ReportController::class, 'leaves']);
            Route::get('/work', [ReportController::class, 'work']);
            Route::get('/staff', [ReportController::class, 'staff']);
        });
    });
});

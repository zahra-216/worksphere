<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */


    public function boot(): void
    {
        // The reset email button opens the React site, not a Laravel page
        ResetPassword::createUrlUsing(function ($user, string $token) {
            return rtrim(config('worksphere.frontend_url'), '/')
                . '/reset-password?token=' . $token
                . '&email=' . urlencode($user->email);
        });
    }

}

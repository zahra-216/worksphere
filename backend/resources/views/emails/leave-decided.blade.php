<x-mail::message>
# Leave request {{ $leave->status }}

Hi {{ $leave->user->name }}, your {{ $leave->leave_type }} leave request
({{ $leave->start_date->format('d M Y') }} to {{ $leave->end_date->format('d M Y') }})
has been **{{ $leave->status }}**.

WorkSphere
</x-mail::message>

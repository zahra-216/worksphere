<x-mail::message>
# Leave request {{ $leave->status }}

@if ($leave->duration_type === 'full')
Hi {{ $leave->user->name }}, your {{ $leave->leave_type }} leave request
({{ $leave->start_date->format('d M Y') }} to {{ $leave->end_date->format('d M Y') }})
has been **{{ $leave->status }}**.
@else
Hi {{ $leave->user->name }}, your {{ $leave->leave_type }} {{ strtolower($leave->duration_label) }} request
({{ $leave->start_date->format('d M Y') }}, {{ substr($leave->start_time, 0, 5) }} - {{ substr($leave->end_time, 0, 5) }})
has been **{{ $leave->status }}**.
@endif

WorkSphere
</x-mail::message>

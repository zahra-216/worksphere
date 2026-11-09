<x-mail::message>
# New leave request

**{{ $leave->user->name }}** has requested leave.

- **Type:** {{ ucfirst($leave->leave_type) }}
- **Duration:** {{ $leave->duration_label }}
@if ($leave->duration_type === 'full')
- **From:** {{ $leave->start_date->format('d M Y') }}
- **To:** {{ $leave->end_date->format('d M Y') }}
- **Days:** {{ $leave->total_days }}
@else
- **Date:** {{ $leave->start_date->format('d M Y') }}
- **Time:** {{ substr($leave->start_time, 0, 5) }} - {{ substr($leave->end_time, 0, 5) }}
@endif
- **Reason:** {{ $leave->reason ?: '-' }}

<x-mail::button :url="$url">
Review request
</x-mail::button>

WorkSphere
</x-mail::message>

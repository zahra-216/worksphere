<x-mail::message>
# New leave request

**{{ $leave->user->name }}** has requested leave.

- **Type:** {{ ucfirst($leave->leave_type) }}
- **From:** {{ $leave->start_date->format('d M Y') }}
- **To:** {{ $leave->end_date->format('d M Y') }}
- **Days:** {{ $leave->total_days }}
- **Reason:** {{ $leave->reason ?: '-' }}

<x-mail::button :url="$url">
Review request
</x-mail::button>

WorkSphere
</x-mail::message>

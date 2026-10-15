<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gate Scanner — {{ $device->name }}</title>
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
<style>
    * { box-sizing:border-box; }
    body {
        background:#eef2f9; font-family:'Segoe UI', sans-serif; color:#012147;
        margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;
    }
    .phone-card {
        background:#fff; max-width:400px; width:100%; border-radius:22px; overflow:hidden;
        box-shadow:0 20px 50px rgba(1,33,71,0.15);
    }
    .brand-header {
        background:linear-gradient(120deg,#012147,#1e3a6e); color:#fff; text-align:center; padding:22px 20px;
    }
    .brand-logo {
        width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,0.15);
        display:flex; align-items:center; justify-content:center; margin:0 auto 10px; font-weight:800; font-size:18px;
    }
    .brand-header h5 { margin:0; font-weight:700; font-size:17px; }
    .brand-header small { opacity:0.75; font-size:12px; }

    .scan-area { padding:24px 22px; text-align:center; }
    .scan-area h6 { font-weight:700; margin-bottom:4px; }
    .scan-area p { color:#64748b; font-size:13px; margin-bottom:16px; }
    #reader { border-radius:16px; overflow:hidden; border:2px solid #e2e8f0; }

    /* Confirmation state */
    #confirmState { display:none; padding:30px 26px 32px; text-align:center; }
    #confirmState.show { display:block; }
    .confirm-icon {
        width:74px; height:74px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        font-size:36px; margin:0 auto 16px; color:#fff; animation:pop .3s ease;
    }
    .confirm-icon.success { background:#16a34a; }
    .confirm-icon.error { background:#dc2626; }
    @keyframes pop { from{ transform:scale(0.5); opacity:0; } to{ transform:scale(1); opacity:1; } }
    #confirmTitle { font-weight:700; font-size:18px; margin-bottom:20px; }
    #confirmTitle.success { color:#16a34a; }
    #confirmTitle.error { color:#dc2626; }

    .detail-table { text-align:left; border-top:1px solid #f1f5f9; padding-top:16px; margin-bottom:6px; }
    .detail-row { display:flex; justify-content:space-between; padding:7px 0; font-size:13.5px; }
    .detail-row .label { color:#64748b; }
    .detail-row .value { font-weight:600; color:#012147; text-align:right; }

    .status-pill {
        display:inline-block; padding:5px 14px; border-radius:20px; font-size:12px; font-weight:700; margin-top:6px;
    }
    .status-pill.in { background:#d1fae5; color:#065f46; }
    .status-pill.out { background:#fef3c7; color:#92400e; }
</style>
</head>
<body>

<div class="phone-card">
    <div class="brand-header">
        <div class="brand-logo">TT</div>
        <h5>TT Metro Campus</h5>
        <small>Gate Scanner — {{ $device->name }}</small>
    </div>

    <div class="scan-area" id="scanState">
        <h6>Scan QR Code</h6>
        <p>Point the camera at the ID card</p>
        <div id="reader"></div>
    </div>

    <div id="confirmState">
        <div class="confirm-icon" id="confirmIcon"></div>
        <div id="confirmTitle"></div>

        <div class="detail-table" id="detailTable">
            <div class="detail-row"><span class="label">Name</span><span class="value" id="dName"></span></div>
            <div class="detail-row"><span class="label">Reg No / Username</span><span class="value" id="dRef"></span></div>
            <div class="detail-row"><span class="label">Type</span><span class="value" id="dType"></span></div>
            <div class="detail-row"><span class="label">Date</span><span class="value" id="dDate"></span></div>
            <div class="detail-row"><span class="label">Time</span><span class="value" id="dTime"></span></div>
        </div>
        <div style="text-align:center;">
            <span class="status-pill" id="dStatusPill"></span>
        </div>
    </div>
</div>

<script>
const deviceKey = "{{ $deviceKey }}";
const scanUrl = "{{ route('gate-scanner.scan', $deviceKey) }}";
let busy = false;

const scanState = document.getElementById('scanState');
const confirmState = document.getElementById('confirmState');
const confirmIcon = document.getElementById('confirmIcon');
const confirmTitle = document.getElementById('confirmTitle');
const detailTable = document.getElementById('detailTable');
const statusPill = document.getElementById('dStatusPill');

function showConfirmation(success, data) {
    scanState.style.display = 'none';
    confirmState.classList.add('show');

    confirmIcon.className = 'confirm-icon ' + (success ? 'success' : 'error');
    confirmIcon.innerHTML = success ? '✓' : '✕';

    confirmTitle.className = success ? 'success' : 'error';

    if (success) {
        const isIn = data.scan_type === 'in';
        confirmTitle.textContent = isIn ? 'Check In Successful!' : 'Check Out Successful!';

        document.getElementById('dName').textContent = data.name;
        document.getElementById('dRef').textContent = data.ref || '—';
        document.getElementById('dType').textContent = data.type.charAt(0).toUpperCase() + data.type.slice(1);
        document.getElementById('dDate').textContent = data.date;
        document.getElementById('dTime').textContent = data.time;

        statusPill.className = 'status-pill ' + (isIn ? 'in' : 'out');
        statusPill.textContent = isIn ? 'CHECKED IN' : 'CHECKED OUT';
        detailTable.style.display = 'block';
        statusPill.style.display = 'inline-block';
    } else {
        confirmTitle.textContent = data.message || 'Not Verified';
        detailTable.style.display = 'none';
        statusPill.style.display = 'none';
    }

    setTimeout(() => {
        confirmState.classList.remove('show');
        scanState.style.display = 'block';
    }, 2500);
}

async function onScanSuccess(decodedText) {
    if (busy) return;
    busy = true;

    try {
        const res = await fetch(scanUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': '{{ csrf_token() }}'
            },
            body: JSON.stringify({ token: decodedText })
        });
        const data = await res.json();
        showConfirmation(data.success, data);
    } catch (e) {
        showConfirmation(false, { message: 'Connection error, try again' });
    }

    setTimeout(() => { busy = false; }, 3000);
}

const html5QrCode = new Html5Qrcode("reader");
html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onScanSuccess
);
</script>
</body>
</html>
let currentAction = null;
let autoRefreshInterval = null;

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        showSection(section);
    });
});

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Load data if needed
    if (sectionId === 'payments') {
        loadPayments();
    } else if (sectionId === 'dashboard') {
        loadDashboard();
    } else if (sectionId === 'reports') {
        loadReports();
    }
}

// Load Dashboard Data
async function loadDashboard() {
    try {
        const response = await fetch('/api/payments');
        const payments = await response.json();
        
        const total = payments.length;
        const pending = payments.filter(p => p.status === 'pending').length;
        const approved = payments.filter(p => p.status === 'approved').length;
        const rejected = payments.filter(p => p.status === 'rejected').length;
        
        document.getElementById('totalPayments').textContent = total;
        document.getElementById('pendingPayments').textContent = pending;
        document.getElementById('approvedPayments').textContent = approved;
        document.getElementById('rejectedPayments').textContent = rejected;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load Payments
async function loadPayments() {
    try {
        const response = await fetch('/api/payments');
        const payments = await response.json();
        
        const tbody = document.getElementById('paymentsTableBody');
        
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">لا توجد طلبات</td></tr>';
            return;
        }
        
        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${payment.id.substring(0, 8)}...</td>
                <td>${payment.phone}</td>
                <td>${payment.amount} د.ك</td>
                <td>${payment.paymentMethod.toUpperCase()}</td>
                <td>${payment.description}</td>
                <td>
                    <span class="status-badge ${payment.status}">
                        ${getStatusText(payment.status)}
                    </span>
                </td>
                <td>${new Date(payment.createdAt).toLocaleDateString('ar-KW')}</td>
                <td>
                    <div class="action-buttons">
                        ${payment.status === 'pending' ? `
                            <button class="btn btn-primary" onclick="approvePayment('${payment.id}')">قبول</button>
                            <button class="btn btn-danger" onclick="rejectPayment('${payment.id}')">رفض</button>
                        ` : `
                            <button class="btn btn-secondary" disabled>تم</button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Load Reports
async function loadReports() {
    try {
        const response = await fetch('/api/payments');
        const payments = await response.json();
        
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const averageAmount = payments.length > 0 ? (totalAmount / payments.length).toFixed(2) : 0;
        const successRate = payments.length > 0 
            ? ((payments.filter(p => p.status === 'approved').length / payments.length) * 100).toFixed(1)
            : 0;
        
        document.getElementById('totalAmount').textContent = totalAmount.toFixed(2) + ' د.ك';
        document.getElementById('averageAmount').textContent = averageAmount + ' د.ك';
        document.getElementById('successRate').textContent = successRate + '%';
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'otp_verified': 'تم التحقق من OTP',
        'approved': 'موافق عليه',
        'rejected': 'مرفوض'
    };
    return statusMap[status] || status;
}

async function approvePayment(paymentId) {
    currentAction = {
        type: 'approve',
        paymentId: paymentId
    };
    
    showActionModal(
        'تأكيد الموافقة',
        'هل تريد الموافقة على هذا الطلب؟'
    );
}

async function rejectPayment(paymentId) {
    currentAction = {
        type: 'reject',
        paymentId: paymentId
    };
    
    showActionModal(
        'تأكيد الرفض',
        'هل تريد رفض هذا الطلب؟'
    );
}

function showActionModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('actionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('actionModal').classList.remove('active');
    currentAction = null;
}

async function confirmAction() {
    if (!currentAction) return;
    
    try {
        const endpoint = currentAction.type === 'approve' 
            ? `/api/payments/${currentAction.paymentId}/approve`
            : `/api/payments/${currentAction.paymentId}/reject`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal();
            loadPayments();
            loadDashboard();
            alert('تم ' + (currentAction.type === 'approve' ? 'الموافقة' : 'الرفض') + ' بنجاح');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ في معالجة الطلب');
    }
}

function refreshData() {
    loadDashboard();
    loadPayments();
    loadReports();
    alert('تم تحديث البيانات بنجاح');
}

function exportData() {
    fetch('/api/payments')
        .then(res => res.json())
        .then(payments => {
            const csv = convertToCSV(payments);
            downloadCSV(csv, 'payments.csv');
        })
        .catch(error => console.error('Error:', error));
}

function convertToCSV(data) {
    const headers = ['ID', 'Phone', 'Amount', 'Method', 'Description', 'Status', 'Date'];
    const rows = data.map(p => [
        p.id,
        p.phone,
        p.amount,
        p.paymentMethod,
        p.description,
        p.status,
        new Date(p.createdAt).toLocaleDateString('ar-KW')
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
}

function downloadCSV(csv, filename) {
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = filename;
    link.click();
}

// Update current time
function updateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString('ar-KW');
}

// Auto-refresh
document.getElementById('autoRefresh').addEventListener('change', (e) => {
    if (e.target.checked) {
        autoRefreshInterval = setInterval(() => {
            if (document.getElementById('payments').classList.contains('active')) {
                loadPayments();
            }
        }, 5000);
    } else {
        clearInterval(autoRefreshInterval);
    }
});

// Initialize
updateTime();
setInterval(updateTime, 1000);
loadDashboard();

// Close modal when clicking outside
document.getElementById('actionModal').addEventListener('click', (e) => {
    if (e.target.id === 'actionModal') {
        closeModal();
    }
});

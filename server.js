const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory database (يمكن استبداله بـ SQLite أو أي قاعدة بيانات أخرى)
let payments = [];
let otpCodes = {};
let users = [];

// API Routes

// 1. إنشاء طلب دفع جديد
app.post('/api/payments/create', (req, res) => {
  const { phone, amount, paymentMethod, description } = req.body;
  
  if (!phone || !amount || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const payment = {
    id: uuidv4(),
    phone,
    amount,
    paymentMethod,
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
    otp: null,
    otpVerified: false
  };
  
  payments.push(payment);
  
  // توليد OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpCodes[payment.id] = otp;
  
  res.json({
    success: true,
    paymentId: payment.id,
    message: 'Payment request created successfully'
  });
});

// 2. الحصول على جميع طلبات الدفع
app.get('/api/payments', (req, res) => {
  res.json(payments);
});

// 3. الحصول على طلب دفع محدد
app.get('/api/payments/:id', (req, res) => {
  const payment = payments.find(p => p.id === req.params.id);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json(payment);
});

// 4. التحقق من OTP
app.post('/api/payments/:id/verify-otp', (req, res) => {
  const { otp } = req.body;
  const payment = payments.find(p => p.id === req.params.id);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  if (otpCodes[payment.id] === otp) {
    payment.otpVerified = true;
    payment.status = 'otp_verified';
    res.json({ success: true, message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
});

// 5. موافقة Admin على الدفع
app.post('/api/payments/:id/approve', (req, res) => {
  const payment = payments.find(p => p.id === req.params.id);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  payment.status = 'approved';
  res.json({ success: true, message: 'Payment approved' });
});

// 6. رفض Admin للدفع
app.post('/api/payments/:id/reject', (req, res) => {
  const payment = payments.find(p => p.id === req.params.id);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  payment.status = 'rejected';
  res.json({ success: true, message: 'Payment rejected' });
});

// 7. الحصول على OTP (للاختبار فقط)
app.get('/api/payments/:id/otp', (req, res) => {
  const otp = otpCodes[req.params.id];
  if (!otp) {
    return res.status(404).json({ error: 'OTP not found' });
  }
  res.json({ otp });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve any other route as index.html (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());

// In-memory store for users and payment methods
const users = {};
const paymentMethods = {};
const payments = {};

// Middleware to verify session token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!users[token]) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = users[token].userId;
    next();
};

// Mock login endpoint
app.post('/login', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }
    const token = uuidv4();
    const userId = uuidv4();
    users[token] = { userId, username };
    console.log(`Generated token for ${username}: ${token}`); // Debug
    res.json({ token, username });
});

// Token verification endpoint
app.post('/verify-token', verifyToken, (req, res) => {
    console.log(`Verified token for userId: ${req.userId}`); // Debug
    res.json({ success: true, userId: req.userId });
});

// Logout endpoint
app.post('/logout', verifyToken, (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    delete users[token];
    console.log(`Logged out userId: ${req.userId}`); // Debug
    res.json({ success: true });
});

// Mock payment processing endpoint
app.post('/process-payment', verifyToken, async (req, res) => {
    const { cardNumber, cardName, expiry, cvv, amount, currency, rideId } = req.body;
    try {
        // Simulate card validation
        if (!cardNumber.startsWith('4') || cardNumber.length !== 16) {
            return res.status(400).json({ error: 'Invalid card number' });
        }
        const [month, year] = expiry.split('/');
        const expiryDate = new Date(parseInt(year) + 2000, parseInt(month) - 1);
        if (month < 1 || month > 12 || expiryDate < new Date()) {
            return res.status(400).json({ error: 'Invalid expiry date' });
        }
        if (cvv.length !== 3) {
            return res.status(400).json({ error: 'Invalid CVV' });
        }
        if (!cardName || cardName.trim().length < 2) {
            return res.status(400).json({ error: 'Invalid cardholder name' });
        }
        if (amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Simulate payment processing
        const paymentId = uuidv4();
        payments[paymentId] = {
            userId: req.userId,
            rideId,
            amount,
            currency,
            status: 'succeeded',
            created: new Date()
        };

        res.json({ paymentId });
    } catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});

// Save payment method
app.post('/save-payment-method', verifyToken, async (req, res) => {
    const { cardNumber, cardName, expiry, rideId } = req.body;
    try {
        // Mock hashing card number for storage
        const hashedCardNumber = crypto.createHash('sha256').update(cardNumber).digest('hex');
        paymentMethods[req.userId] = paymentMethods[req.userId] || [];
        paymentMethods[req.userId].push({ hashedCardNumber, cardName, expiry, rideId });
        console.log(`Saved payment method for userId: ${req.userId}`); // Debug
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving payment method:', error);
        res.status(500).json({ error: 'Failed to save payment method' });
    }
});

app.listen(3000, () => {
    console.log('Payment server running on port 3000');
});
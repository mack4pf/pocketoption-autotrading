const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No authentication token' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user
        const user = await User.findOne({
            _id: decoded.userId,
            isActive: true
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Add user to request
        req.user = user;
        req.token = token;

        next();

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Please authenticate' });
    }
};
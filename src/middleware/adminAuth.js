const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({
            _id: decoded.userId,
            isActive: true
        });

        if (!user || (!user.isAdmin && user.role !== 'admin')) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        res.status(401).json({ error: 'Please authenticate as admin' });
    }
};
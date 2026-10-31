'use strict';
const express = require('express');
const { authenticate } = require('../middleware/auth');
const notificationCtrl = require('../controllers/notificationController');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationCtrl.getMyNotifications);
router.patch('/:id/read', notificationCtrl.markAsRead);
router.post('/read-all', notificationCtrl.markAllAsRead);

module.exports = router;

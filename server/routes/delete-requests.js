const express = require('express');
const { submissionQueries, deleteRequestQueries } = require('../db/database');

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登入' });
    }
    next();
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登入' });
    }
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: '權限不足' });
    }
    next();
};

// Create a delete request (non-admin users)
router.post('/', requireAuth, (req, res) => {
    try {
        const { submission_id, request_reason } = req.body;

        if (!submission_id) {
            return res.status(400).json({ error: '缺少submission_id' });
        }

        // Check if submission exists and belongs to user
        const submission = submissionQueries.findById.get(submission_id);
        if (!submission) {
            return res.status(404).json({ error: '找不到該筆資料' });
        }

        // Non-admin can only request deletion for their own submissions
        if (req.session.role !== 'admin' && submission.user_id !== req.session.userId) {
            return res.status(403).json({ error: '權限不足' });
        }

        // Check if there's already a pending request for this submission
        const existing = deleteRequestQueries.findPendingBySubmission.get(submission_id, 'pending');
        if (existing) {
            return res.status(409).json({ error: '此筆資料已有待審核的刪除申請' });
        }

        let record_time = null;
        if (submission.form_data) {
            try {
                const formData = JSON.parse(submission.form_data);
                record_time = formData.record_time;
            } catch (e) {
                console.error('Error parsing form_data:', e);
            }
        }

        const result = deleteRequestQueries.create.run(
            submission_id,
            req.session.userId,
            submission.medical_record_number,
            submission.admission_date,
            submission.admission_date,
            record_time,
            request_reason || ''
        );

        res.status(201).json({
            id: result.lastInsertRowid,
            message: '刪除申請已送出，待管理員審核'
        });
    } catch (err) {
        console.error('Error creating delete request:', err);
        res.status(500).json({ error: '申請失敗' });
    }
});

// Get delete requests (user sees own, admin sees all pending)
router.get('/', requireAuth, (req, res) => {
    try {
        let requests;
        if (req.session.role === 'admin') {
            requests = deleteRequestQueries.getAll.all();
        } else {
            requests = deleteRequestQueries.getByRequester.all(req.session.userId);
        }

        res.json(requests);
    } catch (err) {
        console.error('Error fetching delete requests:', err);
        res.status(500).json({ error: '取得資料失敗' });
    }
});

// Approve delete request (admin only)
router.put('/:id/approve', requireAdmin, (req, res) => {
    try {
        const request = deleteRequestQueries.findById.get(req.params.id);
        if (!request) {
            return res.status(404).json({ error: '找不到該刪除申請' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: '此申請已處理' });
        }

        // Delete the submission
        const deleteResult = submissionQueries.deleteAdmin.run(request.submission_id);
        if (deleteResult.changes === 0) {
            return res.status(404).json({ error: '找不到要刪除的資料' });
        }

        // Update request status
        deleteRequestQueries.approve.run(req.session.userId, req.params.id);

        res.json({ message: '已核准刪除申請，資料已刪除' });
    } catch (err) {
        console.error('Error approving delete request:', err);
        res.status(500).json({ error: '處理失敗' });
    }
});

// Reject delete request (admin only)
router.put('/:id/reject', requireAdmin, (req, res) => {
    try {
        const { reason } = req.body;

        const request = deleteRequestQueries.findById.get(req.params.id);
        if (!request) {
            return res.status(404).json({ error: '找不到該刪除申請' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: '此申請已處理' });
        }

        // Update request status with rejection reason
        deleteRequestQueries.reject.run(req.session.userId, reason || '', req.params.id);

        res.json({ message: '已拒絕刪除申請' });
    } catch (err) {
        console.error('Error rejecting delete request:', err);
        res.status(500).json({ error: '處理失敗' });
    }
});

module.exports = router;

const express = require('express');
const { submissionQueries, userQueries } = require('../db/database');

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

// Get all submissions (user sees own, admin sees all)
router.get('/', requireAuth, (req, res) => {
    try {
        let submissions;
        if (req.session.role === 'admin') {
            submissions = submissionQueries.getAll.all();
        } else {
            submissions = submissionQueries.getAllByUser.all(req.session.userId);
        }

        // Parse JSON form_data
        submissions = submissions.map(s => ({
            ...s,
            form_data: JSON.parse(s.form_data)
        }));

        res.json(submissions);
    } catch (err) {
        console.error('Error fetching submissions:', err);
        res.status(500).json({ error: '取得資料失敗' });
    }
});

// Get single submission
router.get('/:id', requireAuth, (req, res) => {
    try {
        const submission = submissionQueries.findById.get(req.params.id);

        if (!submission) {
            return res.status(404).json({ error: '找不到資料' });
        }

        // Check permission
        if (req.session.role !== 'admin' && submission.user_id !== req.session.userId) {
            return res.status(403).json({ error: '權限不足' });
        }

        res.json({
            ...submission,
            form_data: JSON.parse(submission.form_data)
        });
    } catch (err) {
        console.error('Error fetching submission:', err);
        res.status(500).json({ error: '取得資料失敗' });
    }
});

// Check if record exists (for "更新資料" button)
router.get('/check/:medicalRecordNumber/:admissionDate', requireAuth, (req, res) => {
    try {
        const { medicalRecordNumber, admissionDate } = req.params;

        let submission;
        if (req.session.role === 'admin') {
            submission = submissionQueries.findByRecord.get(medicalRecordNumber, admissionDate);
        } else {
            submission = submissionQueries.findByUserAndRecord.get(
                req.session.userId,
                medicalRecordNumber,
                admissionDate
            );
        }

        if (!submission) {
            return res.json({ exists: false });
        }

        res.json({
            exists: true,
            submission: {
                ...submission,
                form_data: JSON.parse(submission.form_data)
            }
        });
    } catch (err) {
        console.error('Error checking submission:', err);
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Create new submission
router.post('/', requireAuth, (req, res) => {
    try {
        const { medical_record_number, admission_date, form_data, data_status } = req.body;

        if (!medical_record_number || !admission_date || !form_data) {
            return res.status(400).json({ error: '缺少必要欄位' });
        }

        // Check if already exists
        const existing = submissionQueries.findByUserAndRecord.get(
            req.session.userId,
            medical_record_number,
            admission_date
        );

        if (existing) {
            return res.status(409).json({
                error: '此病歷號與住院日期已存在記錄',
                existingId: existing.id
            });
        }

        const result = submissionQueries.create.run(
            req.session.userId,
            medical_record_number,
            admission_date,
            JSON.stringify(form_data),
            data_status || 'incomplete'
        );

        res.status(201).json({
            id: result.lastInsertRowid,
            message: '資料已儲存'
        });
    } catch (err) {
        console.error('Error creating submission:', err);
        res.status(500).json({ error: '儲存失敗' });
    }
});

// Update submission
router.put('/:id', requireAuth, (req, res) => {
    try {
        const { form_data, data_status } = req.body;

        if (!form_data) {
            return res.status(400).json({ error: '缺少表單資料' });
        }

        const submission = submissionQueries.findById.get(req.params.id);

        if (!submission) {
            return res.status(404).json({ error: '找不到資料' });
        }

        let result;
        if (req.session.role === 'admin') {
            result = submissionQueries.updateAdmin.run(
                JSON.stringify(form_data),
                data_status || 'incomplete',
                req.params.id
            );
        } else {
            if (submission.user_id !== req.session.userId) {
                return res.status(403).json({ error: '權限不足' });
            }
            result = submissionQueries.update.run(
                JSON.stringify(form_data),
                data_status || 'incomplete',
                req.params.id,
                req.session.userId
            );
        }

        if (result.changes === 0) {
            return res.status(404).json({ error: '更新失敗' });
        }

        res.json({ message: '資料已更新' });
    } catch (err) {
        console.error('Error updating submission:', err);
        res.status(500).json({ error: '更新失敗' });
    }
});

// Delete submission (admin only - non-admins must use delete request)
router.delete('/:id', requireAuth, (req, res) => {
    try {
        // Non-admin users cannot directly delete - they must use delete request
        if (req.session.role !== 'admin') {
            return res.status(403).json({
                error: '非管理員無法直接刪除，請使用刪除申請功能',
                requireDeleteRequest: true
            });
        }

        const result = submissionQueries.deleteAdmin.run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: '找不到資料' });
        }

        res.json({ message: '資料已刪除' });
    } catch (err) {
        console.error('Error deleting submission:', err);
        res.status(500).json({ error: '刪除失敗' });
    }
});

module.exports = router;

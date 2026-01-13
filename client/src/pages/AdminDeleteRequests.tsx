import { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Trash2, AlertCircle, Check, XCircle, FileText } from 'lucide-react';
import { API_URL } from '../App';

interface DeleteRequest {
    id: number;
    submission_id: number;
    medical_record_number: string;
    admission_date: string;
    requester_username: string;
    requester_hospital: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reject_reason?: string;
    request_reason?: string;
}

export default function AdminDeleteRequests() {
    const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const { refreshPendingDeleteCount } = useOutletContext<{ refreshPendingDeleteCount: () => void }>();

    // Only decided (approved/rejected) requests can be selected for deletion
    const decidedRequests = useMemo(() => deleteRequests.filter(req => req.status !== 'pending'), [deleteRequests]);

    useEffect(() => {
        fetchDeleteRequests();
    }, []);

    const fetchDeleteRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/delete-requests`, { credentials: 'include' });
            if (!res.ok) throw new Error('取得删除申請失敗');
            const data = await res.json();
            setDeleteRequests(data);
            setSelectedIds(new Set()); // Reset selection on refresh
        } catch (err) {
            setError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDelete = async (id: number) => {
        if (!confirm('確定要核准此删除申請？資料將永久删除。')) return;
        try {
            const res = await fetch(`${API_URL}/delete-requests/${id}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('操作失敗');

            // Refresh counts and current view
            fetchDeleteRequests();
            refreshPendingDeleteCount();
        } catch (err) {
            alert(err instanceof Error ? err.message : '操作失敗');
        }
    };

    const handleRejectDelete = async (id: number) => {
        const reason = prompt('請輸入拒絕理由（可留空）：');
        if (reason === null) return; // User cancelled
        try {
            const res = await fetch(`${API_URL}/delete-requests/${id}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason })
            });
            if (!res.ok) throw new Error('操作失敗');
            fetchDeleteRequests();
            refreshPendingDeleteCount();
        } catch (err) {
            alert(err instanceof Error ? err.message : '操作失敗');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`確定要删除這 ${selectedIds.size} 筆申請紀錄？`)) return;

        try {
            const ids = Array.from(selectedIds);
            await Promise.all(ids.map(id =>
                fetch(`${API_URL}/delete-requests/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                })
            ));

            fetchDeleteRequests();
        } catch (err) {
            alert(err instanceof Error ? err.message : '操作失敗');
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === decidedRequests.length && decidedRequests.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(decidedRequests.map(r => r.id)));
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>刪除表單管理</h1>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="card">
                    {/* Bulk Actions */}
                    {selectedIds.size > 0 && (
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="btn btn-danger" onClick={handleBulkDelete} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Trash2 size={16} />
                                删除勾選紀錄 ({selectedIds.size})
                            </button>
                            <button className="btn btn-warning" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.9rem' }}>
                                <XCircle size={16} />
                                取消複選
                            </button>
                        </div>
                    )}

                    {deleteRequests.length === 0 ? (
                        <div className="empty-state">
                            <Trash2 className="empty-state-icon" />
                            <h3>暫無待審核的刪除申請</h3>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                當使用者申請刪除資料時，會顯示在這裡
                            </p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '30px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === decidedRequests.length && decidedRequests.length > 0}
                                                onChange={toggleSelectAll}
                                                disabled={decidedRequests.length === 0}
                                            />
                                        </th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>紀錄編號</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>病歷號</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>住院日期</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請原因</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請者</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>醫院</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請時間</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>狀態</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>拒絕原因</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>動作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deleteRequests.map(req => (
                                        <tr key={req.id}>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {req.status !== 'pending' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(req.id)}
                                                        onChange={() => toggleSelect(req.id)}
                                                    />
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.85em', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                                {req.status === 'approved' ? (
                                                    (req as any).submission_record_time?.replace(/[-T:]/g, '') || '-'
                                                ) : (
                                                    <Link to={`/form/${req.submission_id}`} style={{ textDecoration: 'none', color: 'var(--color-primary)' }}>
                                                        <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                                        檢視
                                                    </Link>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{req.medical_record_number}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{req.admission_date}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', maxWidth: '150px', whiteSpace: 'normal', fontSize: '0.9rem', color: '#444' }}>
                                                {req.request_reason || <span style={{ color: '#aaa', fontStyle: 'italic' }}>無</span>}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{req.requester_username}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className="badge badge-info">{req.requester_hospital}</span>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {new Date(req.created_at + (req.created_at.includes('Z') ? '' : 'Z')).toLocaleString('zh-TW', { hour12: false })}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {req.status === 'pending' && (
                                                    <span className="badge badge-warning">待審核</span>
                                                )}
                                                {req.status === 'approved' && (
                                                    <span className="badge badge-success">已刪除</span>
                                                )}
                                                {req.status === 'rejected' && (
                                                    <span className="badge badge-danger">已拒絕</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', maxWidth: '150px' }}>
                                                {req.status === 'rejected' ? (
                                                    <span style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>
                                                        {req.reject_reason || '-'}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {req.status === 'pending' ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() => handleApproveDelete(req.id)}
                                                            title="核准刪除"
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                                        >
                                                            <Check size={14} />
                                                            核准
                                                        </button>
                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={() => handleRejectDelete(req.id)}
                                                            title="拒絕"
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                                        >
                                                            <XCircle size={14} />
                                                            拒絕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

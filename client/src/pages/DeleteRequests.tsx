import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { API_URL } from '../App';

interface DeleteRequest {
    id: number;
    submission_id: number;
    medical_record_number: string;
    admission_date: string;
    status: 'pending' | 'approved' | 'rejected';
    reject_reason: string | null;
    created_at: string;
    resolved_at: string | null;
    record_time?: string;
    request_reason?: string;
}

export default function DeleteRequests() {
    const [requests, setRequests] = useState<DeleteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/delete-requests`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('取得資料失敗');
            const data = await res.json();
            setRequests(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        送出中
                    </span>
                );
            case 'approved':
                return (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} />
                        已核准
                    </span>
                );
            case 'rejected':
                return (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={12} />
                        已拒絕
                    </span>
                );
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${y}/${m}/${d} ${hh}:${mm}`;
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>刪除申請</h1>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {error}
                </div>
            )}

            <div className="card">
                {requests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3>尚無刪除申請</h3>
                        <p>當您從表單列表申請刪除時，申請會顯示在這裡</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>紀錄編號</th>
                                    <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>病歷號</th>
                                    <th style={{ textAlign: 'center' }}>住院日期</th>
                                    <th style={{ textAlign: 'center' }}>申請原因</th>
                                    <th style={{ textAlign: 'center' }}>狀態</th>
                                    <th style={{ textAlign: 'center' }}>申請時間</th>
                                    <th style={{ textAlign: 'center' }}>處理時間</th>
                                    <th style={{ textAlign: 'center' }}>管理員回覆</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.85em', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                            {req.status === 'approved' ? (
                                                req.record_time?.replace(/[-T:]/g, '') || '-'
                                            ) : (
                                                <Link to={`/form/${req.submission_id}`} style={{ textDecoration: 'none', color: 'var(--color-primary)' }}>
                                                    {req.record_time?.replace(/[-T:]/g, '') || '-'}
                                                </Link>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{req.medical_record_number}</td>
                                        <td style={{ textAlign: 'center' }}>{req.admission_date}</td>
                                        <td style={{ textAlign: 'center', maxWidth: '200px', whiteSpace: 'normal', fontSize: '0.9rem', color: '#555' }}>
                                            {req.request_reason || <span style={{ color: '#ccc', fontStyle: 'italic' }}>無</span>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{getStatusBadge(req.status)}</td>
                                        <td style={{ textAlign: 'center' }}>{formatDateTime(req.created_at)}</td>
                                        <td style={{ textAlign: 'center' }}>{req.resolved_at ? formatDateTime(req.resolved_at) : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{req.reject_reason || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

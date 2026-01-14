import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { projectGuideService } from '../services/firestore';
import { useToast } from '../components/Toast';
import { Edit, Save, X, BookOpen } from 'lucide-react';

export default function ProjectGuide() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [content, setContent] = useState('');
    const [editContent, setEditContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const data = await projectGuideService.get();
            setContent(data);
            setEditContent(data);
        } catch (error) {
            console.error('Error fetching guide:', error);
            showError('無法載入收案說明');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await projectGuideService.update(editContent);
            setContent(editContent);
            setIsEditing(false);
            showSuccess('收案說明已更新');
        } catch (error) {
            console.error('Error updating guide:', error);
            showError('更新失敗');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditContent(content);
        setIsEditing(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full" style={{ minHeight: '60vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="project-guide-container animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="header-icon-wrapper" style={{
                        background: 'var(--color-primary-light)',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        color: 'var(--color-primary)'
                    }}>
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem' }}>收案說明</h1>
                        <p className="page-subtitle" style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>
                            Project Inclusion Criteria & Guide
                        </p>
                    </div>
                </div>

                {user?.role === 'admin' && !isEditing && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsEditing(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Edit size={16} />
                        編輯說明
                    </button>
                )}
            </div>

            <div className="card" style={{ minHeight: '500px', padding: '2rem' }}>
                {isEditing ? (
                    <div className="edit-mode">
                        <div className="form-group">
                            <label className="form-label" style={{ marginBottom: '1rem', display: 'block' }}>
                                編輯內容 (支援換行)
                            </label>
                            <textarea
                                className="form-input"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '400px',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                                placeholder="請輸入收案說明內容..."
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleCancel}
                                disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <X size={16} />
                                取消
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {saving ? <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div> : <Save size={16} />}
                                儲存變更
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="view-mode">
                        {content ? (
                            <div
                                className="markdown-body"
                                style={{
                                    lineHeight: '1.8',
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap' // Preserve line breaks
                                }}
                            >
                                {content}
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '4rem 0',
                                color: 'var(--text-muted)'
                            }}>
                                <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>目前尚無收案說明內容</p>
                                {user?.role === 'admin' && (
                                    <button
                                        className="btn btn-link"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        點此新增內容
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

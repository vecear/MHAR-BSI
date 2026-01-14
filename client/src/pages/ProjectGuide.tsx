import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { projectGuideService, commentService } from '../services/firestore';
import type { GuideComment, CommentReply } from '../services/firestore';
import { useToast } from '../components/Toast';
import { Edit, Save, X, BookOpen, Send, MessageSquare, Trash2, Bell, Check, User, Smile, Reply as ReplyIcon } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';


export default function ProjectGuide() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    // const { theme } = useTheme(); // Removed unused variable

    // Content State
    const [content, setContent] = useState('');
    const [editContent, setEditContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Comment State
    const [comments, setComments] = useState<GuideComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [notifyAdmin, setNotifyAdmin] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    // Emoji & Reply State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null); // ID of comment being replied to
    const [replyContent, setReplyContent] = useState('');
    const [showReplyEmoji, setShowReplyEmoji] = useState(false);

    // Click outside to close emoji picker
    const emojiRef = useRef<HTMLDivElement>(null);
    const replyEmojiRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        Promise.all([fetchContent(), fetchComments()]).finally(() => setLoading(false));

        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (replyEmojiRef.current && !replyEmojiRef.current.contains(event.target as Node)) {
                setShowReplyEmoji(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchContent = async () => {
        try {
            const data = await projectGuideService.get();
            setContent(data);
            setEditContent(data);
        } catch (error) {
            console.error('Error fetching guide:', error);
            showError('無法載入收案說明');
        }
    };

    const fetchComments = async () => {
        try {
            const data = await commentService.getAll();
            setComments(data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const modules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'clean']
        ],
    }), []);

    const formats = useMemo(() => [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'link'
    ], []);

    // ... (handleSave and handleCancel as before)
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

    const handleSubmitComment = async () => {
        if (!newComment.trim() || !user) return;

        setSubmittingComment(true);
        try {
            await commentService.create(
                user.id,
                user.username || 'Unknown',
                user.hospital || '',
                newComment.trim(),
                notifyAdmin
            );
            setNewComment('');
            setNotifyAdmin(false);
            setShowEmojiPicker(false);
            showSuccess('留言已送出');
            fetchComments();
        } catch (error) {
            console.error('Error adding comment:', error);
            showError('留言失敗');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleSubmitReply = async (commentId: string) => {
        if (!replyContent.trim() || !user) return;

        try {
            await commentService.addReply(
                commentId,
                user.id,
                user.username || 'Unknown',
                user.hospital || '',
                replyContent.trim()
            );
            setReplyingTo(null);
            setReplyContent('');
            setShowReplyEmoji(false);
            showSuccess('回覆已送出');
            fetchComments();
        } catch (error) {
            console.error('Error replying:', error);
            showError('回覆失敗');
        }
    };

    const handleDeleteComment = async (id: string) => {
        if (!window.confirm('確定要刪除此留言嗎？')) return;
        try {
            await commentService.delete(id);
            showSuccess('留言已刪除');
            fetchComments();
        } catch (error) {
            console.error('Error deleting comment:', error);
            showError('刪除失敗');
        }
    };

    const handleDeleteReply = async (commentId: string, reply: CommentReply) => {
        if (!window.confirm('確定要刪除此回覆嗎？')) return;
        try {
            await commentService.deleteReply(commentId, reply);
            showSuccess('回覆已刪除');
            fetchComments();
        } catch (error) {
            console.error('Error deleting reply:', error);
            showError('刪除失敗');
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await commentService.markRead(id);
            setComments(prev => prev.map(c =>
                c.id === id ? { ...c, admin_read: true } : c
            ));
        } catch (error) {
            console.error('Error marking read:', error);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewComment(prev => prev + emojiData.emoji);
    };

    const onReplyEmojiClick = (emojiData: EmojiClickData) => {
        setReplyContent(prev => prev + emojiData.emoji);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full" style={{ minHeight: '60vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="project-guide-container animate-fadeIn" style={{ paddingBottom: '4rem' }}>
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

            <div className="card" style={{ minHeight: '300px', padding: '2rem', marginBottom: '2rem' }}>
                {isEditing ? (
                    <div className="edit-mode">
                        <div className="form-group">
                            <label className="form-label" style={{ marginBottom: '1rem', display: 'block' }}>
                                編輯內容
                            </label>
                            <ReactQuill
                                theme="snow"
                                value={editContent}
                                onChange={setEditContent}
                                modules={modules}
                                formats={formats}
                                style={{ height: '400px', marginBottom: '3.5rem' }}
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
                                className="ql-editor"
                                style={{
                                    padding: 0,
                                    fontSize: '1rem',
                                    color: 'var(--text-primary)',
                                    minHeight: 'auto'
                                }}
                                dangerouslySetInnerHTML={{ __html: content }}
                            />
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

            {/* Comment Section */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    color: 'var(--text-primary)'
                }}>
                    <MessageSquare size={20} />
                    留言討論
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                        ({comments.length})
                    </span>
                </h3>

                {/* Comment Input */}
                <div style={{ marginBottom: '2rem', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <textarea
                            className="form-input"
                            placeholder="輸入您的留言..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                resize: 'vertical',
                                marginBottom: '0.75rem',
                                paddingRight: '40px'
                            }}
                        />
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '10px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)'
                            }}
                            title="插入表情符號"
                        >
                            <Smile size={20} />
                        </button>
                    </div>

                    {showEmojiPicker && (
                        <div ref={emojiRef} style={{ position: 'absolute', top: '100%', right: '0', zIndex: 100 }}>
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                theme={Theme.AUTO}
                                width={300}
                                height={400}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            userSelect: 'none'
                        }}>
                            <input
                                type="checkbox"
                                checked={notifyAdmin}
                                onChange={(e) => setNotifyAdmin(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                            />
                            <Bell size={16} />
                            通知管理員
                        </label>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitComment}
                            disabled={submittingComment || !newComment.trim()}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {submittingComment ? <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div> : <Send size={16} />}
                            送出留言
                        </button>
                    </div>
                </div>

                {/* Comment List */}
                <div className="comment-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {comments.length > 0 ? (
                        comments.map(comment => (
                            <div key={comment.id} style={{
                                padding: '1.25rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)',
                                background: comment.notify_admin && user?.role === 'admin' && !comment.admin_read
                                    ? 'var(--color-warning-light)'
                                    : 'var(--bg-body)',
                                borderLeft: comment.notify_admin && user?.role === 'admin' && !comment.admin_read
                                    ? '4px solid var(--color-warning)'
                                    : '1px solid var(--border-color)',
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            <User size={14} />
                                            {comment.username}
                                        </span>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            background: 'var(--bg-card)',
                                            padding: '0.1rem 0.5rem',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            {comment.hospital}
                                        </span>
                                        {comment.notify_admin && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--color-warning)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}>
                                                <Bell size={12} />
                                                已通知管理員
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {comment.created_at?.toLocaleString('zh-TW')}
                                    </div>
                                </div>

                                <div style={{
                                    fontSize: '0.95rem',
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.5,
                                    marginBottom: '0.5rem'
                                }}>
                                    {comment.content}
                                </div>

                                {/* Action Buttons (Apply, Delete) */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '0.5rem',
                                    marginTop: '0.5rem',
                                    borderTop: '1px dashed var(--border-color)',
                                    paddingTop: '0.5rem'
                                }}>
                                    <button
                                        onClick={() => {
                                            setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                            setReplyContent('');
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-primary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <ReplyIcon size={14} />
                                        回覆
                                    </button>

                                    {user?.role === 'admin' && comment.notify_admin && !comment.admin_read && (
                                        <button
                                            onClick={() => handleMarkRead(comment.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-success)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            <Check size={14} />
                                            標示為已讀
                                        </button>
                                    )}

                                    {(user?.role === 'admin' || user?.id === comment.user_id) && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-danger)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                            刪除
                                        </button>
                                    )}
                                </div>

                                {/* Replies Section */}
                                {(comment.replies && comment.replies.length > 0) && (
                                    <div style={{
                                        marginLeft: '1.5rem',
                                        marginTop: '1rem',
                                        paddingLeft: '1rem',
                                        borderLeft: '2px solid var(--border-color)'
                                    }}>
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} style={{
                                                marginBottom: '0.75rem',
                                                padding: '0.75rem',
                                                background: 'var(--bg-card)',
                                                borderRadius: 'var(--border-radius)',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{reply.username}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reply.hospital}</span>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {new Date(reply.created_at).toLocaleString('zh-TW')}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                                    {reply.content}
                                                </div>
                                                {(user?.role === 'admin' || user?.id === reply.user_id) && (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => handleDeleteReply(comment.id, reply)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--text-muted)',
                                                                fontSize: '0.8rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '2px'
                                                            }}
                                                        >
                                                            <Trash2 size={12} /> 刪除
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Reply Input */}
                                {replyingTo === comment.id && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--border-radius)' }}>
                                        <div style={{ position: 'relative' }}>
                                            <textarea
                                                className="form-input"
                                                placeholder={`回覆 ${comment.username}...`}
                                                value={replyContent}
                                                onChange={(e) => setReplyContent(e.target.value)}
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    minHeight: '60px',
                                                    marginBottom: '0.5rem',
                                                    fontSize: '0.9rem',
                                                    paddingRight: '35px'
                                                }}
                                            />
                                            <button
                                                onClick={() => setShowReplyEmoji(!showReplyEmoji)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '8px',
                                                    top: '8px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)'
                                                }}
                                                title="插入表情符號"
                                            >
                                                <Smile size={18} />
                                            </button>
                                            {showReplyEmoji && (
                                                <div ref={replyEmojiRef} style={{ position: 'absolute', top: '100%', right: '0', zIndex: 100 }}>
                                                    <EmojiPicker
                                                        onEmojiClick={onReplyEmojiClick}
                                                        theme={Theme.AUTO}
                                                        width={300}
                                                        height={350}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setReplyingTo(null);
                                                    setReplyContent('');
                                                }}
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                                            >
                                                取消
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleSubmitReply(comment.id)}
                                                disabled={!replyContent.trim()}
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                                            >
                                                <Send size={14} style={{ marginRight: '4px' }} />
                                                送出回覆
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            尚無留言，歡迎發表第一則討論！
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const HOSPITALS = [
    '內湖總院',
    '松山分院',
    '澎湖分院',
    '桃園總院',
    '台中總院',
    '高雄總院',
    '左營總院',
    '花蓮總院'
];

const SECURITY_QUESTIONS = [
    '生日',
    '身分證',
    '畢業國小',
    '爸爸姓名',
    '媽媽姓名',
    '結婚紀念日',
    '寵物名字'
];

export default function Register() {
    const navigate = useNavigate();
    const { showError, showSuccess } = useToast();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        display_name: '',
        line_id: '',
        password: '',
        confirmPassword: '',
        hospital: '',
        security_question: '',
        security_answer: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showError('密碼與確認密碼不一致');
            return;
        }

        if (formData.password.length < 6) {
            showError('密碼至少需要6個字元');
            return;
        }

        setLoading(true);

        try {
            await register(formData.email, formData.password, {
                username: formData.username,
                display_name: formData.display_name,
                line_id: formData.line_id,
                hospital: formData.hospital,
                security_question: formData.security_question,
                security_answer: formData.security_answer
            });

            showSuccess('註冊成功！');
            navigate('/');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '註冊失敗';
            if (errorMessage.includes('email-already-in-use')) {
                showError('此 Email 已被使用');
            } else if (errorMessage.includes('invalid-email')) {
                showError('Email 格式錯誤');
            } else if (errorMessage.includes('weak-password')) {
                showError('密碼強度不足');
            } else {
                showError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card animate-slideUp" style={{ maxWidth: '450px' }}>
                <div className="login-header">
                    <div className="login-logo">📝</div>
                    <h1 className="login-title">建立帳號</h1>
                    <p className="login-subtitle">MHAR-BSI 菌血症研究表單系統</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="請輸入 Email（作為登入帳號）"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required">帳號名稱</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="請輸入帳號名稱"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required">真實姓名</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            placeholder="請輸入真實姓名"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Line ID</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.line_id}
                            onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
                            placeholder="請輸入 Line ID（選填）"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required">密碼</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="至少6個字元"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required">確認密碼</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="再次輸入密碼"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required">所屬醫院</label>
                        <select
                            className="form-input"
                            value={formData.hospital}
                            onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                            required
                        >
                            <option value="">請選擇醫院</option>
                            {HOSPITALS.map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label required">安全提問</label>
                        <select
                            className="form-input"
                            value={formData.security_question}
                            onChange={(e) => setFormData({ ...formData, security_question: e.target.value })}
                            required
                        >
                            <option value="">請選擇安全提問</option>
                            {SECURITY_QUESTIONS.map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label required">提問答案</label>
                        {formData.security_question === '生日' || formData.security_question === '結婚紀念日' ? (
                            <input
                                type="date"
                                className="form-input"
                                value={formData.security_answer}
                                onChange={(e) => setFormData({ ...formData, security_answer: e.target.value })}
                                required
                            />
                        ) : (
                            <input
                                type="text"
                                className="form-input"
                                value={formData.security_answer}
                                onChange={(e) => setFormData({ ...formData, security_answer: e.target.value })}
                                placeholder="請輸入答案（用於忘記密碼時驗證）"
                                required
                            />
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                        ) : (
                            <>
                                <UserPlus size={18} />
                                註冊
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Link to="/" className="btn btn-secondary" style={{ width: '100%' }}>
                        <ArrowLeft size={18} />
                        返回登入
                    </Link>
                </div>
            </div>
        </div>
    );
}

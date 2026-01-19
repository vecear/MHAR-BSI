import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { submissionService } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';

interface HospitalStat {
    name: string;
    count: number;
    percentage: number;
}

interface PathogenStat {
    name: string;
    count: number;
    percentage: number;
}

interface CompletionStat {
    name: string;
    count: number;
    percentage: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const PATHOGENS = ['CRKP', 'CRAB', 'CRECOLI', 'CRPA'];

// Helper function to calculate pathogen statistics
function calculatePathogenStats(
    allSubmissions: any[],
    user: any,
    pathogenScope: string,
    pathogenHospitalFilter: string
): PathogenStat[] {
    // Always initialize counts for standard pathogens
    const pathogenCounts: Record<string, number> = {
        'CRKP': 0,
        'CRAB': 0,
        'CRECOLI': 0,
        'CRPA': 0
    };

    if (!allSubmissions || allSubmissions.length === 0) {
        // Return all pathogens with 0 count
        return PATHOGENS.map(name => ({
            name,
            count: 0,
            percentage: 0
        }));
    }

    const isAdmin = user?.role === 'admin';
    const mySubmissions = isAdmin
        ? allSubmissions
        : allSubmissions.filter(sub => (sub.form_data as any)?.hospital === user?.hospital);

    let pathogenDataSource;
    if (isAdmin) {
        pathogenDataSource = pathogenHospitalFilter === 'all'
            ? allSubmissions
            : allSubmissions.filter(sub => (sub.form_data as any)?.hospital === pathogenHospitalFilter);
    } else {
        pathogenDataSource = pathogenScope === 'all' ? allSubmissions : mySubmissions;
    }

    // Count occurrences
    pathogenDataSource.forEach(sub => {
        const pathogen = (sub.form_data as any)?.pathogen;
        if (pathogen && PATHOGENS.includes(pathogen)) {
            pathogenCounts[pathogen] = (pathogenCounts[pathogen] || 0) + 1;
        }
    });

    const totalCount = pathogenDataSource.length;

    // Return all standard pathogens in fixed order
    return PATHOGENS.map(name => ({
        name,
        count: pathogenCounts[name] || 0,
        percentage: totalCount > 0 ? parseFloat(((pathogenCounts[name] || 0) / totalCount * 100).toFixed(1)) : 0
    }));
}

// Helper function to calculate completion statistics
function calculateCompletionStats(
    allSubmissions: any[],
    user: any,
    completionHospitalFilter: string
): CompletionStat[] {
    if (!allSubmissions || allSubmissions.length === 0) return [];

    const isAdmin = user?.role === 'admin';
    const mySubmissions = isAdmin
        ? allSubmissions
        : allSubmissions.filter(sub => (sub.form_data as any)?.hospital === user?.hospital);

    let completionDataSource;
    if (isAdmin) {
        completionDataSource = completionHospitalFilter === 'all'
            ? allSubmissions
            : allSubmissions.filter(sub => (sub.form_data as any)?.hospital === completionHospitalFilter);
    } else {
        completionDataSource = mySubmissions;
    }

    if (completionDataSource.length === 0) return [];

    const completeCounts = {
        complete: 0,
        incomplete: 0
    };

    completionDataSource.forEach(sub => {
        if (sub.data_status === 'complete') {
            completeCounts.complete++;
        } else {
            completeCounts.incomplete++;
        }
    });

    return [
        {
            name: '已完成',
            count: completeCounts.complete,
            percentage: parseFloat(((completeCounts.complete / completionDataSource.length) * 100).toFixed(1))
        },
        {
            name: '未完成',
            count: completeCounts.incomplete,
            percentage: parseFloat(((completeCounts.incomplete / completionDataSource.length) * 100).toFixed(1))
        }
    ];
}

export default function Statistics() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [hospitalStats, setHospitalStats] = useState<HospitalStat[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pathogenScope, setPathogenScope] = useState<'my_hospital' | 'all'>('my_hospital'); // For non-admin users
    const [pathogenHospitalFilter, setPathogenHospitalFilter] = useState<string>('all'); // For admin users
    const [completionHospitalFilter, setCompletionHospitalFilter] = useState<string>('all'); // For admin users
    const [availableHospitals, setAvailableHospitals] = useState<string[]>([]);

    // Load all data once on mount
    useEffect(() => {
        loadAllData();
    }, []);

    // Calculate derived statistics when filters change
    const pathogenStats = useMemo(() => {
        return calculatePathogenStats(allSubmissions, user, pathogenScope, pathogenHospitalFilter);
    }, [allSubmissions, user, pathogenScope, pathogenHospitalFilter]);

    const completionStats = useMemo(() => {
        return calculateCompletionStats(allSubmissions, user, completionHospitalFilter);
    }, [allSubmissions, user, completionHospitalFilter]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            // Get all submissions once
            const submissions = await submissionService.getAll(undefined, true);
            setAllSubmissions(submissions);

            if (submissions.length === 0) {
                setHospitalStats([]);
                setTotalRecords(0);
                return;
            }

            // Calculate hospital statistics - ALWAYS show all hospitals
            const hospitalCounts: Record<string, number> = {};
            submissions.forEach(sub => {
                const hospital = (sub.form_data as any)?.hospital || '未知';
                hospitalCounts[hospital] = (hospitalCounts[hospital] || 0) + 1;
            });

            const hospitalData: HospitalStat[] = Object.entries(hospitalCounts)
                .map(([name, count]) => ({
                    name,
                    count,
                    percentage: parseFloat(((count / submissions.length) * 100).toFixed(1))
                }))
                .sort((a, b) => b.count - a.count);

            setHospitalStats(hospitalData);

            // Set available hospitals for admin filters
            const hospitals = Object.keys(hospitalCounts).sort();
            setAvailableHospitals(hospitals);

            // For user's own data (total records)
            const isAdmin = user?.role === 'admin';
            const mySubmissions = isAdmin
                ? submissions
                : submissions.filter(sub => (sub.form_data as any)?.hospital === user?.hospital);

            setTotalRecords(mySubmissions.length);
        } catch (err) {
            console.error('Failed to load statistics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    // Empty state - only show if there's no data at all in the system
    if (allSubmissions.length === 0) {
        return (
            <div className="animate-fadeIn">
                <div className="page-header">
                    <h1>
                        <TrendingUp size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
                        紀錄統計
                    </h1>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>尚無紀錄資料</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        目前還沒有任何紀錄資料可供統計分析
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>
                    <TrendingUp size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
                    紀錄統計
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    總紀錄數：<strong>{totalRecords}</strong> 筆
                    {user?.role !== 'admin' && ` (${user?.hospital})`}
                </p>
            </div>

            {/* Statistics Grid Container */}
            <div className="statistics-grid">
                {/* Hospital Statistics */}
                <div className="card statistics-card">
                <h2 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                    各醫院紀錄筆數
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hospitalStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis
                            dataKey="name"
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
                        />
                        <YAxis
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem'
                            }}
                            formatter={(value: number, name: string, props: any) => [
                                `${value} 筆 (${props.payload.percentage}%)`,
                                '紀錄數'
                            ]}
                        />
                        <Legend
                            wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}
                        />
                        <Bar
                            dataKey="count"
                            name="紀錄數"
                            radius={[8, 8, 0, 0]}
                        >
                            {hospitalStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {hospitalStats.map((stat, index) => (
                        <div key={stat.name} style={{
                            padding: '0.4rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--border-radius)',
                            borderLeft: `3px solid ${COLORS[index % COLORS.length]}`
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.15rem', fontSize: '0.65rem' }}>{stat.name}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                {stat.count} 筆 ({stat.percentage}%)
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pathogen Statistics */}
            <div className="card statistics-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        菌種紀錄
                    </h2>
                    {user?.role === 'admin' ? (
                        <select
                            value={pathogenHospitalFilter}
                            onChange={(e) => setPathogenHospitalFilter(e.target.value)}
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                borderRadius: 'var(--border-radius)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">全部</option>
                            {availableHospitals.map(hospital => (
                                <option key={hospital} value={hospital}>{hospital}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className={`btn ${pathogenScope === 'my_hospital' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setPathogenScope('my_hospital')}
                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                            >
                                我的醫院
                            </button>
                            <button
                                className={`btn ${pathogenScope === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setPathogenScope('all')}
                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                            >
                                所有醫院
                            </button>
                        </div>
                    )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={pathogenStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis
                            dataKey="name"
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
                        />
                        <YAxis
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem'
                            }}
                            formatter={(value: number, name: string, props: any) => [
                                `${value} 筆 (${props.payload.percentage}%)`,
                                '紀錄數'
                            ]}
                        />
                        <Legend
                            wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}
                        />
                        <Bar
                            dataKey="count"
                            name="紀錄數"
                            radius={[8, 8, 0, 0]}
                        >
                            {pathogenStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {pathogenStats.map((stat, index) => (
                        <div key={stat.name} style={{
                            padding: '0.4rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--border-radius)',
                            borderLeft: `3px solid ${COLORS[index % COLORS.length]}`
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.15rem', fontSize: '0.65rem' }}>{stat.name}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                {stat.count} 筆 ({stat.percentage}%)
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Completion Statistics */}
            <div className="card statistics-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        {user?.role === 'admin' ? '紀錄完成度' : '我的紀錄完成度'}
                    </h2>
                    {user?.role === 'admin' && (
                        <select
                            value={completionHospitalFilter}
                            onChange={(e) => setCompletionHospitalFilter(e.target.value)}
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                borderRadius: 'var(--border-radius)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">全部</option>
                            {availableHospitals.map(hospital => (
                                <option key={hospital} value={hospital}>{hospital}</option>
                            ))}
                        </select>
                    )}
                </div>
                {completionStats.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {user?.role === 'admin' && completionHospitalFilter !== 'all'
                                ? `${completionHospitalFilter} 尚無紀錄`
                                : user?.role !== 'admin'
                                ? '您尚無紀錄'
                                : '尚無紀錄'}
                        </p>
                    </div>
                ) : (
                    <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={completionStats}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percentage }) => `${name} ${percentage}%`}
                                outerRadius={75}
                                fill="#8884d8"
                                dataKey="count"
                                style={{ fontSize: '0.8rem' }}
                            >
                                {completionStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--border-radius)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem'
                                }}
                                formatter={(value: number, name: string, props: any) => [
                                    `${value} 筆 (${props.payload.percentage}%)`,
                                    props.payload.name
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {completionStats.map((stat, index) => (
                        <div key={stat.name} style={{
                            padding: '0.4rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--border-radius)',
                            borderLeft: `3px solid ${index === 0 ? '#10b981' : '#f59e0b'}`
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.15rem', fontSize: '0.65rem' }}>{stat.name}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                {stat.count} 筆 ({stat.percentage}%)
                            </div>
                        </div>
                    ))}
                </div>
                    </>
                )}
            </div>
            </div> {/* End of statistics-grid */}
        </div>
    );
}

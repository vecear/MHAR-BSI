import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRange {
    start: string;
    end: string;
}

interface DualDateRangePickerProps {
    admissionRange: DateRange;
    cultureRange: DateRange;
    onAdmissionChange: (range: DateRange) => void;
    onCultureChange: (range: DateRange) => void;
}

type ActiveSelection = 'admission-start' | 'admission-end' | 'culture-start' | 'culture-end' | null;

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function DualDateRangePicker({
    admissionRange,
    cultureRange,
    onAdmissionChange,
    onCultureChange
}: DualDateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activeSelection, setActiveSelection] = useState<ActiveSelection>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setActiveSelection(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    };

    const toDateString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty slots for days before the first
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days in month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const isInRange = (date: Date, start: string, end: string) => {
        const dateStr = toDateString(date);
        if (start && end) {
            return dateStr >= start && dateStr <= end;
        }
        if (start) return dateStr === start;
        if (end) return dateStr === end;
        return false;
    };

    const isRangeStart = (date: Date, start: string) => {
        return start && toDateString(date) === start;
    };

    const isRangeEnd = (date: Date, end: string) => {
        return end && toDateString(date) === end;
    };

    const handleDateClick = useCallback((date: Date) => {
        const dateStr = toDateString(date);

        if (!activeSelection) {
            // Default: start selecting admission start
            setActiveSelection('admission-start');
            onAdmissionChange({ ...admissionRange, start: dateStr });
            return;
        }

        switch (activeSelection) {
            case 'admission-start':
                if (admissionRange.end && dateStr > admissionRange.end) {
                    onAdmissionChange({ start: dateStr, end: '' });
                } else {
                    onAdmissionChange({ ...admissionRange, start: dateStr });
                }
                setActiveSelection('admission-end');
                break;
            case 'admission-end':
                if (admissionRange.start && dateStr < admissionRange.start) {
                    onAdmissionChange({ start: dateStr, end: admissionRange.start });
                } else {
                    onAdmissionChange({ ...admissionRange, end: dateStr });
                }
                setActiveSelection(null);
                break;
            case 'culture-start':
                if (cultureRange.end && dateStr > cultureRange.end) {
                    onCultureChange({ start: dateStr, end: '' });
                } else {
                    onCultureChange({ ...cultureRange, start: dateStr });
                }
                setActiveSelection('culture-end');
                break;
            case 'culture-end':
                if (cultureRange.start && dateStr < cultureRange.start) {
                    onCultureChange({ start: dateStr, end: cultureRange.start });
                } else {
                    onCultureChange({ ...cultureRange, end: dateStr });
                }
                setActiveSelection(null);
                break;
        }
    }, [activeSelection, admissionRange, cultureRange, onAdmissionChange, onCultureChange]);

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const days = getDaysInMonth(currentMonth);

    const clearAdmission = () => onAdmissionChange({ start: '', end: '' });
    const clearCulture = () => onCultureChange({ start: '', end: '' });

    const hasAdmission = admissionRange.start || admissionRange.end;
    const hasCulture = cultureRange.start || cultureRange.end;

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="btn btn-secondary"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    minWidth: '280px',
                    justifyContent: 'flex-start',
                    border: (hasAdmission || hasCulture) ? '2px solid var(--color-primary)' : undefined
                }}
            >
                <Calendar size={18} />
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#3b82f6', fontWeight: 500 }}>住院:</span>
                        <span>{hasAdmission ? `${formatDate(admissionRange.start) || '?'} ~ ${formatDate(admissionRange.end) || '?'}` : '-'}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#22c55e', fontWeight: 500 }}>陽性:</span>
                        <span>{hasCulture ? `${formatDate(cultureRange.start) || '?'} ~ ${formatDate(cultureRange.end) || '?'}` : '-'}</span>
                    </span>
                </span>
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '1rem',
                        zIndex: 1000,
                        minWidth: '360px'
                    }}
                >
                    {/* Range selection buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setActiveSelection('admission-start')}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: activeSelection?.startsWith('admission') ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                                backgroundColor: activeSelection?.startsWith('admission') ? '#dbeafe' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#3b82f6' }} />
                            <span style={{ fontWeight: 500 }}>住院日期</span>
                            {hasAdmission && (
                                <X
                                    size={14}
                                    onClick={(e) => { e.stopPropagation(); clearAdmission(); }}
                                    style={{ cursor: 'pointer', color: 'var(--color-danger)' }}
                                />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSelection('culture-start')}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: activeSelection?.startsWith('culture') ? '2px solid #22c55e' : '1px solid var(--border-color)',
                                backgroundColor: activeSelection?.startsWith('culture') ? '#dcfce7' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#22c55e' }} />
                            <span style={{ fontWeight: 500 }}>陽性日期</span>
                            {hasCulture && (
                                <X
                                    size={14}
                                    onClick={(e) => { e.stopPropagation(); clearCulture(); }}
                                    style={{ cursor: 'pointer', color: 'var(--color-danger)' }}
                                />
                            )}
                        </button>
                    </div>

                    {/* Status hint */}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center' }}>
                        {activeSelection === 'admission-start' && '選擇住院起始日'}
                        {activeSelection === 'admission-end' && '選擇住院結束日'}
                        {activeSelection === 'culture-start' && '選擇陽性起始日'}
                        {activeSelection === 'culture-end' && '選擇陽性結束日'}
                        {!activeSelection && '點擊上方按鈕選擇要設定的日期範圍'}
                    </div>

                    {/* Calendar header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <button type="button" onClick={prevMonth} style={{ padding: '4px', cursor: 'pointer', border: 'none', background: 'none' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <span style={{ fontWeight: 600 }}>
                            {currentMonth.getFullYear()} {MONTHS[currentMonth.getMonth()]}
                        </span>
                        <button type="button" onClick={nextMonth} style={{ padding: '4px', cursor: 'pointer', border: 'none', background: 'none' }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                        {WEEKDAYS.map(day => (
                            <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px' }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {days.map((date, idx) => {
                            if (!date) {
                                return <div key={`empty-${idx}`} style={{ padding: '8px' }} />;
                            }

                            const inAdmission = isInRange(date, admissionRange.start, admissionRange.end);
                            const inCulture = isInRange(date, cultureRange.start, cultureRange.end);
                            const isAdmissionStart = isRangeStart(date, admissionRange.start);
                            const isAdmissionEnd = isRangeEnd(date, admissionRange.end);
                            const isCultureStart = isRangeStart(date, cultureRange.start);
                            const isCultureEnd = isRangeEnd(date, cultureRange.end);

                            const isToday = toDateString(date) === toDateString(new Date());

                            let bgColor = 'transparent';
                            let borderStyle = 'none';

                            // Layered display: show both if overlapping
                            if (inAdmission && inCulture) {
                                bgColor = 'linear-gradient(135deg, #dbeafe 50%, #dcfce7 50%)';
                            } else if (inAdmission) {
                                bgColor = '#dbeafe';
                            } else if (inCulture) {
                                bgColor = '#dcfce7';
                            }

                            // Highlight endpoints
                            if (isAdmissionStart || isAdmissionEnd) {
                                borderStyle = '2px solid #3b82f6';
                            }
                            if (isCultureStart || isCultureEnd) {
                                borderStyle = '2px solid #22c55e';
                            }
                            // If both, use a multi-color border
                            if ((isAdmissionStart || isAdmissionEnd) && (isCultureStart || isCultureEnd)) {
                                borderStyle = '2px solid #8b5cf6';
                            }

                            return (
                                <button
                                    key={toDateString(date)}
                                    type="button"
                                    onClick={() => handleDateClick(date)}
                                    style={{
                                        padding: '8px',
                                        textAlign: 'center',
                                        cursor: activeSelection ? 'pointer' : 'default',
                                        border: borderStyle,
                                        borderRadius: '4px',
                                        background: bgColor,
                                        fontWeight: isToday ? 700 : 400,
                                        color: isToday ? 'var(--color-primary)' : 'var(--text-primary)',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '16px', height: '16px', backgroundColor: '#dbeafe', borderRadius: '3px', border: '1px solid #3b82f6' }} />
                            住院範圍
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '16px', height: '16px', backgroundColor: '#dcfce7', borderRadius: '3px', border: '1px solid #22c55e' }} />
                            陽性範圍
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

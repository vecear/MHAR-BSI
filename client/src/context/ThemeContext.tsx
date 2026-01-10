import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'nordic' | 'forest' | 'sunset' | 'lavender' | 'ocean' | 'rose' | 'coffee' | 'slate' | 'emerald' | 'violet' | 'amber' | 'fuchsia' | 'sky' | 'lime' | 'teal' | 'indigo' | 'stone' | 'midnight';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEMES: { id: Theme; name: string; color: string }[] = [
    { id: 'light', name: '預設 (淺色)', color: '#ffffff' },
    { id: 'dark', name: '暗色模式', color: '#1e293b' },
    { id: 'nordic', name: '北歐灰藍', color: '#5e81ac' },
    { id: 'forest', name: '森林綠意', color: '#059669' },
    { id: 'sunset', name: '日落暖橘', color: '#ea580c' },
    { id: 'lavender', name: '薰衣草紫', color: '#7c3aed' },
    { id: 'ocean', name: '深海湛藍', color: '#0891b2' },
    { id: 'rose', name: '優雅玫紅', color: '#e11d48' },
    { id: 'coffee', name: '香醇咖啡', color: '#78350f' },
    { id: 'slate', name: '沈穩石灰', color: '#475569' },
    { id: 'emerald', name: '翠綠寶石', color: '#10b981' },
    { id: 'violet', name: '夢幻紫羅蘭', color: '#8b5cf6' },
    { id: 'amber', name: '琥珀金黃', color: '#f59e0b' },
    { id: 'fuchsia', name: '時尚桃紅', color: '#d946ef' },
    { id: 'sky', name: '天空蔚藍', color: '#0ea5e9' },
    { id: 'lime', name: '清新萊姆', color: '#84cc16' },
    { id: 'teal', name: '水鴨青綠', color: '#14b8a6' },
    { id: 'indigo', name: '深邃靛藍', color: '#6366f1' },
    { id: 'stone', name: '大地岩灰', color: '#57534e' },
    { id: 'midnight', name: '午夜星空', color: '#1e3a8a' }
];

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as Theme) || 'light';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        if (theme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

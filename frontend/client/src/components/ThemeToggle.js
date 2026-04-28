import React, { useState, useCallback } from 'react';
import { applyTheme, getStoredTheme } from '../theme';

const ThemeToggle = () => {
    const [theme, setTheme] = useState(getStoredTheme);

    const toggleTheme = useCallback(() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
    }, [theme]);

    return (
        <button className='rc-btn rc-btn--ghost rc-btn--sm' onClick={toggleTheme}>
            {theme === 'dark' ? '🔆' : '🌗'}
        </button>
    )
}

export default ThemeToggle;
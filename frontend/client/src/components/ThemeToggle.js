import React, { useState, useCallback } from 'react';
import { applyTheme, getStoredTheme } from '../theme';

const SUN  = "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42";
const MOON = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";

const ThemeToggle = () => {
    const [theme, setTheme] = useState(getStoredTheme);

    const toggleTheme = useCallback(() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
    }, [theme]);

    return (
        <button className='icon-btn' onClick={toggleTheme}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {theme === 'dark' ? <circle cx="12" cy="12" r="5"/> : null}
                <path d={theme === 'dark' ? SUN : MOON} />
            </svg>
        </button>
    )
}

export default ThemeToggle;
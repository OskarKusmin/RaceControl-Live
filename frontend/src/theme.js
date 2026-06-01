export const getStoredTheme = () => {
    try {
        return localStorage.getItem('rc-theme') || 'dark';
    } catch {
        return 'dark';
    }
};

export const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem('rc-theme', theme);
    } catch {
        // localStorage unavailable. theme still applies for this session
    }
}

export const initTheme = () => {
    applyTheme(getStoredTheme());
}
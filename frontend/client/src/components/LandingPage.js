import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './css/LandingPage.css';
import { useTheme } from './useTheme.js';

const STAFF_LINKS = [
  { to: '/front-desk',       label: 'Front Desk' },
  { to: '/lap-line-tracker', label: 'Lap Line Tracking' },
  { to: '/race-control',     label: 'Race Control' },
];

const DISPLAY_LINKS = [
  { to: '/leaderboard',    label: 'Leaderboard' },
  { to: '/next-race',      label: 'Next Race' },
  { to: '/race-countdown', label: 'Race Countdown' },
  { to: '/race-flags',     label: 'Race Flags' },
];

const LandingPage = () => {
  const [theme, toggleTheme] = useTheme('rc-theme');
  useEffect(() => { document.title = 'RaceControl Live' }, []);
  return (
    <div className="screen" data-theme={theme}>
      
      <button className="rc-btn rc-btn--ghost lp-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? '🔆' : '🌗'}
      </button>
      
      <div className="grid-bg"/>
      
      <header className="lp-header">
        <div className="lp-wordmark">
          <span>RaceControl</span>
          <span className="lp-wordmark__live">
            <span className="rc-live-dot" />
            LIVE
          </span>
        </div>
        <p className="lp-tagline">RACE TRACK MANAGEMENT SUITE</p>
      </header>

      <main className="lp-main">

        <section className="lp-section lp-section--staff">
          <div className="lp-section__header">
            <span>🔧</span>
            <div>
              <h2>Staff Tools</h2>
              <p className="lp-section__desc">Operational interfaces</p>
            </div>
          </div>
          <div className="lp-btn-group">
            {STAFF_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className="lp-nav-btn lp-nav-btn--staff">
                {label}
              </NavLink>
            ))}
          </div>
        </section>

        <section className="lp-section lp-section--display">
          <div className="lp-section__header">
            <span>🖥️</span>
            <div>
              <h2>Displays</h2>
              <p className="lp-section__desc">Public-facing screens for drivers and spectators</p>
            </div>
          </div>
          <div className="lp-btn-group">
            {DISPLAY_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className="lp-nav-btn lp-nav-btn--display">
                {label}
              </NavLink>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './css/LandingPage.css';
import ThemeToggle from './ThemeToggle';

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
  useEffect(() => { document.title = 'RaceControl Live' }, []);
  return (
    <div className="screen">
      
      <div className='corner-btn-wrapper'>
        <ThemeToggle/>
      </div>

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
            {/* wrench icon*/}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <div>
              <h2>Staff Tools</h2>
              <p className="lp-section__desc">Operational interfaces</p>
            </div>
          </div>
          <div className="lp-btn-group">
            {STAFF_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className="lp-nav-btn">
                {label}
              </NavLink>
            ))}
          </div>
        </section>

        <section className="lp-section lp-section--display">
          <div className="lp-section__header">
            {/* monitor icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <div>
              <h2>Displays</h2>
              <p className="lp-section__desc">Public-facing screens for drivers and spectators</p>
            </div>
          </div>
          <div className="lp-btn-group">
            {DISPLAY_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className="lp-nav-btn">
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
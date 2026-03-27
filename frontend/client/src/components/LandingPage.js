import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const LandingPage = () => {

const pageStyle = {
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#EAEAEA',
    height: '100vh',
};

const sectionStyle = {
    margin: '20px 0',
    padding: '20px',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease',
};

const buttonDivStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '15px',
    margin: '20px 0'
}

const staffButtonStyle = {
    backgroundColor: '#ff6f61',
    borderRadius: '5px',
    padding: '10px 20px',
    fontWeight: 'bold',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '2px 2px gray',
    transition: 'background-color 0.3s ease, transform 0.3s ease',
};

const displayButtonStyle = {
    backgroundColor: '#5280b6',
    borderRadius: '5px',
    padding: '10px 20px',
    fontWeight: 'bold',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '2px 2px gray',
    transition: 'background-color 0.3s ease, transform 0.3s ease',
};

const navlinkStyle = {
    color: '#FFFFFF',
    textDecoration: 'none'
}

// Hover effects
const handleMouseEnter = (e) => {
    e.target.style.transform = 'scale(1.05)';
};

const handleMouseLeave = (e) => {
    e.target.style.transform = 'scale(1)';
};

useEffect(() => {
  document.title = "Home";
}, []);

    return (
        <div style={pageStyle}>
            <h1>RaceTrack Information Tools</h1>
            <div style={sectionStyle}>
                <h3>Staff Tools</h3>
                <div style={buttonDivStyle}>
                    <button style={staffButtonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <NavLink style={navlinkStyle} to="/front-desk">Front Desk</NavLink>
                    </button>
                    <button style={staffButtonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <NavLink style={navlinkStyle} to="./lap-line-tracker">Lap Line Tracking</NavLink>
                    </button>
                    <button style={staffButtonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <NavLink style={navlinkStyle} to="/race-control">Race Control</NavLink>
                    </button>
                </div>
            </div>
            <div style={sectionStyle}>
                <h3>Displays</h3>
                <div style={buttonDivStyle}>
                    <button style={displayButtonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <NavLink style={navlinkStyle} to="/leaderboard">Leaderboard</NavLink>
                    </button>
                    <button style={displayButtonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <NavLink style={navlinkStyle} to="/next-race">Next Race</NavLink>
                    </button>
                    <button style={displayButtonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <NavLink style={navlinkStyle} to="/race-countdown">Race Countdown</NavLink>
                    </button>
                    <button style={displayButtonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <NavLink style={navlinkStyle} to="/race-flags">Race Flags</NavLink>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LandingPage;
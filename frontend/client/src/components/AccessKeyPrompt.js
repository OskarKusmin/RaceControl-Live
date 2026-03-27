import React, { useState, useContext, useEffect } from 'react';
import { SocketContext } from '../App';

const AccessKeyPrompt = ({ onAccessGranted, role }) => {
    const socket = useContext(SocketContext);
    const [accessKey, setAccessKey] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!socket) {
            setIsLoading(true);
            return;
        }
        setIsLoading(false);

        socket.on('key-validation-response', (response) => {
            if(response.success) {
                onAccessGranted(role, accessKey);
            } else {
                setError(response.message || 'Invalid access key. Try again.');
            }
        });

        return () => {
            socket.off('key-validation-response');
        }
    }, [socket, role, accessKey, onAccessGranted]);

    const handleAccess = () => {
        if (!socket) return;
        socket.emit('validate-key', { key: accessKey, role});
    };

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <div>
            <h1>Enter Access Key</h1>
            <input
                type="password"
                placeholder="Access Key"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
            />
            <button onClick={handleAccess}>Submit</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default AccessKeyPrompt;
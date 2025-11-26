import React from 'react';

interface Props {
    label: string;
    active: boolean;
    onToggle: () => void;
}

export const Toggle: React.FC<Props> = ({ label, active, onToggle }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'rgba(0, 255, 255, 0.8)', fontSize: 10 }}>{label}</span>
            <div
                onClick={onToggle}
                style={{
                    position: 'relative', width: 30, height: 14,
                    background: active ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 255, 255, 0.2)',
                    borderRadius: 7, cursor: 'pointer',
                    border: '1px solid rgba(0, 255, 255, 0.4)',
                    transition: 'background 0.3s'
                }}
            >
                <div style={{
                    position: 'absolute', top: 1, left: active ? 17 : 1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: active ? '#fff' : '#0ff',
                    boxShadow: '0 0 5px #0ff',
                    transition: 'left 0.3s, background 0.3s'
                }} />
            </div>
        </div>
    );
};

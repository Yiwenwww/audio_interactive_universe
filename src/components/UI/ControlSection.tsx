import React, { useState } from 'react';

interface Props {
    title: string;
    children: React.ReactNode;
    defaultCollapsed?: boolean;
}

export const ControlSection: React.FC<Props> = ({ title, children, defaultCollapsed = false }) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    return (
        <div style={{ marginBottom: 10, borderBottom: '1px dashed rgba(0,255,255,0.2)', paddingBottom: 5 }}>
            <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    color: '#0ff', fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.9,
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(0, 255, 255, 0.05)', padding: 4, borderRadius: 2, transition: 'background 0.2s'
                }}
            >
                {title}
                <span style={{ fontSize: 10, marginLeft: 5, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
            </div>
            <div style={{
                maxHeight: collapsed ? 0 : 800,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out',
                opacity: collapsed ? 0 : 1
            }}>
                {children}
            </div>
        </div>
    );
};

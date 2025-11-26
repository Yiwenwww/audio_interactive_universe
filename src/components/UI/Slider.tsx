import React from 'react';

interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (val: number) => void;
    displayValue?: string;
    colorClass?: 'red' | 'green' | 'blue';
}

export const Slider: React.FC<Props> = ({ label, value, min, max, step, onChange, displayValue, colorClass }) => {
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(0, 255, 255, 0.8)', fontSize: 10, marginBottom: 2 }}>
                <span>{label}</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{displayValue || value}</span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{
                    width: '100%',
                    accentColor: colorClass === 'red' ? '#f00' : colorClass === 'green' ? '#0f0' : colorClass === 'blue' ? '#00f' : '#0ff',
                    cursor: 'pointer'
                }}
            />
        </div>
    );
};

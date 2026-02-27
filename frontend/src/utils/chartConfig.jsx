import React from 'react';

// Softer SaaS Color Palette
export const CHART_COLORS = {
    primary: '#818cf8',   // Indigo 400
    secondary: '#2dd4bf', // Teal 400
    tertiary: '#fb7185',  // Rose 400
    quaternary: '#facc15', // Yellow 400
    quinary: '#a78bfa',   // Violet 400
    gray: '#94a3b8',      // Slate 400
    grid: '#f1f5f9',      // Slate 100
    text: '#94a3b8',      // Slate 400
};

// Gradient Definitions for Area and Line Charts
export const ChartGradients = () => (
    <defs>
        <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.18} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.18} />
            <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.quinary} stopOpacity={0.12} />
            <stop offset="95%" stopColor={CHART_COLORS.quinary} stopOpacity={0} />
        </linearGradient>
    </defs>
);

// Standard Axes Props
export const XAxisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fill: CHART_COLORS.text, fontSize: 11, fontWeight: 500 },
    dy: 10,
    minTickGap: 30,
};

export const YAxisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fill: CHART_COLORS.text, fontSize: 11, fontWeight: 500 },
    dx: -10,
    tickFormatter: (value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`,
};

export const GridProps = {
    vertical: false,
    stroke: CHART_COLORS.grid,
    strokeDasharray: '3 6',
    strokeOpacity: 0.7,
};

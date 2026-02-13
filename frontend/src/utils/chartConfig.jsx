import React from 'react';

// Modern SaaS Color Palette
export const CHART_COLORS = {
    primary: '#6366f1',   // Indigo 500
    secondary: '#14b8a6', // Teal 500
    tertiary: '#f43f5e',  // Rose 500
    quaternary: '#eab308', // Yellow 500
    quinary: '#8b5cf6',   // Violet 500
    gray: '#94a3b8',      // Slate 400
    grid: '#e2e8f0',      // Slate 200
    text: '#64748b',      // Slate 500
};

// Gradient Definitions for Area Charts
export const ChartGradients = () => (
    <defs>
        <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.quinary} stopOpacity={0.1} />
            <stop offset="95%" stopColor={CHART_COLORS.quinary} stopOpacity={0} />
        </linearGradient>
    </defs>
);

// Standard Axes Props
export const XAxisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fill: CHART_COLORS.text, fontSize: 12 },
    dy: 10,
    minTickGap: 30,
};

export const YAxisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fill: CHART_COLORS.text, fontSize: 12 },
    dx: -10,
    tickFormatter: (value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`,
};

export const GridProps = {
    vertical: false,
    stroke: CHART_COLORS.grid,
    strokeDasharray: '4 4',
};

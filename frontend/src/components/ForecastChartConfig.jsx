import React from 'react';
import { Area, Line, ReferenceLine, ReferenceArea } from 'recharts';

export const CHART_DEFS = () => (
    <defs>
        <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.26} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.06} />
        </linearGradient>
        <linearGradient id="actualLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="futureZone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef2ff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#eef2ff" stopOpacity={0.08} />
        </linearGradient>
        <linearGradient id="predictedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
        </linearGradient>
        <pattern id="futureHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#c7d2fe" strokeWidth="1" strokeOpacity="0.35" />
        </pattern>
    </defs>
);

export const ChartAreas = () => (
    <>
        <Area type="monotone" dataKey="lower_bound" stroke="none" fillOpacity={0} stackId="confidence" isAnimationActive={true} animationDuration={800} />
        <Area type="monotone" dataKey="confidence_band" stroke="none" fill="url(#forecastBand)" fillOpacity={1} stackId="confidence" isAnimationActive={true} animationDuration={800} />
        <Area type="monotone" dataKey="predicted_fill" stroke="none" fill="url(#predictedFill)" fillOpacity={1} isAnimationActive={true} animationDuration={900} />
    </>
);

export const ChartLines = () => (
    <>
        <Line type="monotone" dataKey="upper_bound" stroke="#a5b4fc" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={true} animationDuration={800} />
        <Line type="monotone" dataKey="lower_bound" stroke="#a5b4fc" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={true} animationDuration={800} />
        <Line type="monotone" dataKey="actual_cost" stroke="url(#actualLine)" strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#64748b' }} isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
    </>
);

export const ChartReferences = ({ forecastStartDate, forecastEndDate, forecastStats }) => (
    <>
        {forecastStartDate && forecastEndDate && (
            <>
                <ReferenceArea x1={forecastStartDate} x2={forecastEndDate} fill="url(#futureZone)" fillOpacity={1} ifOverflow="extendDomain" />
                <ReferenceArea x1={forecastStartDate} x2={forecastEndDate} fill="url(#futureHatch)" fillOpacity={0.22} ifOverflow="extendDomain" />
            </>
        )}
        {forecastStartDate && (
            <ReferenceLine x={forecastStartDate} stroke="#c7d2fe" strokeDasharray="4 4" label={{ value: 'Forecast start', position: 'insideTopRight', fill: '#6366f1', fontSize: 11 }} />
        )}
        {forecastStats && (
            <ReferenceLine y={forecastStats.max} stroke="#818cf8" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: `Peak $${forecastStats.max.toFixed(1)}`, position: 'right', fill: '#6366f1', fontSize: 10 }} />
        )}
    </>
);

import React, { useState } from 'react';
import { SIMULATION_STATES } from '../../hooks/useYardSimulation';

export const YardSceneIsometric = ({ 
    simState, 
    activeJob, 
    onSelectEntity,
    selectedEntityId,
    zoom = 1,
    filterLayer = 'all' // 'all' | 'stations' | 'tanks' | 'trucks'
}) => {
    const isSimulating = simState !== SIMULATION_STATES.IDLE;

    // Calculate dynamic truck position based on state machine
    let truckTransform = 'translate(60, 480)'; // Entrance position
    let truckOpacity = 1;

    if (simState === SIMULATION_STATES.TRUCK_INBOUND) {
        truckTransform = 'translate(310, 390)'; // Entering Station 1
    } else if (
        simState === SIMULATION_STATES.WEIGHING_SCALE ||
        simState === SIMULATION_STATES.DRC_SAMPLING ||
        simState === SIMULATION_STATES.TRANSFER_PAYLOAD ||
        simState === SIMULATION_STATES.SETTLEMENT_SLIP
    ) {
        truckTransform = 'translate(350, 370)'; // Docked at Station 1 scale
    } else if (simState === SIMULATION_STATES.TRUCK_OUTBOUND || simState === SIMULATION_STATES.METRICS_SYNC) {
        truckTransform = 'translate(780, 520)'; // Exiting towards road
        truckOpacity = 0.8;
    }

    return (
        <div className="relative w-full h-[520px] md:h-[620px] overflow-hidden rounded-3xl bg-gradient-to-b from-slate-100 via-slate-50 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 select-none flex items-center justify-center">
            {/* Ambient Grid Background */}
            <div 
                className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            ></div>

            {/* SVG 3D Isometric Stage */}
            <svg
                viewBox="0 0 1000 650"
                className="w-full h-full object-contain transition-transform duration-300 ease-out"
                style={{ transform: `scale(${zoom})` }}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {/* Gradients */}
                    <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f1f5f9" />
                        <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="roofBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="roofDarkBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e40af" />
                        <stop offset="100%" stopColor="#172554" />
                    </linearGradient>
                    <linearGradient id="wallLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="wallDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                    <linearGradient id="tankLiquidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#16a34a" />
                        <stop offset="100%" stopColor="#4ade80" />
                    </linearGradient>
                    <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
                        <feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity="0.12" floodColor="#0f172a" />
                    </filter>
                    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* 1. Isometric Ground Plane */}
                <g id="ground" filter="url(#softShadow)">
                    {/* Isometric Diamond Base */}
                    <polygon 
                        points="500,60 960,320 500,580 40,320" 
                        fill="url(#groundGrad)" 
                        className="dark:fill-slate-900 transition-colors"
                        stroke="#cbd5e1" 
                        strokeWidth="1.5" 
                    />
                    
                    {/* Perimeter Curbs */}
                    <polygon points="40,320 500,580 500,595 40,335" fill="#94a3b8" />
                    <polygon points="500,580 960,320 960,335 500,595" fill="#64748b" />

                    {/* Road Strip (Isometric Roadway) */}
                    <polygon 
                        points="40,360 480,595 620,595 180,360" 
                        fill="#334155" 
                        opacity="0.85" 
                    />
                    {/* Road Markings */}
                    <line x1="100" y1="380" x2="540" y2="590" stroke="#f8fafc" strokeWidth="2.5" strokeDasharray="16 12" />
                    <line x1="160" y1="375" x2="580" y2="585" stroke="#f59e0b" strokeWidth="2" strokeDasharray="8 8" />

                    {/* Bay Parking Slots */}
                    <polygon points="310,360 390,320 460,360 380,400" fill="#475569" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 4" opacity="0.9" />
                    <text x="375" y="365" fill="#f8fafc" fontSize="10" fontWeight="bold" transform="rotate(-25 375 365)">BAY 01</text>

                    <polygon points="420,420 500,380 570,420 490,460" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                    <text x="485" y="425" fill="#94a3b8" fontSize="10" fontWeight="bold" transform="rotate(-25 485 425)">BAY 02</text>
                </g>

                {/* 2. Main Warehouse Complex (WH-01 / ลานรับซื้อยาง) */}
                <g id="warehouse-complex" className="cursor-pointer" onClick={() => onSelectEntity('station', { title: 'อาคารชั่งและรับซื้อยาง WH-01 (Station 1 & 2)', status: 'เปิดรับซื้อปกติ' })}>
                    {/* Shadow */}
                    <polygon points="320,240 760,240 680,410 240,410" fill="#0f172a" opacity="0.12" />

                    {/* Main Warehouse Rear Section */}
                    <g id="main-building">
                        {/* Left Wall */}
                        <polygon points="340,180 500,90 500,210 340,300" fill="url(#wallDarkGrad)" />
                        {/* Right Wall */}
                        <polygon points="500,90 720,210 720,330 500,210" fill="url(#wallLightGrad)" />
                        
                        {/* Blue Industrial Pitched Roof */}
                        <polygon points="330,175 490,85 710,205 550,295" fill="url(#roofBlueGrad)" filter="url(#softShadow)" />
                        <polygon points="550,295 710,205 725,215 565,305" fill="url(#roofDarkBlueGrad)" />

                        {/* WareTrack / RubberTrade Logo Banner on Roof */}
                        <g transform="translate(480, 160) rotate(-26)">
                            <rect x="0" y="0" width="85" height="24" rx="6" fill="#ffffff" filter="url(#softShadow)" />
                            <text x="8" y="16" fill="#1e3a8a" fontSize="10" fontWeight="900" letterSpacing="1">RUBBER·01</text>
                        </g>

                        {/* Roll-up Dock Doors */}
                        <polygon points="530,225 610,270 610,320 530,275" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                        <polygon points="630,280 700,320 700,340 630,300" fill="#1e293b" />
                    </g>
                </g>

                {/* 3. Liquid Latex Silo Tanks (ถังพักน้ำยางสด 3D) */}
                {(filterLayer === 'all' || filterLayer === 'tanks') && (
                    <g 
                        id="silo-tanks" 
                        className="cursor-pointer group"
                        onClick={() => onSelectEntity('tank', { title: 'ถังพักน้ำยางสด Silo #1', volumePct: isSimulating ? 82 : 74, currentVolume: '15,200', avgDrc: '33.8%' })}
                    >
                        {/* Tank 1 Base & Cylinder */}
                        <g transform="translate(240, 160)">
                            {/* Base Pedestal */}
                            <ellipse cx="60" cy="110" rx="35" ry="18" fill="#64748b" />
                            {/* Tank Body Cylinder */}
                            <path d="M25,50 C25,40 95,40 95,50 L95,110 C95,120 25,120 25,110 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                            {/* Liquid Level Indicator (Translucent Window) */}
                            <rect x="55" y="45" width="10" height="65" rx="3" fill="#0f172a" opacity="0.6" />
                            <rect 
                                x="56" 
                                y={simState === SIMULATION_STATES.TRANSFER_PAYLOAD ? "50" : "62"} 
                                width="8" 
                                height={simState === SIMULATION_STATES.TRANSFER_PAYLOAD ? "58" : "46"} 
                                rx="2" 
                                fill="url(#tankLiquidGrad)" 
                                className="transition-all duration-700" 
                            />
                            {/* Dome Top */}
                            <ellipse cx="60" cy="50" rx="35" ry="16" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                            <ellipse cx="60" cy="46" rx="14" ry="7" fill="#f8fafc" />
                            
                            {/* Label */}
                            <text x="42" y="85" fill="#334155" fontSize="8" fontWeight="bold">TANK-01</text>
                            
                            {/* Pumping Ripple / Pulse Animation during TRANSFER_PAYLOAD */}
                            {simState === SIMULATION_STATES.TRANSFER_PAYLOAD && (
                                <circle cx="60" cy="50" r="28" fill="none" stroke="#22c55e" strokeWidth="2.5" className="animate-ping" opacity="0.7" />
                            )}
                        </g>

                        {/* Tank 2 (Secondary Silo) */}
                        <g transform="translate(160, 200)">
                            <ellipse cx="50" cy="95" rx="28" ry="14" fill="#64748b" />
                            <path d="M22,45 C22,35 78,35 78,45 L78,95 C78,105 22,105 22,95 Z" fill="#cbd5e1" stroke="#94a3b8" />
                            <ellipse cx="50" cy="45" rx="28" ry="13" fill="#0284c7" />
                            <text x="35" y="75" fill="#475569" fontSize="7" fontWeight="bold">TANK-02</text>
                        </g>

                        {/* Interconnecting Pipe Manifold */}
                        <path 
                            d="M220,265 L275,235 L340,270" 
                            fill="none" 
                            stroke={simState === SIMULATION_STATES.TRANSFER_PAYLOAD ? "#22c55e" : "#0284c7"} 
                            strokeWidth="3.5" 
                            strokeLinecap="round" 
                            className="transition-colors duration-500"
                        />
                    </g>
                )}

                {/* 4. Cup Lump Rubber Yard & Pallet Stacks (ลานเทยางก้อนถ้วย) */}
                {(filterLayer === 'all' || filterLayer === 'yard') && (
                    <g 
                        id="cup-lump-yard" 
                        className="cursor-pointer"
                        onClick={() => onSelectEntity('yard', { title: 'ลานเทและกองเก็บยางก้อนถ้วย (Yard-A)', stockWeight: '8,450', moisture: '50%' })}
                    >
                        {/* Staged Rubber Bales / Pallet 1 */}
                        <g transform="translate(620, 360)">
                            {/* Wooden Pallet base */}
                            <polygon points="20,40 60,20 100,40 60,60" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                            {/* Brown Rubber Bales */}
                            <polygon points="25,35 60,18 95,35 60,52" fill="#d97706" />
                            <polygon points="25,35 60,52 60,35 25,18" fill="#b45309" />
                            <polygon points="60,52 95,35 95,18 60,35" fill="#92400e" />
                            {/* Top stacked bale */}
                            <polygon points="32,22 60,8 88,22 60,36" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
                        </g>

                        {/* Pallet 2 */}
                        <g transform="translate(680, 395)">
                            <polygon points="20,40 60,20 100,40 60,60" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                            <polygon points="25,35 60,18 95,35 60,52" fill="#d97706" />
                            <polygon points="32,22 60,8 88,22 60,36" fill="#f59e0b" />
                        </g>
                    </g>
                )}

                {/* 5. Stationary Forklift in Yard */}
                <g id="forklift" transform="translate(560, 440) scale(0.85)">
                    {/* Shadow */}
                    <ellipse cx="25" cy="30" rx="22" ry="10" fill="#0f172a" opacity="0.25" />
                    {/* Body */}
                    <polygon points="10,15 35,5 45,18 20,28" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                    <polygon points="10,15 20,28 20,38 10,25" fill="#ca8a04" />
                    {/* Mast & Forks */}
                    <line x1="45" y1="5" x2="45" y2="28" stroke="#334155" strokeWidth="3" />
                    <line x1="45" y1="26" x2="55" y2="22" stroke="#475569" strokeWidth="2.5" />
                    {/* Wheels */}
                    <circle cx="15" cy="30" r="4" fill="#0f172a" />
                    <circle cx="38" cy="22" r="4" fill="#0f172a" />
                </g>

                {/* 6. Active Moving / Docking Inbound Truck (รถชั่งน้ำหนักเสมือนจริง) */}
                <g 
                    id="dynamic-truck" 
                    style={{ 
                        transform: truckTransform,
                        transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s',
                        opacity: truckOpacity
                    }}
                    className="cursor-pointer group"
                    onClick={() => activeJob && onSelectEntity('truck', activeJob)}
                >
                    {/* Truck Shadow */}
                    <ellipse cx="45" cy="35" rx="38" ry="16" fill="#0f172a" opacity="0.3" />

                    {/* Truck Cabin (Blue/White Industrial Pickup or Truck) */}
                    {/* Front Cab */}
                    <polygon points="60,10 85,22 85,38 60,26" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
                    <polygon points="35,22 60,10 60,26 35,38" fill="#3b82f6" />
                    {/* Windshield */}
                    <polygon points="58,13 78,22 78,28 58,19" fill="#93c5fd" />

                    {/* Truck Cargo Bed (กระบะบรรทุกยาง / ถังน้ำยาง) */}
                    <polygon points="10,35 38,22 60,32 32,46" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                    <polygon points="10,35 32,46 32,54 10,43" fill="#64748b" />
                    <polygon points="32,46 60,32 60,40 32,54" fill="#475569" />

                    {/* Wheels */}
                    <circle cx="25" cy="48" r="6" fill="#1e293b" />
                    <circle cx="70" cy="32" r="6" fill="#1e293b" />

                    {/* Scale Digital Reading Popup (When at scale) */}
                    {(simState === SIMULATION_STATES.WEIGHING_SCALE || simState === SIMULATION_STATES.DRC_SAMPLING) && (
                        <g transform="translate(15, -35)">
                            <rect x="0" y="0" width="75" height="24" rx="6" fill="#0f172a" stroke="#22c55e" strokeWidth="1.5" filter="url(#glowEffect)" />
                            <text x="8" y="16" fill="#4ade80" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                {activeJob?.weight || '485.5'} kg
                            </text>
                        </g>
                    )}

                    {/* Receipt Floating Banner (When SETTLEMENT_SLIP) */}
                    {simState === SIMULATION_STATES.SETTLEMENT_SLIP && (
                        <g transform="translate(10, -55)" className="animate-bounce">
                            <rect x="0" y="0" width="85" height="42" rx="8" fill="#ffffff" stroke="#16a34a" strokeWidth="2" filter="url(#softShadow)" />
                            <text x="8" y="14" fill="#64748b" fontSize="8" fontWeight="bold">บิลรับซื้อยาง</text>
                            <text x="8" y="28" fill="#16a34a" fontSize="12" fontWeight="900">
                                ฿{Number(activeJob?.totalPrice || 0).toLocaleString()}
                            </text>
                            <circle cx="72" cy="12" r="5" fill="#22c55e" />
                        </g>
                    )}
                </g>

                {/* 7. Interactive Floating Pins (Tags on Map like WareTrack) */}
                {/* Pin 1: Station 1 */}
                <g 
                    transform="translate(360, 310)" 
                    className="cursor-pointer group"
                    onClick={() => onSelectEntity('station', { title: 'แท่นชั่ง Station 1', status: isSimulating ? 'กำลังชั่ง' : 'ว่าง (Ready)' })}
                >
                    <circle cx="12" cy="12" r="14" fill="#3b82f6" opacity="0.25" className="group-hover:scale-125 transition-transform origin-center" />
                    <circle cx="12" cy="12" r="9" fill="#2563eb" filter="url(#softShadow)" />
                    <text x="7" y="15" fill="#ffffff" fontSize="9" fontWeight="bold">01</text>
                    {/* Hover Card */}
                    <g transform="translate(-30, -32)" opacity="0" className="group-hover:opacity-100 transition-opacity pointer-events-none">
                        <rect x="0" y="0" width="80" height="22" rx="6" fill="#0f172a" opacity="0.9" />
                        <text x="8" y="15" fill="#ffffff" fontSize="9" fontWeight="bold">Station 1: ชั่งยาง</text>
                    </g>
                </g>

                {/* Pin 2: Silo Tank */}
                <g 
                    transform="translate(285, 140)" 
                    className="cursor-pointer group"
                    onClick={() => onSelectEntity('tank', { title: 'ถังพักน้ำยาง Silo 1', volumePct: isSimulating ? 82 : 74 })}
                >
                    <circle cx="12" cy="12" r="14" fill="#10b981" opacity="0.25" />
                    <circle cx="12" cy="12" r="9" fill="#059669" filter="url(#softShadow)" />
                    <text x="8" y="15" fill="#ffffff" fontSize="9" fontWeight="bold">T1</text>
                </g>

                {/* Pin 3: Yard Cup Lump */}
                <g 
                    transform="translate(680, 340)" 
                    className="cursor-pointer group"
                    onClick={() => onSelectEntity('yard', { title: 'ลานเทยางก้อนถ้วย Yard-A' })}
                >
                    <circle cx="12" cy="12" r="14" fill="#f59e0b" opacity="0.25" />
                    <circle cx="12" cy="12" r="9" fill="#d97706" filter="url(#softShadow)" />
                    <text x="7" y="15" fill="#ffffff" fontSize="9" fontWeight="bold">YA</text>
                </g>
            </svg>
        </div>
    );
};

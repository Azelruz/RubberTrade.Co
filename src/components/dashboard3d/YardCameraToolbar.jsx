import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Layers, Play, Droplets, Package } from 'lucide-react';

export const YardCameraToolbar = ({ 
    zoom, 
    onZoomIn, 
    onZoomOut, 
    onResetZoom,
    filterLayer,
    onFilterChange,
    onTriggerDemo,
    isSimulating
}) => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            {/* Left: Layer Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">เลเยอร์:</span>
                </span>
                {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'stations', label: 'แท่นชั่ง' },
                    { id: 'tanks', label: 'ถังน้ำยาง' },
                    { id: 'yard', label: 'ลานยางก้อน' }
                ].map(layer => (
                    <button
                        key={layer.id}
                        onClick={() => onFilterChange(layer.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                            filterLayer === layer.id
                                ? 'bg-rubber-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        {layer.label}
                    </button>
                ))}
            </div>

            {/* Right: Camera Zoom & Demo Test Triggers */}
            <div className="flex items-center gap-2">
                {/* Camera controls */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <button
                        onClick={onZoomOut}
                        disabled={zoom <= 0.8}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors"
                        title="Zoom Out"
                        aria-label="Zoom Out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1.5 text-slate-500">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={onZoomIn}
                        disabled={zoom >= 1.6}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors"
                        title="Zoom In"
                        aria-label="Zoom In"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onResetZoom}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Reset Camera"
                        aria-label="Reset Camera"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Quick Simulation Test Buttons */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onTriggerDemo('latex')}
                        disabled={isSimulating}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
                        title="จำลองรถน้ำยางสดเข้าชั่ง"
                    >
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        <span className="hidden sm:inline">ทดสอบน้ำยางสด</span>
                    </button>
                    <button
                        onClick={() => onTriggerDemo('cup_lump')}
                        disabled={isSimulating}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
                        title="จำลองรถยางก้อนถ้วยเข้าชั่ง"
                    >
                        <Package className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">ทดสอบยางก้อน</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

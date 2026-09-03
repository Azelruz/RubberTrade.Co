import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, User, FileText, Scale, CheckCircle2, Clock } from 'lucide-react';

// Create custom leaflet markers for different status
const createCustomIcon = (isSelected, hasSoldToday) => {
    if (isSelected) {
        return L.divIcon({
            className: 'custom-map-marker-selected',
            html: `
                <div style="
                    background: linear-gradient(135deg, #ef4444, #b91c1c);
                    color: white;
                    width: 34px;
                    height: 34px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.6);
                    border: 2.5px solid #ffffff;
                ">
                    <div style="transform: rotate(45deg); font-weight: bold; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">★</div>
                </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -34]
        });
    }

    if (hasSoldToday) {
        return L.divIcon({
            className: 'custom-map-marker-sold',
            html: `
                <div style="
                    background: linear-gradient(135deg, #10b981, #047857);
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
                    border: 2px solid #ffffff;
                ">
                    <div style="transform: rotate(45deg); font-weight: bold; font-size: 13px;">✓</div>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });
    }

    return L.divIcon({
        className: 'custom-map-marker-unsold',
        html: `
            <div style="
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 10px rgba(59, 130, 246, 0.4);
                border: 2px solid #ffffff;
            ">
                <div style="transform: rotate(45deg); font-size: 11px;">📍</div>
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });
};

// Component to dynamically re-center map
const MapRecenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

export const LandPlotMap = ({ plots = [], selectedPlotId, onSelectPlot, onQuickBuy, mapCenter = [8.4377, 99.9631] }) => {
    const [mapLayers, setMapLayers] = useState('satellite');

    // Default center Thailand rubber area fallback
    const activeCenter = plots.length > 0 && plots[0].lat && plots[0].lng
        ? [plots[0].lat, plots[0].lng]
        : mapCenter;

    return (
        <div className="relative w-full h-[650px] rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            {/* Map Layer Switcher */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur p-1.5 rounded-xl shadow-md flex items-center space-x-1 border border-gray-200 text-xs font-semibold">
                <button
                    onClick={() => setMapLayers('satellite')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${mapLayers === 'satellite' ? 'bg-rubber-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    ดาวเทียม (Satellite)
                </button>
                <button
                    onClick={() => setMapLayers('street')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${mapLayers === 'street' ? 'bg-rubber-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    แผนที่ถนน (Street)
                </button>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur p-3 rounded-2xl shadow-lg border border-gray-200 text-xs space-y-2">
                <div className="font-bold text-gray-800 border-b pb-1">สัญลักษณ์หมุดแปลงยาง</div>
                <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">✓</span>
                    <span className="text-emerald-800 font-bold">ขายน้ำยางวันนี้แล้ว</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center shadow-xs">📍</span>
                    <span className="text-gray-700">ยังไม่ได้ขายน้ำยางวันนี้</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">★</span>
                    <span className="text-red-700 font-bold">แปลงที่กำลังเลือก</span>
                </div>
            </div>

            <MapContainer
                center={activeCenter}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={true}
            >
                <MapRecenter center={activeCenter} />

                {mapLayers === 'satellite' ? (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution="Tiles &copy; Esri &mdash; Source: Esri"
                    />
                ) : (
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                )}

                {plots.map((plot) => {
                    let coordinates = [];
                    if (plot.geojson) {
                        try {
                            const parsed = typeof plot.geojson === 'string' ? JSON.parse(plot.geojson) : plot.geojson;
                            if (parsed.type === 'Polygon' && parsed.coordinates) {
                                coordinates = parsed.coordinates[0].map(coord => [coord[1], coord[0]]);
                            }
                        } catch (e) {
                            console.warn('Failed to parse geojson for plot:', plot.id);
                        }
                    }

                    const isSelected = selectedPlotId === plot.id;
                    const hasSoldToday = plot.hasSoldToday;
                    const lat = plot.lat || (coordinates.length > 0 ? coordinates[0][0] : null);
                    const lng = plot.lng || (coordinates.length > 0 ? coordinates[0][1] : null);

                    const polygonColor = isSelected ? '#dc2626' : (hasSoldToday ? '#059669' : '#2563eb');
                    const polygonFillColor = isSelected ? '#ef4444' : (hasSoldToday ? '#10b981' : '#3b82f6');

                    return (
                        <React.Fragment key={plot.id}>
                            {/* Render Polygon if coordinates exist */}
                            {coordinates.length > 0 && (
                                <Polygon
                                    positions={coordinates}
                                    pathOptions={{
                                        color: polygonColor,
                                        fillColor: polygonFillColor,
                                        fillOpacity: isSelected ? 0.6 : (hasSoldToday ? 0.45 : 0.35),
                                        weight: isSelected ? 3.5 : 2
                                    }}
                                    eventHandlers={{
                                        click: () => onSelectPlot && onSelectPlot(plot)
                                    }}
                                />
                            )}

                            {/* Render Custom Marker Icon */}
                            {lat && lng && (
                                <Marker
                                    position={[lat, lng]}
                                    icon={createCustomIcon(isSelected, hasSoldToday)}
                                    eventHandlers={{
                                        click: () => onSelectPlot && onSelectPlot(plot)
                                    }}
                                >
                                    <Popup className="custom-leaflet-popup">
                                        <div className="p-1 max-w-xs font-sans">
                                            <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                                                <span className="text-rubber-700 font-bold text-sm flex items-center space-x-1">
                                                    <MapPin size={16} />
                                                    <span>{plot.plotName || 'แปลงสวนยาง'}</span>
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                                                    {plot.deedType || 'น.ส.4'}
                                                </span>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="mb-2">
                                                {hasSoldToday ? (
                                                    <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-bold flex items-center justify-between">
                                                        <span className="flex items-center space-x-1">
                                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                                            <span>ขายวันนี้แล้ว</span>
                                                        </span>
                                                        <span>{plot.todayWeight} กก. ({plot.todayTotal?.toLocaleString()} ฿)</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-bold flex items-center space-x-1">
                                                        <Clock size={13} className="text-amber-600" />
                                                        <span>ยังไม่ได้ขายน้ำยางวันนี้</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1 text-xs text-gray-600 my-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-500">เจ้าของ:</span>
                                                    <span className="font-bold text-gray-800">{plot.farmerName || 'ไม่ระบุ'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-500">คนกรีด:</span>
                                                    <span className="font-bold text-emerald-700">{plot.employeeName || 'ไม่ระบุ'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-500">ส่วนแบ่งคนกรีด:</span>
                                                    <span className="font-bold text-blue-600">{plot.employeeId ? `${plot.profitSharePct ?? 50}%` : '0%'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-500">ขนาดพื้นที่:</span>
                                                    <span className="text-gray-700 font-medium">
                                                        {plot.rai || 0} ไร่ {plot.ngan || 0} งาน {plot.sqWah || 0} วา
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onQuickBuy && onQuickBuy(plot);
                                                }}
                                                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1 shadow-sm transition-all"
                                            >
                                                <Scale size={14} />
                                                <span>ทำรายการซื้อน้ำยาง</span>
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                        </React.Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default LandPlotMap;

import React from 'react';
import { 
    ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line 
} from 'recharts';
import { truncateOneDecimal } from '../../utils/calculations';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const DashboardCharts = ({ chartData, priceChartData }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">แนวโน้มการซื้อ-ขาย (7 วันย้อนหลัง)</h2>
                    <div className="h-72" style={{ minHeight: '288px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(value) => `฿${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`฿${Number(value).toLocaleString()}`, undefined]}
                                />
                                <Line type="monotone" dataKey="ซื้อ" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="ขาย" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Price Trend Chart 30 Days */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">แนวโน้มราคาน้ำยาง (30 วันย้อนหลัง)</h2>
                            <p className="text-xs text-gray-500">เปรียบเทียบราคารับซื้อเฉลี่ย และราคาส่งขายโรงงาน</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                <span className="text-xs font-medium text-gray-600">รับซื้อ</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                                <span className="text-xs font-medium text-gray-600">ขายส่ง</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-72" style={{ minHeight: '288px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={priceChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#9ca3af', fontSize: 10 }} 
                                    dy={10}
                                    interval={window.innerWidth < 768 ? 4 : 2}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#9ca3af', fontSize: 10 }} 
                                    dx={-10} 
                                    domain={['auto', 'auto']}
                                    tickFormatter={(value) => `฿${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                    formatter={(value) => [`฿${Number(value).toLocaleString()}`, undefined]}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#111827' }}
                                    cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="ราคาซื้อ" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    dot={{ r: 0 }} 
                                    activeDot={{ r: 6, strokeWidth: 0 }} 
                                    connectNulls
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="ราคาขาย" 
                                    stroke="#10b981" 
                                    strokeWidth={3} 
                                    dot={{ r: 0 }} 
                                    activeDot={{ r: 6, strokeWidth: 0 }} 
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;

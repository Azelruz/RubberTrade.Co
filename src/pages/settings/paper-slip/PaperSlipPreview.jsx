import React from 'react';
import { format, addYears } from 'date-fns';
import { Leaf, Sparkles } from 'lucide-react';

export const PaperSlipPreview = ({
    activePlatform,
    previewType,
    setPreviewType,
    activeSub,
    settings,
    mockData
}) => {
    return (
        <div className="lg:col-span-5 lg:sticky lg:top-8 bg-white/40 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
            {/* Preview Toggle (Latex/Cup Lump) - Only for dummy data selection */}
            <div className="mb-6 flex justify-center">
                <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-xl">
                    {['latex', 'cup_lump'].map(type => (
                        <button
                            key={type}
                            onClick={() => setPreviewType(type)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {type === 'latex' ? 'Preview: Latex' : 'Preview: Cup Lump'}
                        </button>
                    ))}
                </div>
            </div>

            {activePlatform === 'paper' ? (
                <div className="mx-auto w-[240px] bg-white shadow-2xl rounded-sm border border-gray-100 p-4 font-sans text-black leading-tight overflow-hidden animate-in slide-in-from-right-4 duration-500" style={{ transform: 'rotate(1deg)' }}>
                    {/* === PAPER PREVIEW: Header === */}
                    {activeSub.topNote && (
                        <div style={{ fontSize: `${activeSub.fontSizeTopNote || 7}px` }} className="text-center italic border-b border-black mb-1 pb-1">{activeSub.topNote}</div>
                    )}
                    <div className="text-center mb-3">
                        <div className="h-8 flex items-center justify-center mb-1">
                            {(activeSub.showLogo && settings.logoUrl) && (
                                <img src={settings.logoUrl} alt="Logo" className="h-full object-contain filter grayscale contrast-200" />
                            )}
                        </div>
                        {activeSub.showStoreName && <h1 style={{ fontSize: `${activeSub.fontSizeStoreName || 12}px` }} className="font-bold">{settings.factoryName}</h1>}
                        {activeSub.showAddress && <p style={{ fontSize: `${activeSub.fontSizeAddress || 7}px` }} className="leading-tight">{settings.address}</p>}
                        {activeSub.showPhone && <p style={{ fontSize: `${activeSub.fontSizePhone || 8}px` }} className="font-bold">โทร: {settings.phone}</p>}
                        {activeSub.showBillType && (
                            <div style={{ fontSize: `${activeSub.fontSizeHeaderTitle || 10}px` }} className="mt-2 font-bold border border-black inline-block px-3 py-0.5">
                                {activeSub.headerTitle}
                            </div>
                        )}
                    </div>

                    {/* === PAPER PREVIEW: Invoice Info === */}
                    <div className="mb-2 font-mono border-b border-black pb-1">
                        {activeSub.showBillId && (
                            <div className="flex justify-between" style={{ fontSize: `${activeSub.fontSizeBillIdValue || 8}px` }}>
                                <span style={{ fontSize: `${activeSub.fontSizeBillIdLabel || 7}px` }}>เลขที่:</span>
                                <span className="font-bold">{mockData.id}</span>
                            </div>
                        )}
                        {activeSub.showSelectedDate && (
                            <div className="flex justify-between" style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 8}px` }}>
                                <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                <span className="font-bold">{format(addYears(mockData.date, 543), 'dd/MM/yyyy')}</span>
                            </div>
                        )}
                        {activeSub.showRecordingTime && (
                            <div className="flex justify-between" style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 8}px` }}>
                                <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                <span className="font-bold">{format(addYears(mockData.date, 543), 'dd/MM/yyyy HH:mm')}</span>
                            </div>
                        )}
                    </div>

                    {/* === PAPER PREVIEW: Farmer === */}
                    {activeSub.showFarmerName && (
                        <div className="mb-2">
                            <div>
                                <span style={{ fontSize: `${activeSub.fontSizeFarmerNameLabel || 9}px` }}>ชื่อลูกค้า: </span>
                                <span style={{ fontSize: `${activeSub.fontSizeFarmerNameValue || 10}px` }} className="font-bold">{mockData.farmerName}</span>
                            </div>
                            {(activeSub.showFscCode && mockData.fscId) && (
                                <div className="text-gray-600 font-mono mt-0.5" style={{ fontSize: `${(activeSub.fontSizeFarmerNameValue || 10) - 2}px` }}>
                                    <span>{(activeSub.labels?.fscCode || 'รหัส FSC')}: </span>
                                    <span className="font-bold">{mockData.fscId}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === PAPER PREVIEW: Details === */}
                    <div className="border-t border-black border-dashed pt-2 space-y-1">
                        {activeSub.showPurchaseDetailsHeader !== false && (
                            <div className="text-center text-[10px] font-bold border-y border-black py-0.5 mb-2 uppercase">=== รายละเอียดรับซื้อ ===</div>
                        )}
                        {activeSub.showRawWeight && (
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: `${activeSub.fontSizeRawWeightLabel || 9}px` }}>{activeSub.labels.rawWeight}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeRawWeightValue || 10}px` }} className="font-bold">{mockData.weight.toFixed(1)} กก.</span>
                            </div>
                        )}
                        {activeSub.showBucketWeight && (
                            <div className="flex justify-between items-center italic opacity-70">
                                <span style={{ fontSize: `${activeSub.fontSizeBucketWeightLabel || 8}px` }}>{activeSub.labels.bucketWeight}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeBucketWeightValue || 8}px` }}>-{mockData.bucketWeight.toFixed(1)} กก.</span>
                            </div>
                        )}
                        {activeSub.showNetWeight && (
                            <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                                <span style={{ fontSize: `${activeSub.fontSizeNetWeightLabel || 9}px` }}>{activeSub.labels.netWeight}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeNetWeightValue || 11}px` }} className="font-bold">{mockData.netWeight.toFixed(1)} กก.</span>
                            </div>
                        )}
                        {activeSub.showDrc && (
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: `${activeSub.fontSizeDrcLabel || 9}px` }}>{activeSub.labels.drc}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeDrcValue || 10}px` }}>{mockData.drc.toFixed(1)}%</span>
                            </div>
                        )}
                        {activeSub.showDryWeight && (
                            <div className="flex justify-between items-center border-b border-black pb-1">
                                <span style={{ fontSize: `${activeSub.fontSizeDryWeightLabel || 9}px` }}>{activeSub.labels.dryWeight}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeDryWeightValue || 11}px` }} className="font-bold">{mockData.dryWeight.toFixed(1)} กก.</span>
                            </div>
                        )}

                        {/* === PAPER PREVIEW: Pricing === */}
                        <div className="my-1 border-t border-black border-dotted"></div>
                        {activeSub.showBasePrice && (
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: `${activeSub.fontSizeBasePriceLabel || 8}px` }}>{activeSub.labels.basePrice}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeBasePriceValue || 10}px` }}>{mockData.basePrice.toFixed(1)}/กก.</span>
                            </div>
                        )}
                        {activeSub.showBonusDrc && (
                            <div className="flex justify-between items-center text-black italic">
                                <span style={{ fontSize: `${activeSub.fontSizeBonusDrcLabel || 8}px` }}>{activeSub.labels.bonusDrc}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeBonusDrcValue || 8}px` }}>+{mockData.bonusDrc.toFixed(1)}</span>
                            </div>
                        )}
                        {activeSub.showActualPrice && (
                            <div className="flex justify-between items-center mt-1 border-t border-black pt-1">
                                <span style={{ fontSize: `${activeSub.fontSizeActualPriceLabel || 10}px` }} className="font-bold">{activeSub.labels.actualPrice}</span>
                                <span style={{ fontSize: `${activeSub.fontSizeActualPriceValue || 12}px` }} className="font-bold">{mockData.actualPrice.toFixed(1)}/กก.</span>
                            </div>
                        )}

                        {/* === PAPER PREVIEW: Splits === */}
                        {activeSub.showSplits && (
                            <div className="pt-2 mt-2 border-t-2 border-black space-y-0.5">
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitLabel || 9}px` }} className="font-bold">{activeSub.labels.farmerSplit} ({100 - mockData.empPct}%)</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitValue || 11}px` }} className="font-bold">฿{Math.floor(mockData.farmerTotal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center opacity-70">
                                    <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitLabel || 8}px` }}>{activeSub.labels.employeeSplit} ({mockData.empPct}%)</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitValue || 9}px` }}>฿{Math.floor(mockData.employeeTotal).toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* === PAPER PREVIEW: Extra & Footer === */}
                    {activeSub.extraMessage && (
                        <div style={{ fontSize: `${activeSub.fontSizeExtraMessage || 7}px` }} className="mt-4 text-center border border-black p-1 italic line-clamp-2">
                            {activeSub.extraMessage}
                        </div>
                    )}
                    <div className="border-t-4 border-double border-black py-1 mt-3">
                        <div className="flex justify-between items-center">
                            <span style={{ fontSize: `${activeSub.fontSizeTotalLabel || 9}px` }} className="font-bold uppercase">ยอดรวมสุทธิ</span>
                            <span style={{ fontSize: `${activeSub.fontSizeTotalValue || 16}px` }} className="font-bold">฿{Math.floor(mockData.total).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="text-center mt-2 border-t border-black pt-1">
                        <p style={{ fontSize: `${activeSub.fontSizeFooterText || 8}px` }} className="font-bold">{activeSub.footerText}</p>
                    </div>
                </div>
            ) : (
                /* ======= E-SLIP PREVIEW ======= */
                <div className="mx-auto w-[240px] bg-white rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in duration-500">
                    {/* === ESLIP PREVIEW: Header === */}
                    <div className="bg-[#2d5a3f] py-4 px-3 text-center text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                        <div className="h-10 flex items-center justify-center mb-1">
                            {(activeSub.showLogo && settings.logoUrl) && (
                                <img src={settings.logoUrl} alt="Logo" className="h-full object-contain" />
                            )}
                        </div>
                        {activeSub.showStoreName && <h1 style={{ fontSize: `${activeSub.fontSizeStoreName || 14}px` }} className="font-black">{settings.factoryName}</h1>}
                        {(activeSub.showAddress || activeSub.showPhone) && (
                            <p className="opacity-70 font-medium mb-2">
                                {activeSub.showAddress && <span style={{ fontSize: `${activeSub.fontSizeAddress || 8}px` }}>{settings.address}</span>}
                                {activeSub.showPhone && <span style={{ fontSize: `${activeSub.fontSizePhone || 9}px` }} className="ml-1">โทร: {settings.phone}</span>}
                            </p>
                        )}
                        {activeSub.showBillType && (
                            <div style={{ fontSize: `${activeSub.fontSizeHeaderTitle || 8}px` }} className="mt-1 font-black bg-white/20 px-4 py-1 rounded-full border border-white/10 uppercase tracking-widest inline-block">
                                {activeSub.headerTitle}
                            </div>
                        )}
                        {activeSub.topNote && (
                            <div style={{ fontSize: `${activeSub.fontSizeTopNote || 7}px` }} className="mt-1 font-black bg-yellow-400 text-black px-2 py-0.5 rounded-full inline-block">{activeSub.topNote}</div>
                        )}
                    </div>

                    <div className="px-3 pt-3 pb-3">
                        {/* === ESLIP PREVIEW: Invoice Info === */}
                        {(activeSub.showBillId || activeSub.showSelectedDate || activeSub.showRecordingTime) && (
                            <div className="flex flex-col mb-2 font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg gap-0.5">
                                {activeSub.showBillId && (
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-0.5 mb-0.5">
                                        <span style={{ fontSize: `${activeSub.fontSizeBillIdLabel || 7}px` }}>ID:</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeBillIdValue || 7}px` }} className="text-gray-700">{mockData.id}</span>
                                    </div>
                                )}
                                {activeSub.showSelectedDate && (
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 7}px` }} className="text-gray-700">{format(addYears(mockData.date, 543), 'dd MMM yy')}</span>
                                    </div>
                                )}
                                {activeSub.showRecordingTime && (
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 7}px` }} className="text-gray-700">{format(addYears(mockData.date, 543), 'dd MMM yy HH:mm')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === ESLIP PREVIEW: Farmer === */}
                        {activeSub.showFarmerName && (
                            <div className="mb-2 pb-2 border-b border-dotted border-gray-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p style={{ fontSize: `${activeSub.fontSizeFarmerNameLabel || 6}px` }} className="font-bold text-gray-400 uppercase">ข้อมูลลูกค้า</p>
                                        <h2 style={{ fontSize: `${activeSub.fontSizeFarmerNameValue || 16}px` }} className="font-black text-gray-800 leading-tight">{mockData.farmerName}</h2>
                                    </div>
                                    {(activeSub.showFscCode && mockData.fscId) && (
                                        <div className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-mono text-[9px] font-black flex items-center gap-1 shrink-0 mt-1">
                                            <Leaf size={10} className="text-amber-600" />
                                            <span>{mockData.fscId}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* === ESLIP PREVIEW: Details Grid === */}
                        <div className="space-y-1.5 mb-2">
                            {activeSub.showPurchaseDetailsHeader !== false && (
                                <p style={{ fontSize: `${(activeSub.fontSizeLabel || 9) - 3}px` }} className="font-black text-gray-400 mb-1 uppercase tracking-widest text-center">=== รายละเอียดรับซื้อ ===</p>
                            )}
                            <div className="grid grid-cols-2 gap-1.5">
                                {activeSub.showRawWeight && (
                                    <div className="p-1.5 bg-gray-50 rounded-lg">
                                        <p style={{ fontSize: `${activeSub.fontSizeRawWeightLabel || 6}px` }} className="font-bold text-gray-400 uppercase">{activeSub.labels.rawWeight}</p>
                                        <p style={{ fontSize: `${activeSub.fontSizeRawWeightValue || 11}px` }} className="font-black text-gray-800">{mockData.weight.toFixed(1)} <span className="text-[6px]">กก.</span></p>
                                    </div>
                                )}
                                {activeSub.showDrc && (
                                    <div className="p-1.5 bg-rubber-50 rounded-lg">
                                        <p style={{ fontSize: `${activeSub.fontSizeDrcLabel || 6}px` }} className="font-bold text-rubber-400 uppercase">{activeSub.labels.drc}</p>
                                        <p style={{ fontSize: `${activeSub.fontSizeDrcValue || 11}px` }} className="font-black text-rubber-700">{mockData.drc.toFixed(1)}%</p>
                                    </div>
                                )}
                            </div>
                            {activeSub.showBucketWeight && (
                                <div className="flex justify-between items-center px-1">
                                    <span style={{ fontSize: `${activeSub.fontSizeBucketWeightLabel || 8}px` }} className="font-bold text-red-400">{activeSub.labels.bucketWeight}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeBucketWeightValue || 8}px` }} className="font-bold text-red-500">-{mockData.bucketWeight.toFixed(1)} กก.</span>
                                </div>
                            )}
                            {activeSub.showNetWeight && (
                                <div className="flex justify-between items-center px-1 font-bold">
                                    <span style={{ fontSize: `${activeSub.fontSizeNetWeightLabel || 9}px` }} className="text-gray-600">{activeSub.labels.netWeight}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeNetWeightValue || 10}px` }} className="text-gray-900">{mockData.netWeight.toFixed(1)} กก.</span>
                                </div>
                            )}
                            {activeSub.showDryWeight && (
                                <div className="flex justify-between items-center bg-gray-800 p-1.5 rounded-lg text-white">
                                    <span style={{ fontSize: `${activeSub.fontSizeDryWeightLabel || 8}px` }} className="font-bold uppercase tracking-wider">{activeSub.labels.dryWeight}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeDryWeightValue || 13}px` }} className="font-black tracking-tighter">{mockData.dryWeight.toFixed(1)} <span className="text-[7px] opacity-60">KG.</span></span>
                                </div>
                            )}
                        </div>

                        {/* === ESLIP PREVIEW: Pricing === */}
                        <div className="space-y-0.5 mb-2">
                            {activeSub.showBasePrice && (
                                <div className="flex justify-between items-center px-1">
                                    <span style={{ fontSize: `${activeSub.fontSizeBasePriceLabel || 8}px` }} className="font-bold text-gray-400">{activeSub.labels.basePrice}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeBasePriceValue || 9}px` }} className="font-bold text-gray-800">฿{mockData.basePrice.toFixed(1)}/กก.</span>
                                </div>
                            )}
                            {activeSub.showBonusDrc && (
                                <div className="flex justify-between items-center px-1">
                                    <span style={{ fontSize: `${activeSub.fontSizeBonusDrcLabel || 8}px` }} className="font-bold text-gray-400">{activeSub.labels.bonusDrc}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeBonusDrcValue || 8}px` }} className="font-bold text-green-600">+฿{mockData.bonusDrc.toFixed(1)}/กก.</span>
                                </div>
                            )}
                            {activeSub.showBonusFsc && (
                                <div className="flex justify-between items-center px-1">
                                    <span style={{ fontSize: `${activeSub.fontSizeBonusFscLabel || 8}px` }} className="font-bold text-gray-400">{activeSub.labels.bonusFsc}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeBonusFscValue || 8}px` }} className="font-bold text-amber-600">+฿{mockData.bonusFsc.toFixed(1)}/กก.</span>
                                </div>
                            )}
                            {activeSub.showBonusMember && (
                                <div className="flex justify-between items-center px-1 py-0.5 bg-rubber-50 rounded">
                                    <span style={{ fontSize: `${activeSub.fontSizeBonusMemberLabel || 8}px` }} className="font-black text-rubber-700">{activeSub.labels.bonusMember}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeBonusMemberValue || 8}px` }} className="font-black text-rubber-700">+฿{mockData.bonusMember.toFixed(1)}/กก.</span>
                                </div>
                            )}
                            {activeSub.showActualPrice && (
                                <div className="flex justify-between items-center px-1 pt-1 border-t border-dotted border-gray-200">
                                    <span style={{ fontSize: `${activeSub.fontSizeActualPriceLabel || 9}px` }} className="font-black text-gray-800">{activeSub.labels.actualPrice}</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeActualPriceValue || 10}px` }} className="font-black text-gray-900">฿{mockData.actualPrice.toFixed(1)}/กก.</span>
                                </div>
                            )}
                        </div>

                        {/* === ESLIP PREVIEW: Splits === */}
                        {activeSub.showSplits && (
                            <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 space-y-1 mb-2">
                                <p style={{ fontSize: `${(activeSub.fontSizeFarmerSplitLabel || 9) - 3}px` }} className="font-black text-rubber-600 uppercase tracking-widest">การจัดสรรเงิน</p>
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitLabel || 9}px` }} className="font-bold text-orange-400">{activeSub.labels.farmerSplit} ({100 - mockData.empPct}%)</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitValue || 9}px` }} className="font-black text-[#5ba2d7]">฿{Math.floor(mockData.farmerTotal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitLabel || 9}px` }} className="font-bold text-purple-400">{activeSub.labels.employeeSplit} ({mockData.empPct}%)</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitValue || 9}px` }} className="font-black text-purple-500">฿{Math.floor(mockData.employeeTotal).toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        {/* === ESLIP PREVIEW: Extra === */}
                        {activeSub.extraMessage && (
                            <div style={{ fontSize: `${activeSub.fontSizeExtraMessage || 7}px` }} className="p-2 bg-gray-50 rounded-xl text-gray-500 italic border border-gray-100 leading-relaxed mb-2">
                                {activeSub.extraMessage}
                            </div>
                        )}
                    </div>

                    {/* === ESLIP PREVIEW: Total Footer === */}
                    <div className="bg-[#2d5a3f] p-3 flex justify-between items-center text-white">
                        <span style={{ fontSize: `${activeSub.fontSizeTotalLabel || 10}px` }} className="font-black uppercase tracking-widest">ยอดรวมจ่าย</span>
                        <div className="text-right">
                            <span style={{ fontSize: `${activeSub.fontSizeTotalValue || 24}px` }} className="font-black leading-none tabular-nums tracking-tighter block">
                                ฿{Math.floor(mockData.total).toLocaleString()}
                            </span>
                            <span style={{ fontSize: `${activeSub.fontSizeFooterText || 7}px` }} className="opacity-60 font-medium">{activeSub.footerText}</span>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-8 text-center px-12">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-rubber-50 rounded-full border border-rubber-100 shadow-sm shadow-rubber-100/30">
                    <Sparkles size={14} className="text-rubber-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-rubber-600 uppercase tracking-[0.2em]">Real-time Digital Twin</span>
                </div>
            </div>
        </div>
    );
};

export default PaperSlipPreview;

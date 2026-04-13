import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const SellPaperReceipt = ({ printingRecord, printRef, settings }) => {
    if (!printingRecord) return null;

    const isCupLump = printingRecord.rubberType === 'cup_lump';
    const dryRubber = Number(printingRecord.dryWeight || printingRecord.dryRubber || 0);

    return (
        <div style={{ display: 'none' }}>
            <div ref={printRef} className="receipt-content">
                <div style={{ textAlign: 'center', marginBottom: '4mm', borderBottom: '1px dashed #000', paddingBottom: '2mm' }}>
                    <h2 style={{ margin: '0', fontSize: '4.5mm', fontWeight: 'bold' }}>{settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}</h2>
                    <p style={{ margin: '1mm 0', fontSize: '3mm' }}>{settings.address || '-'}</p>
                    <p style={{ margin: '0', fontSize: '3mm' }}>โทร: {settings.phone || '-'}</p>
                    <div style={{ 
                        marginTop: '2mm', 
                        padding: '1mm', 
                        border: '1.5px solid #000', 
                        display: 'inline-block', 
                        fontSize: '3.5mm', 
                        fontWeight: 'bold',
                        borderRadius: '0.5mm'
                    }}>
                        ใบส่งสินค้า / DELIVERY NOTE
                    </div>
                </div>

                <div style={{ fontSize: '3.2mm', marginBottom: '3mm', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>วันที่:</span>
                        <span style={{ fontWeight: 'bold' }}>{format(new Date(printingRecord.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>เลขที่:</span>
                        <span style={{ fontWeight: 'bold' }}>SELL-{printingRecord.id?.toString().slice(-6).toUpperCase()}</span>
                    </div>
                    <div style={{ borderBottom: '0.5px solid #eee', margin: '1mm 0' }}></div>
                    <div>ผู้ซื้อ: <span style={{ fontWeight: 'bold' }}>{printingRecord.buyerName}</span></div>
                    {printingRecord.truckInfo && <div>ทะเบียนรถ: <span style={{ fontWeight: 'bold' }}>{printingRecord.truckInfo}</span></div>}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '3.2mm', marginBottom: '3mm' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                            <th style={{ textAlign: 'left', padding: '1mm 0' }}>รายการ</th>
                            <th style={{ textAlign: 'right', padding: '1mm 0' }}>จำนวน</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '1.5mm 0' }}>
                                <div>{isCupLump ? 'ขี้ยางพารา' : 'น้ำยางพารา'}</div>
                                {!isCupLump && <div style={{ fontSize: '2.8mm', color: '#666' }}>DRC: {Number(printingRecord.drc).toFixed(2)}%</div>}
                            </td>
                            <td style={{ textAlign: 'right', padding: '1.5mm 0' }}>
                                <div style={{ fontWeight: 'bold' }}>{Number(printingRecord.weight).toLocaleString()} <span style={{ fontSize: '2.5mm' }}>กก.</span></div>
                                {!isCupLump && <div style={{ fontSize: '2.8mm' }}>แห้ง: {dryRubber.toLocaleString()}</div>}
                            </td>
                        </tr>
                        {Number(printingRecord.lossWeight) !== 0 && (
                            <tr>
                                <td style={{ padding: '0.5mm 0', fontSize: '2.8mm', fontStyle: 'italic' }}>
                                    {Number(printingRecord.lossWeight) > 0 ? 'ปรับปรุงสต๊อก (เพิ่ม)' : 'ส่วนต่าง/สูญเสีย'}
                                </td>
                                <td style={{ textAlign: 'right', padding: '0.5mm 0', fontSize: '2.8mm' }}>
                                    {Number(printingRecord.lossWeight) > 0 ? '+' : '-'} {Math.abs(Number(printingRecord.lossWeight))} กก.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div style={{ 
                    borderTop: '1px solid #000', 
                    paddingTop: '2mm', 
                    fontSize: '4mm', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '4mm'
                }}>
                    <span>น้ำหนักสุทธิ:</span>
                    <span>{dryRubber.toLocaleString()} {isCupLump ? 'กก.' : 'กก.แห้ง'}</span>
                </div>

                {printingRecord.note && (
                    <div style={{ fontSize: '2.8mm', fontStyle: 'italic', marginBottom: '4mm', padding: '1mm', backgroundColor: '#f9f9f9', borderRadius: '0.5mm' }}>
                        หมายเหตุ: {printingRecord.note}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6mm', fontSize: '3mm' }}>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                        <div style={{ borderBottom: '1px solid #000', height: '8mm' }}></div>
                        <div style={{ marginTop: '1mm' }}>ผู้ส่งของ</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                        <div style={{ borderBottom: '1px solid #000', height: '8mm' }}></div>
                        <div style={{ marginTop: '1mm' }}>ผู้รับของ</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '6mm', fontSize: '2.5mm', color: '#999', borderTop: '0.5px solid #eee', paddingTop: '1mm' }}>
                    พิมพ์เมื่อ: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: th })}
                </div>
            </div>
        </div>
    );
};

export default SellPaperReceipt;

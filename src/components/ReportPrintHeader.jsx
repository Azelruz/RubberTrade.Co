import React from 'react';

export const ReportPrintHeader = ({ settings = {}, title, subtitle }) => {
    const storeName = settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา';
    const address = settings.address || '';
    const phone = settings.phone || '';

    return (
        <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h1 className="text-2xl font-bold">{storeName}</h1>
            {address && <p className="text-xs">{address}</p>}
            {phone && <p className="text-xs">โทร: {phone}</p>}
            <h2 className="text-lg font-bold mt-2 underline">{title}</h2>
            {subtitle && <p className="text-xs mt-1 font-semibold">{subtitle}</p>}
        </div>
    );
};

export default ReportPrintHeader;

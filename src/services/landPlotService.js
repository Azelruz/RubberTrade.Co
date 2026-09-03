import { offlineRead, offlineWrite, fetchAPI } from './apiService';
import { db } from './db';

// Read land plots with offline support
export const fetchLandPlots = async (params = {}) => {
    try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/land_plots?${query}` : '/land_plots';
        return await offlineRead('land_plots', endpoint);
    } catch (error) {
        console.error('Error fetching land plots:', error);
        return [];
    }
};

// Add a new land plot
export const addLandPlot = async (plotData) => {
    const id = plotData.id || `plot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const payload = {
        id,
        farmerId: plotData.farmerId,
        employeeId: plotData.employeeId || null,
        plotName: plotData.plotName || 'แปลงสวนยาง',
        deedNumber: plotData.deedNumber || '',
        deedType: plotData.deedType || 'น.ส.4',
        rai: parseFloat(plotData.rai) || 0,
        ngan: parseFloat(plotData.ngan) || 0,
        sqWah: parseFloat(plotData.sqWah) || 0,
        geojson: typeof plotData.geojson === 'object' ? JSON.stringify(plotData.geojson) : (plotData.geojson || ''),
        lat: parseFloat(plotData.lat) || null,
        lng: parseFloat(plotData.lng) || null,
        note: plotData.note || '',
        created_at: new Date().toISOString()
    };

    return await offlineWrite('land_plots', '/land_plots', payload, 'POST');
};

// Update an existing land plot
export const updateLandPlot = async (id, plotData) => {
    const payload = {
        ...plotData,
        id,
        rai: parseFloat(plotData.rai) || 0,
        ngan: parseFloat(plotData.ngan) || 0,
        sqWah: parseFloat(plotData.sqWah) || 0,
        lat: parseFloat(plotData.lat) || null,
        lng: parseFloat(plotData.lng) || null,
        updated_at: new Date().toISOString()
    };

    return await offlineWrite('land_plots', '/land_plots', payload, 'POST');
};

// Delete a land plot
export const deleteLandPlot = async (id) => {
    if (navigator.onLine) {
        try {
            await fetchAPI(`/land_plots?id=${id}`, { method: 'DELETE' });
            await db.land_plots.delete(id);
            return true;
        } catch (err) {
            console.warn('Network call failed, deleting land plot offline:', err);
        }
    }

    await db.land_plots.delete(id);
    await db.sync_queue.add({
        type: 'land_plots',
        action: 'DELETE',
        payload: { id },
        status: 'pending',
        createdAt: Date.now(),
        uuid: crypto.randomUUID()
    });
    return true;
};

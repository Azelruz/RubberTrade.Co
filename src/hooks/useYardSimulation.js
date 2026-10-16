import { useState, useEffect, useCallback, useRef } from 'react';

export const SIMULATION_STATES = {
    IDLE: 'IDLE',
    TRUCK_INBOUND: 'TRUCK_INBOUND',       // S2: รถเคลื่อนเข้าแท่นชั่ง
    WEIGHING_SCALE: 'WEIGHING_SCALE',     // S3: ไฟเขียวติด ชั่งน้ำหนัก
    DRC_SAMPLING: 'DRC_SAMPLING',         // S4: สุ่มตรวจ % DRC
    TRANSFER_PAYLOAD: 'TRANSFER_PAYLOAD', // S5: ปั๊มน้ำยางเข้า Silo / เทก้อนยาง
    SETTLEMENT_SLIP: 'SETTLEMENT_SLIP',   // S6: บิลพิมพ์ลอยขึ้น + สรุปยอดเงิน
    TRUCK_OUTBOUND: 'TRUCK_OUTBOUND',     // S7: รถเลี้ยวออกจากสถานี
    METRICS_SYNC: 'METRICS_SYNC'          // S8: อัปเดตตัวเลข KPI บน Dashboard
};

export const useYardSimulation = () => {
    const [simState, setSimState] = useState(SIMULATION_STATES.IDLE);
    const [activeJob, setActiveJob] = useState(null);
    const [history, setHistory] = useState([]);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
    const timerRef = useRef(null);

    const clearCurrentTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const runSimulationSequence = useCallback((job) => {
        if (!job) return;
        clearCurrentTimer();
        setActiveJob(job);

        // Timeline Step 1: TRUCK_INBOUND (0ms -> 700ms)
        setSimState(SIMULATION_STATES.TRUCK_INBOUND);

        timerRef.current = setTimeout(() => {
            // Step 2: WEIGHING_SCALE
            setSimState(SIMULATION_STATES.WEIGHING_SCALE);

            timerRef.current = setTimeout(() => {
                // Step 3: DRC_SAMPLING (if latex) or directly to TRANSFER_PAYLOAD
                if (job.rubberType === 'latex') {
                    setSimState(SIMULATION_STATES.DRC_SAMPLING);

                    timerRef.current = setTimeout(() => {
                        // Step 4: TRANSFER_PAYLOAD
                        setSimState(SIMULATION_STATES.TRANSFER_PAYLOAD);
                        proceedAfterTransfer(job);
                    }, 600);
                } else {
                    setSimState(SIMULATION_STATES.TRANSFER_PAYLOAD);
                    proceedAfterTransfer(job);
                }
            }, 700);
        }, 700);

        function proceedAfterTransfer(currentJob) {
            timerRef.current = setTimeout(() => {
                // Step 5: SETTLEMENT_SLIP
                setSimState(SIMULATION_STATES.SETTLEMENT_SLIP);

                timerRef.current = setTimeout(() => {
                    // Step 6: TRUCK_OUTBOUND
                    setSimState(SIMULATION_STATES.TRUCK_OUTBOUND);

                    timerRef.current = setTimeout(() => {
                        // Step 7: METRICS_SYNC
                        setSimState(SIMULATION_STATES.METRICS_SYNC);
                        setHistory(prev => [currentJob, ...prev.slice(0, 9)]);
                        window.dispatchEvent(new Event('dashboard-refresh'));

                        timerRef.current = setTimeout(() => {
                            // Back to IDLE
                            setSimState(SIMULATION_STATES.IDLE);
                            setActiveJob(null);
                        }, 500);
                    }, 700);
                }, 900);
            }, 1000);
        }
    }, []);

    // Listen for real bill events
    useEffect(() => {
        const handler = (e) => {
            if (e.detail && autoPlayEnabled) {
                runSimulationSequence(e.detail);
            }
        };
        window.addEventListener('yard-simulation-trigger', handler);
        return () => {
            window.removeEventListener('yard-simulation-trigger', handler);
            clearCurrentTimer();
        };
    }, [runSimulationSequence, autoPlayEnabled]);

    // Skip current animation
    const skipSimulation = useCallback(() => {
        clearCurrentTimer();
        if (activeJob) {
            setHistory(prev => [activeJob, ...prev.slice(0, 9)]);
        }
        setSimState(SIMULATION_STATES.IDLE);
        setActiveJob(null);
        window.dispatchEvent(new Event('dashboard-refresh'));
    }, [activeJob]);

    // Manual test trigger for testing the 3D scene anytime
    const triggerDemoSimulation = useCallback((customType = 'latex') => {
        const demoJob = {
            id: `DEMO-${Date.now().toString().slice(-4)}`,
            farmerName: customType === 'latex' ? 'นายบุญส่ง สวนยางสวรรค์' : 'นางสมศรี ยางก้อนเงินล้าน',
            rubberType: customType,
            weight: customType === 'latex' ? 485.5 : 320.0,
            netWeight: customType === 'latex' ? 165.1 : 320.0,
            drc: customType === 'latex' ? 34.0 : 0,
            totalPrice: customType === 'latex' ? 12870 : 8960,
            station: Math.random() > 0.5 ? 'Station 1' : 'Station 2',
            licensePlate: 'กข-8899 สุราษฎร์ธานี',
            timestamp: Date.now()
        };
        runSimulationSequence(demoJob);
    }, [runSimulationSequence]);

    return {
        simState,
        activeJob,
        history,
        isSimulating: simState !== SIMULATION_STATES.IDLE,
        skipSimulation,
        triggerDemoSimulation,
        autoPlayEnabled,
        setAutoPlayEnabled
    };
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
    ArrowLeft,
    Eye,
    Settings as SettingsIcon,
    FileText,
    RefreshCw,
    Play,
    Square,
    Video
} from 'lucide-react';
import { fetchDashboardData, fetchBuyRecords, getSettings } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { truncateOneDecimal } from '../utils/calculations';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

const DEMO_FARMERS = [
    'ลุงหมาย สวนยางใต้',
    'พี่พงษ์ ท่าช้าง',
    'น้าศักดิ์ ควนเนียง',
    'ป้าศรี นาหม่อม',
    'บ่าววี รัตภูมิ',
    'โกชัย หาดใหญ่',
    'ลุงดำ คลองหอยโข่ง'
];

export const Dashboard3D = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const containerRef = useRef(null);
    const labelsContainerRef = useRef(null);

    const [storeName, setStoreName] = useState(
        user?.storeName || user?.store_name || user?.username || 'ลานรับซื้อน้ำยางสด'
    );
    const [dataMode, setDataMode] = useState('live'); // 'live' | 'demo'
    const [realBills, setRealBills] = useState([]);
    const [syncingData, setSyncingData] = useState(false);
    const [autoFollowCam, setAutoFollowCam] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState('none');

    // Simulation & Real Telemetry State
    const [simState, setSimState] = useState({
        autoMode: false, // In Live mode, do NOT auto-loop fake animations
        isPlayingAnim: false,
        speed: 1,
        step: 0, // 0 = Live Standby (Ready)
        rubberPrice: 0,
        cupLumpPrice: 0,
        todayLatexWeight: 0,
        todayTotalDryWeight: 0,
        todayAvgDrc: 0,
        todayLatexBuy: 0,
        pitVolume: 0,
        pitMax: 500,
        truckVolume: 0,
        truckMax: 3000,
        farmerCount: 0,
        trucksDispatched: 0,
        totalMoneyPaid: 0,
        currentTicket: {
            id: '-',
            farmerName: 'รอรายการรับซื้อวันนี้',
            freshVolume: 0,
            drcPercent: 0,
            dryWeight: 0,
            totalBaht: 0,
            timeStr: '-',
            isReal: true
        },
        actionText: 'กำลังซิงค์ข้อมูลจริงจากระบบ...',
        pitChemStatus: 'พร้อมรับน้ำยางสด',
        showLabels: true,
        waitingManual: false
    });

    // Mutable ref for 60FPS animation loop access
    const simRef = useRef({
        dataMode: 'live',
        autoMode: false,
        isPlayingAnim: false,
        speed: 1,
        step: 0,
        stepProgress: 0,
        waitingManual: false,
        nextQueuedStep: 1,
        storeName: user?.storeName || user?.store_name || user?.username || 'ลานรับซื้อน้ำยางสด',
        rubberPrice: 0,
        cupLumpPrice: 0,
        todayLatexWeight: 0,
        todayTotalDryWeight: 0,
        todayAvgDrc: 0,
        todayLatexBuy: 0,
        pitVolume: 0,
        pitMax: 500,
        truckVolume: 0,
        truckMax: 3000,
        farmerCount: 0,
        trucksDispatched: 0,
        totalMoneyPaid: 0,
        // Locked snapshot of real DB figures so Live Mode never drifts
        realMetrics: {
            rubberPrice: 0,
            cupLumpPrice: 0,
            todayLatexWeight: 0,
            todayTotalDryWeight: 0,
            todayAvgDrc: 0,
            todayLatexBuy: 0,
            totalMoneyPaid: 0,
            farmerCount: 0,
            pitVolume: 0,
            truckVolume: 0,
            trucksDispatched: 0,
            latestTicket: null
        },
        autoFollowCam: false,
        realBills: [],
        realBillCursor: 0,
        queuedRealTicket: null,
        currentTicket: {
            id: '-',
            farmerName: 'รอรายการรับซื้อวันนี้',
            freshVolume: 0,
            drcPercent: 0,
            dryWeight: 0,
            totalBaht: 0,
            timeStr: '-',
            isReal: true
        }
    });

    const threeRefs = useRef({
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        animFrame: null,
        clock: new THREE.Clock(),
        labels3D: [],
        camAnim: null,
        actors: {},
        updateSignboard: null,
        updateVisualGauges: null,
        setStandbyPose: null,
        startStepOne: null
    });

    // Sync React state from mutable ref
    const syncReactState = useCallback((extra = {}) => {
        const s = simRef.current;
        setSimState(prev => ({
            ...prev,
            autoMode: s.autoMode,
            isPlayingAnim: s.isPlayingAnim,
            speed: s.speed,
            step: s.step,
            rubberPrice: s.rubberPrice,
            cupLumpPrice: s.cupLumpPrice,
            todayLatexWeight: s.todayLatexWeight,
            todayTotalDryWeight: s.todayTotalDryWeight,
            todayAvgDrc: s.todayAvgDrc,
            todayLatexBuy: s.todayLatexBuy,
            pitVolume: s.pitVolume,
            truckVolume: s.truckVolume,
            farmerCount: s.farmerCount,
            trucksDispatched: s.trucksDispatched,
            totalMoneyPaid: s.totalMoneyPaid,
            currentTicket: { ...s.currentTicket },
            waitingManual: s.waitingManual,
            ...extra
        }));
    }, []);

    // -------------------------------------------------------------------------
    // LOAD REAL SYSTEM DATA (100% MATCHING src/pages/Dashboard.jsx)
    // -------------------------------------------------------------------------
    const loadRealSystemData = useCallback(
        async (silent = false) => {
            if (!silent) setSyncingData(true);
            try {
                const [dashData, settingsRes, fullBuys] = await Promise.all([
                    fetchDashboardData(silent),
                    getSettings(),
                    fetchBuyRecords()
                ]);

                // 1. Store Name (Matching GeneralSettings.jsx & Dashboard.jsx)
                const resolvedStoreName =
                    settingsRes?.data?.factoryName ||
                    dashData?.settings?.factoryName ||
                    settingsRes?.factoryName ||
                    user?.storeName ||
                    user?.store_name ||
                    user?.username ||
                    'ลานรับซื้อน้ำยางสด';

                setStoreName(resolvedStoreName);
                simRef.current.storeName = resolvedStoreName;

                // 2. Daily Price (Matching Dashboard.jsx lines 204-205 & 344-345)
                const dailyPrice = Number(
                    dashData?.dailyPrice?.price ??
                        dashData?.settings?.daily_price ??
                        (typeof dashData?.dailyPrice === 'number' ? dashData.dailyPrice : 0)
                );
                const cupLumpPrice = Number(
                    dashData?.dailyPrice?.cupLumpPrice ?? dashData?.settings?.cupLumpPrice ?? 0
                );

                // 3. Filter Today's Buy Records (Exact same logic as Dashboard.jsx lines 156-186 & 290-324)
                const today = new Date();
                const todayStr = format(today, 'yyyy-MM-dd');
                const todayRange = { start: startOfDay(today), end: endOfDay(today) };
                const dashBuys = Array.isArray(dashData?.buys) ? dashData.buys : [];
                const buysToCalc = Array.isArray(fullBuys) && fullBuys.length > 0 ? fullBuys : dashBuys;

                const isTodayRecord = (b) => {
                    if (!b) return false;
                    if (b.date === todayStr || (typeof b.date === 'string' && b.date.startsWith(todayStr))) {
                        return true;
                    }
                    if (b.date && !isNaN(new Date(b.date).getTime())) {
                        return isWithinInterval(new Date(b.date), todayRange);
                    }
                    return false;
                };

                const isLatexType = (b) => {
                    if (!b) return false;
                    const type = b.rubberType || 'latex';
                    return type === 'latex' || type === 'น้ำยางสด' || type === '';
                };

                const getRecordNetWeight = (item) => {
                    const net = Number(item.netWeight);
                    if (!isNaN(net) && net > 0) return net;
                    return Math.max(0, Number(item.weight || 0) - Number(item.bucketWeight || 0));
                };

                const getRecordDryWeight = (item) => {
                    if (
                        item.dryRubber !== undefined &&
                        item.dryRubber !== null &&
                        item.dryRubber !== '' &&
                        Number(item.dryRubber) !== 0
                    ) {
                        return Number(item.dryRubber);
                    }
                    if (
                        item.dryWeight !== undefined &&
                        item.dryWeight !== null &&
                        item.dryWeight !== '' &&
                        Number(item.dryWeight) !== 0
                    ) {
                        return Number(item.dryWeight);
                    }
                    const net = getRecordNetWeight(item);
                    const drc = Number(item.drc || 0);
                    return (net * drc) / 100;
                };

                const todayBuys = buysToCalc.filter(isTodayRecord);
                const todayLatexBuys = todayBuys.filter(isLatexType);

                // Sort newest first
                const sortedTodayLatexBuys = [...todayLatexBuys].sort(
                    (a, b) =>
                        new Date(b.timestamp || b.created_at || b.date || 0) -
                        new Date(a.timestamp || a.created_at || a.date || 0)
                );

                const localLatexWeight = todayLatexBuys.reduce((sum, item) => sum + getRecordNetWeight(item), 0);
                const localDryWeightTotal = todayLatexBuys.reduce((sum, item) => sum + getRecordDryWeight(item), 0);
                const localLatexBuyTotal = todayLatexBuys.reduce((sum, item) => sum + Number(item.total || 0), 0);
                const localAllBuyTotal = todayBuys.reduce((sum, item) => sum + Number(item.total || 0), 0);

                const serverStats = dashData?.stats;

                const finalTodayLatexWeight = truncateOneDecimal(
                    serverStats?.todayLatexWeight !== undefined ? Number(serverStats.todayLatexWeight) : localLatexWeight
                );

                const finalTodayDryWeight = truncateOneDecimal(
                    localDryWeightTotal > 0
                        ? localDryWeightTotal
                        : Number(serverStats?.todayTotalDryWeight || 0)
                );

                const finalTodayAvgDrc =
                    serverStats?.todayAvgDrc !== undefined && Number(serverStats.todayAvgDrc) > 0
                        ? truncateOneDecimal(Number(serverStats.todayAvgDrc))
                        : finalTodayLatexWeight > 0
                        ? truncateOneDecimal((finalTodayDryWeight / finalTodayLatexWeight) * 100)
                        : 0;

                const finalTodayLatexBuy = truncateOneDecimal(
                    serverStats?.todayLatexBuy !== undefined ? Number(serverStats.todayLatexBuy) : localLatexBuyTotal
                );

                const finalTodayBuy = truncateOneDecimal(
                    serverStats?.todayBuy !== undefined ? Number(serverStats.todayBuy) : localAllBuyTotal
                );

                // Pit (500L) & Tanker (3,000L) real levels derived strictly from finalTodayLatexWeight
                const realPitVol = truncateOneDecimal(finalTodayLatexWeight % 500);
                const completedPits = Math.floor(finalTodayLatexWeight / 500);
                const realTruckVol = truncateOneDecimal((completedPits * 500) % 3000);
                const realTrucksDispatched = Math.floor(finalTodayLatexWeight / 3000);

                let latestTicketObj = {
                    id: '-',
                    farmerName: 'ยังไม่มีรายการรับซื้อวันนี้',
                    freshVolume: 0,
                    drcPercent: finalTodayAvgDrc || 0,
                    dryWeight: 0,
                    totalBaht: 0,
                    timeStr: '-',
                    isReal: true
                };

                if (sortedTodayLatexBuys.length > 0) {
                    const latest = sortedTodayLatexBuys[0];
                    const netFresh = getRecordNetWeight(latest);
                    const drc = Number(latest.drc || 0);
                    const dryKg = getRecordDryWeight(latest);
                    const totalBaht = Number(latest.total || 0);
                    const rawTime = latest.timestamp || latest.created_at || latest.date;
                    let timeStr = todayStr;
                    try {
                        if (rawTime && !isNaN(new Date(rawTime).getTime())) {
                            timeStr = format(new Date(rawTime), 'HH:mm น.');
                        }
                    } catch {}

                    latestTicketObj = {
                        id: String(latest.bill_no || latest.id || 'BILL').slice(-10),
                        farmerName: latest.farmerName || 'เกษตรกรหน้าร้าน',
                        freshVolume: truncateOneDecimal(netFresh),
                        drcPercent: truncateOneDecimal(drc),
                        dryWeight: +dryKg.toFixed(2),
                        totalBaht: +totalBaht.toFixed(2),
                        timeStr,
                        isReal: true
                    };
                }

                setRealBills(sortedTodayLatexBuys);
                simRef.current.realBills = sortedTodayLatexBuys;

                // Save locked real metrics
                simRef.current.realMetrics = {
                    rubberPrice: dailyPrice,
                    cupLumpPrice,
                    todayLatexWeight: finalTodayLatexWeight,
                    todayTotalDryWeight: finalTodayDryWeight,
                    todayAvgDrc: finalTodayAvgDrc,
                    todayLatexBuy: finalTodayLatexBuy,
                    totalMoneyPaid: finalTodayBuy,
                    farmerCount: sortedTodayLatexBuys.length,
                    pitVolume: realPitVol,
                    truckVolume: realTruckVol,
                    trucksDispatched: realTrucksDispatched,
                    latestTicket: latestTicketObj
                };

                // Update 3D Signboard dynamically with real store name & daily price
                if (threeRefs.current.updateSignboard) {
                    threeRefs.current.updateSignboard(
                        resolvedStoreName,
                        `ราคาน้ำยางสดวันนี้ ${dailyPrice.toFixed(2)} บ./กก. • %DRC เฉลี่ย ${finalTodayAvgDrc.toFixed(1)}%`
                    );
                }

                // If currently in Live Mode, apply locked real metrics immediately
                if (simRef.current.dataMode === 'live') {
                    simRef.current.rubberPrice = dailyPrice;
                    simRef.current.cupLumpPrice = cupLumpPrice;
                    simRef.current.todayLatexWeight = finalTodayLatexWeight;
                    simRef.current.todayTotalDryWeight = finalTodayDryWeight;
                    simRef.current.todayAvgDrc = finalTodayAvgDrc;
                    simRef.current.todayLatexBuy = finalTodayLatexBuy;
                    simRef.current.totalMoneyPaid = finalTodayBuy;
                    simRef.current.farmerCount = sortedTodayLatexBuys.length;
                    simRef.current.pitVolume = realPitVol;
                    simRef.current.truckVolume = realTruckVol;
                    simRef.current.trucksDispatched = realTrucksDispatched;
                    simRef.current.currentTicket = { ...latestTicketObj };

                    if (threeRefs.current.updateVisualGauges) {
                        threeRefs.current.updateVisualGauges();
                    }
                    if (!simRef.current.isPlayingAnim && threeRefs.current.setStandbyPose) {
                        threeRefs.current.setStandbyPose();
                    }

                    syncReactState({
                        actionText:
                            sortedTodayLatexBuys.length > 0
                                ? `🟢 ข้อมูลจริงวันนี้: รับซื้อแล้ว ${sortedTodayLatexBuys.length} บิล • น้ำยางสดรวม ${finalTodayLatexWeight.toLocaleString()} กก. (%DRC เฉลี่ย ${finalTodayAvgDrc.toFixed(1)}%)`
                                : `🟢 เชื่อมต่อข้อมูลจริงแล้ว • วันนี้ยังไม่มีรายการรับซื้อน้ำยางสด (0.0 กก.)`,
                        pitChemStatus:
                            realPitVol > 0
                                ? `มีน้ำยางสดสะสมในบ่อ ${realPitVol.toFixed(1)} กก.`
                                : 'บ่อพักว่าง (รอรับน้ำยางสด)'
                    });
                }
            } catch (err) {
                console.warn('Dashboard3D live data sync warning:', err);
            } finally {
                setSyncingData(false);
            }
        },
        [syncReactState, user]
    );

    useEffect(() => {
        loadRealSystemData();

        // Listen for real-time bill creation from Buy.jsx / buyApi.js
        const handleLiveBillTrigger = async (e) => {
            const detail = e.detail;
            await loadRealSystemData(true);

            if (!detail) return;
            const freshVol = Math.max(1, Number(detail.weight) || 0);
            const drc = Number(detail.drc) || 0;
            const dryKg = Number(detail.netWeight) || +(freshVol * (drc / 100)).toFixed(2);
            const totalBaht = Number(detail.totalPrice) || +(dryKg * simRef.current.rubberPrice).toFixed(2);

            const liveTicket = {
                id: String(detail.id || `LIVE-${Date.now().toString().slice(-4)}`).slice(-10),
                farmerName: detail.farmerName || 'เกษตรกรหน้าร้าน',
                freshVolume: truncateOneDecimal(freshVol),
                drcPercent: truncateOneDecimal(drc),
                dryWeight: +dryKg.toFixed(2),
                totalBaht: +totalBaht.toFixed(2),
                timeStr: format(new Date(), 'HH:mm น.'),
                isReal: true
            };

            simRef.current.queuedRealTicket = liveTicket;
            simRef.current.isPlayingAnim = true;
            simRef.current.waitingManual = false;
            if (threeRefs.current.startStepOne) {
                threeRefs.current.startStepOne();
            }
        };

        const handleDashboardRefresh = () => loadRealSystemData(true);
        const handleSettingsUpdated = () => loadRealSystemData(true);

        window.addEventListener('yard-simulation-trigger', handleLiveBillTrigger);
        window.addEventListener('dashboard-refresh', handleDashboardRefresh);
        window.addEventListener('settings-updated', handleSettingsUpdated);
        return () => {
            window.removeEventListener('yard-simulation-trigger', handleLiveBillTrigger);
            window.removeEventListener('dashboard-refresh', handleDashboardRefresh);
            window.removeEventListener('settings-updated', handleSettingsUpdated);
        };
    }, [loadRealSystemData]);

    // Camera preset helper
    const focusCameraPreset = useCallback((preset) => {
        const { camera, controls } = threeRefs.current;
        if (!camera || !controls) return;
        const views = {
            overview: { pos: new THREE.Vector3(44, 42, 44), target: new THREE.Vector3(0, 1.2, 0), zoom: 1.0 },
            weigh_lab: { pos: new THREE.Vector3(10, 24, 28), target: new THREE.Vector3(-4.5, 1.5, 0.5), zoom: 1.55 },
            pit_pump: { pos: new THREE.Vector3(24, 24, 34), target: new THREE.Vector3(5.2, 1.5, 1.8), zoom: 1.5 },
            truck: { pos: new THREE.Vector3(36, 24, 18), target: new THREE.Vector3(13.5, 2.0, 1.5), zoom: 1.45 }
        };
        const v = views[preset];
        if (!v) return;

        threeRefs.current.camAnim = {
            startPos: camera.position.clone(),
            endPos: v.pos,
            startTarget: controls.target.clone(),
            endTarget: v.target,
            startZoom: camera.zoom,
            endZoom: v.zoom,
            progress: 0
        };
        if (window.innerWidth < 768) setActiveMobileTab('none');
    }, []);

    // -------------------------------------------------------------------------
    // BUILD STUDIO-GRADE 3D ISOMETRIC SCENE
    // -------------------------------------------------------------------------
    useEffect(() => {
        const container = containerRef.current;
        const labelsContainer = labelsContainerRef.current;
        if (!container || !labelsContainer) return;

        labelsContainer.innerHTML = '';
        threeRefs.current.labels3D = [];

        // 1. Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef2f6);
        scene.fog = new THREE.FogExp2(0xeef2f6, 0.0045);
        threeRefs.current.scene = scene;

        // 2. Orthographic Isometric Camera
        const aspect = container.clientWidth / container.clientHeight;
        const d = 22;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 400);
        camera.position.set(44, 42, 44);
        camera.lookAt(0, 1.2, 0);
        threeRefs.current.camera = camera;

        // 3. Physically-Based WebGLRenderer + Studio HDRI Environment
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        container.appendChild(renderer.domElement);
        threeRefs.current.renderer = renderer;

        // Studio PMREM Environment
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.55;

        // 4. OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.rotateSpeed = 0.65;
        controls.zoomSpeed = 1.2;
        controls.minZoom = 0.6;
        controls.maxZoom = 2.8;
        controls.maxPolarAngle = Math.PI / 2.15;
        controls.target.set(0, 1.2, 0);
        threeRefs.current.controls = controls;

        // 5. Studio Lighting Setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xdbeafe, 0.9);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.6);
        sunLight.position.set(28, 46, 26);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 130;
        const shadowDim = 30;
        sunLight.shadow.camera.left = -shadowDim;
        sunLight.shadow.camera.right = shadowDim;
        sunLight.shadow.camera.top = shadowDim;
        sunLight.shadow.camera.bottom = -shadowDim;
        sunLight.shadow.bias = -0.0005;
        scene.add(sunLight);

        // Helper: Floating 3D HTML Label
        function createFloatingLabel(text, positionVec3, colorBorder = '#10b981') {
            const div = document.createElement('div');
            div.className = 'label-3d';
            div.style.borderColor = colorBorder;
            div.innerHTML = text;
            labelsContainer.appendChild(div);
            const labelObj = { element: div, position: positionVec3.clone() };
            threeRefs.current.labels3D.push(labelObj);
            return labelObj;
        }

        // Helper: High-Res Signboard Canvas Texture
        function createSignboardTexture(title, subtitle) {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            const grad = ctx.createLinearGradient(0, 0, 1024, 256);
            grad.addColorStop(0, '#064e3b');
            grad.addColorStop(0.5, '#047857');
            grad.addColorStop(1, '#0f766e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1024, 256);

            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 10;
            ctx.strokeRect(14, 14, 996, 228);

            ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)';
            ctx.lineWidth = 3;
            ctx.strokeRect(26, 26, 972, 204);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 58px "Noto Sans Thai", Kanit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(title || 'ลานรับซื้อน้ำยางสด').slice(0, 32), 512, 118);

            ctx.fillStyle = '#fde047';
            ctx.font = '600 34px "Noto Sans Thai", Kanit, sans-serif';
            ctx.fillText(subtitle, 512, 184);

            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        }

        // Helper: Stylized Articulated 3D Character
        function createDetailedCharacter(shirtColor, hatColor = null, hasApron = false) {
            const group = new THREE.Group();
            const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
            const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.45 });
            const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.4 });

            [-0.17, 0.17].forEach(lx => {
                const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 8, 12), pantsMat);
                leg.position.set(lx, 0.42, 0);
                leg.castShadow = true;
                group.add(leg);

                const boot = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.32, 3, 0.05), shoeMat);
                boot.position.set(lx, 0.1, 0.05);
                boot.castShadow = true;
                group.add(boot);
            });

            const torso = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.78, 0.38, 4, 0.12), shirtMat);
            torso.position.y = 1.05;
            torso.castShadow = true;
            group.add(torso);

            if (hasApron) {
                const apronMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
                const apron = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.65, 0.41, 3, 0.05), apronMat);
                apron.position.set(0, 0.98, 0.02);
                group.add(apron);
            }

            const leftArm = new THREE.Group();
            leftArm.position.set(-0.38, 1.32, 0);
            const lArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 8, 12), shirtMat);
            lArmMesh.position.y = -0.22;
            lArmMesh.castShadow = true;
            const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), skinMat);
            lHand.position.y = -0.46;
            leftArm.add(lArmMesh, lHand);
            group.add(leftArm);

            const rightArm = new THREE.Group();
            rightArm.position.set(0.38, 1.32, 0);
            const rArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 8, 12), shirtMat);
            rArmMesh.position.y = -0.22;
            rArmMesh.castShadow = true;
            const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), skinMat);
            rHand.position.y = -0.46;
            rightArm.add(rArmMesh, rHand);
            group.add(rightArm);

            const headGroup = new THREE.Group();
            headGroup.position.y = 1.74;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 24), skinMat);
            head.castShadow = true;
            headGroup.add(head);

            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
            [-0.09, 0.09].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
                eye.position.set(ex, 0.03, 0.25);
                headGroup.add(eye);
            });

            if (hatColor !== null) {
                const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.25, metalness: 0.1 });
                const hatDome = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
                    hatMat
                );
                hatDome.position.y = 0.05;
                hatDome.castShadow = true;
                const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20), hatMat);
                hatBrim.position.set(0, 0.06, 0.04);
                headGroup.add(hatDome, hatBrim);
            }
            group.add(headGroup);

            group.userData = { leftArm, rightArm, headGroup };
            return group;
        }

        // Helper: Glossy Latex Bucket
        function createLatexBucket(scale = 1) {
            const group = new THREE.Group();
            const bucketMat = new THREE.MeshStandardMaterial({
                color: 0x2563eb,
                roughness: 0.25,
                metalness: 0.1
            });
            const rimMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3 });

            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.42 * scale, 0.33 * scale, 0.82 * scale, 24),
                bucketMat
            );
            body.position.y = 0.41 * scale;
            body.castShadow = true;
            group.add(body);

            const rim = new THREE.Mesh(
                new THREE.TorusGeometry(0.42 * scale, 0.035 * scale, 10, 24),
                rimMat
            );
            rim.rotation.x = Math.PI / 2;
            rim.position.y = 0.81 * scale;
            group.add(rim);

            const latexMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                emissive: 0xf8fafc,
                emissiveIntensity: 0.15,
                roughness: 0.1,
                clearcoat: 1.0
            });
            const latexTop = new THREE.Mesh(new THREE.CircleGeometry(0.39 * scale, 24), latexMat);
            latexTop.rotation.x = -Math.PI / 2;
            latexTop.position.y = 0.78 * scale;
            group.add(latexTop);

            return group;
        }

        // Helper: Stylized 3D Tree
        function createStylizedTree(x, z, scale = 1) {
            const tree = new THREE.Group();
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
            const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
            const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.55 });

            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.35 * scale, 1.8 * scale, 12), trunkMat);
            trunk.position.y = 0.9 * scale;
            trunk.castShadow = true;
            tree.add(trunk);

            const crown1 = new THREE.Mesh(new THREE.SphereGeometry(1.15 * scale, 20, 20), leafMat1);
            crown1.position.set(0, 2.2 * scale, 0);
            crown1.castShadow = true;
            tree.add(crown1);

            const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.85 * scale, 18, 18), leafMat2);
            crown2.position.set(0.45 * scale, 2.75 * scale, 0.25 * scale);
            crown2.castShadow = true;
            tree.add(crown2);

            const crown3 = new THREE.Mesh(new THREE.SphereGeometry(0.75 * scale, 18, 18), leafMat2);
            crown3.position.set(-0.4 * scale, 2.6 * scale, -0.3 * scale);
            crown3.castShadow = true;
            tree.add(crown3);

            tree.position.set(x, 0, z);
            scene.add(tree);
        }

        // 1. ARCHITECTURAL DIORAMA BASE, GROUND & ROADS
        const outerGround = new THREE.Mesh(
            new THREE.PlaneGeometry(140, 140),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.95 })
        );
        outerGround.rotation.x = -Math.PI / 2;
        outerGround.position.y = -0.45;
        outerGround.receiveShadow = true;
        scene.add(outerGround);

        const dioramaBase = new THREE.Mesh(
            new RoundedBoxGeometry(46, 0.6, 34, 4, 0.25),
            new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.8 })
        );
        dioramaBase.position.set(0, -0.3, 1);
        dioramaBase.receiveShadow = true;
        scene.add(dioramaBase);

        const gridHelper = new THREE.GridHelper(44, 22, 0xcbd5e1, 0xcbd5e1);
        gridHelper.position.set(0, 0.01, 1);
        gridHelper.material.opacity = 0.35;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
        const lineWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
        const lineYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

        const frontRoad = new THREE.Mesh(new RoundedBoxGeometry(46, 0.08, 4.6, 2, 0.03), asphaltMat);
        frontRoad.position.set(0, 0.04, 9.5);
        frontRoad.receiveShadow = true;
        scene.add(frontRoad);

        for (let rx = -20; rx <= 20; rx += 3.2) {
            const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.18), lineWhiteMat);
            dash.position.set(rx, 0.05, 9.5);
            scene.add(dash);
        }

        const sideRoad = new THREE.Mesh(new RoundedBoxGeometry(6.8, 0.08, 34, 2, 0.03), asphaltMat);
        sideRoad.position.set(13.5, 0.04, 1);
        sideRoad.receiveShadow = true;
        scene.add(sideRoad);

        for (let rz = -13; rz <= 15; rz += 3.6) {
            const dash = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 1.8), lineYellowMat);
            dash.position.set(13.5, 0.05, rz);
            scene.add(dash);
        }

        createStylizedTree(-19, -11, 1.15);
        createStylizedTree(-15, -12, 0.9);
        createStylizedTree(6, -12, 1.05);
        createStylizedTree(19, -10, 1.1);
        createStylizedTree(19, 12, 0.95);
        createStylizedTree(-19, 13.5, 1.0);

        // 2. MAIN RUBBER PURCHASING FACILITY BUILDING
        const facilityGroup = new THREE.Group();

        const floorSlab = new THREE.Mesh(
            new RoundedBoxGeometry(19.6, 0.32, 12.6, 4, 0.1),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
        );
        floorSlab.position.set(-1, 0.16, 0);
        floorSlab.receiveShadow = true;
        floorSlab.castShadow = true;
        facilityGroup.add(floorSlab);

        const safetyTrim = new THREE.Mesh(
            new THREE.BoxGeometry(19.65, 0.08, 0.25),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
        );
        safetyTrim.position.set(-1, 0.29, 6.2);
        facilityGroup.add(safetyTrim);

        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.3 });
        const basePedestalMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
        const pillarCoords = [
            [-9.8, 5.6], [7.8, 5.6],
            [-9.8, -5.6], [7.8, -5.6],
            [-1, 5.6], [-1, -5.6]
        ];
        pillarCoords.forEach(([px, pz]) => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6.4, 16), pillarMat);
            p.position.set(px, 3.2, pz);
            p.castShadow = true;
            facilityGroup.add(p);

            const ped = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.45, 0.65, 3, 0.08), basePedestalMat);
            ped.position.set(px, 0.4, pz);
            ped.castShadow = true;
            facilityGroup.add(ped);
        });

        const mainRoofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.2 });
        const roofTrimMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.3, metalness: 0.25 });

        const mainRoof = new THREE.Mesh(new RoundedBoxGeometry(21.2, 0.42, 14.2, 4, 0.12), mainRoofMat);
        mainRoof.position.set(-1, 6.45, 0);
        mainRoof.castShadow = true;
        mainRoof.receiveShadow = true;
        facilityGroup.add(mainRoof);

        const upperRoof = new THREE.Mesh(new RoundedBoxGeometry(14.5, 0.55, 8.5, 4, 0.15), roofTrimMat);
        upperRoof.position.set(-1, 6.85, 0);
        upperRoof.castShadow = true;
        facilityGroup.add(upperRoof);

        for (let rx = -10.5; rx <= 8.5; rx += 1.2) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 14.0), roofTrimMat);
            rib.position.set(rx, 6.68, 0);
            facilityGroup.add(rib);
        }

        // Dynamic Signboard on Front Roof
        const signFrontMat = new THREE.MeshStandardMaterial({
            map: createSignboardTexture(
                simRef.current.storeName,
                'ลานรับซื้อน้ำยางสดมาตรฐาน • ระบบชั่งดิจิทัล & ตรวจวัด %DRC'
            ),
            roughness: 0.25
        });
        const signBoardMesh = new THREE.Mesh(
            new RoundedBoxGeometry(12.2, 2.35, 0.38, 3, 0.08),
            [
                new THREE.MeshStandardMaterial({ color: 0x064e3b }),
                new THREE.MeshStandardMaterial({ color: 0x064e3b }),
                new THREE.MeshStandardMaterial({ color: 0x064e3b }),
                new THREE.MeshStandardMaterial({ color: 0x064e3b }),
                signFrontMat,
                new THREE.MeshStandardMaterial({ color: 0x064e3b })
            ]
        );
        signBoardMesh.position.set(-1, 7.85, 6.8);
        signBoardMesh.castShadow = true;
        facilityGroup.add(signBoardMesh);

        threeRefs.current.updateSignboard = (title, subtitle) => {
            if (signFrontMat.map) signFrontMat.map.dispose();
            signFrontMat.map = createSignboardTexture(title, subtitle);
            signFrontMat.needsUpdate = true;
        };

        scene.add(facilityGroup);

        // 3. STATION 1: DIGITAL WEIGHING SCALE & SAMPLING
        const scaleGroup = new THREE.Group();
        scaleGroup.position.set(-6.5, 0.32, 2.8);

        const scaleBase = new THREE.Mesh(
            new RoundedBoxGeometry(2.3, 0.22, 2.3, 4, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.3 })
        );
        scaleBase.castShadow = true;
        scaleBase.receiveShadow = true;
        scaleGroup.add(scaleBase);

        const scalePlate = new THREE.Mesh(
            new RoundedBoxGeometry(1.9, 0.08, 1.9, 3, 0.03),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
        );
        scalePlate.position.y = 0.14;
        scaleGroup.add(scalePlate);

        const scalePole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 12), pillarMat);
        scalePole.position.set(0, 0.9, -0.95);
        scaleGroup.add(scalePole);

        const scaleHeadMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            emissive: 0x10b981,
            emissiveIntensity: 0.25,
            roughness: 0.2
        });
        const scaleHead = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.45, 0.18, 3, 0.04), scaleHeadMat);
        scaleHead.position.set(0, 1.75, -0.95);
        scaleGroup.add(scaleHead);

        scene.add(scaleGroup);

        const staffWeigh = createDetailedCharacter(0x2563eb, 0xfacc15, false);
        staffWeigh.position.set(-8.3, 0.32, 2.8);
        staffWeigh.rotation.y = Math.PI / 2;
        scene.add(staffWeigh);
        createFloatingLabel('⚖️ จุดชั่งน้ำหนักดิจิทัล', new THREE.Vector3(-6.5, 3.0, 2.8), '#0ea5e9');

        // 4. STATION 2: DRC LABORATORY & OVEN
        const labGroup = new THREE.Group();
        labGroup.position.set(-2.2, 0.32, -2.2);

        const labDesk = new THREE.Mesh(
            new RoundedBoxGeometry(3.8, 0.95, 1.75, 4, 0.08),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
        );
        labDesk.position.y = 0.48;
        labDesk.castShadow = true;
        labDesk.receiveShadow = true;
        labGroup.add(labDesk);

        const labTop = new THREE.Mesh(
            new RoundedBoxGeometry(3.9, 0.1, 1.85, 3, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3 })
        );
        labTop.position.y = 0.98;
        labGroup.add(labTop);

        const drcOven = new THREE.Mesh(
            new RoundedBoxGeometry(1.25, 0.85, 0.95, 4, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.35 })
        );
        drcOven.position.set(-0.65, 1.45, 0);
        drcOven.castShadow = true;
        labGroup.add(drcOven);

        const ovenWindowMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.05,
            roughness: 0.1
        });
        const ovenWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.48), ovenWindowMat);
        ovenWindow.position.set(-0.65, 1.46, 0.49);
        labGroup.add(ovenWindow);

        const miniBalance = new THREE.Mesh(
            new RoundedBoxGeometry(0.55, 0.18, 0.55, 3, 0.04),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.3 })
        );
        miniBalance.position.set(0.85, 1.12, 0);
        labGroup.add(miniBalance);

        scene.add(labGroup);

        const staffLab = createDetailedCharacter(0xffffff, 0x0ea5e9, true);
        staffLab.position.set(-2.2, 0.32, -3.65);
        scene.add(staffLab);
        createFloatingLabel('🔬 ห้องแล็บตรวจ %DRC', new THREE.Vector3(-2.2, 3.2, -2.2), '#f59e0b');

        // 5. STATION 3: SMART BILLING & RECEIPT KIOSK
        const billGroup = new THREE.Group();
        billGroup.position.set(2.5, 0.32, -2.2);

        const billDesk = new THREE.Mesh(
            new RoundedBoxGeometry(2.9, 0.95, 1.65, 4, 0.08),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 })
        );
        billDesk.position.y = 0.48;
        billDesk.castShadow = true;
        billDesk.receiveShadow = true;
        billGroup.add(billDesk);

        const monitorMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            emissive: 0x10b981,
            emissiveIntensity: 0.25,
            roughness: 0.15
        });
        const monitor = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.65, 0.1, 3, 0.03), monitorMat);
        monitor.position.set(-0.35, 1.38, 0);
        billGroup.add(monitor);

        const printer = new THREE.Mesh(
            new RoundedBoxGeometry(0.48, 0.32, 0.48, 3, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
        );
        printer.position.set(0.65, 1.12, 0.1);
        billGroup.add(printer);

        const paperSlipMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.45, 0.02),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        paperSlipMesh.position.set(0.65, 1.32, 0.1);
        paperSlipMesh.scale.y = 0.01;
        billGroup.add(paperSlipMesh);

        scene.add(billGroup);

        const staffBill = createDetailedCharacter(0x10b981, null, false);
        staffBill.position.set(2.5, 0.32, -3.6);
        scene.add(staffBill);
        createFloatingLabel('🧾 จุดออกบิล & โอนเงิน', new THREE.Vector3(2.5, 3.2, -2.2), '#10b981');

        // 6. COLLECTION PIT (500L), AGITATOR MIXER, CHEMICAL TANKS & PIPELINE
        const pitGroup = new THREE.Group();
        pitGroup.position.set(5.2, 0.32, 2.2);

        const pitOuter = new THREE.Mesh(
            new RoundedBoxGeometry(4.1, 1.45, 3.6, 4, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55 })
        );
        pitOuter.position.y = 0.72;
        pitOuter.castShadow = true;
        pitOuter.receiveShadow = true;
        pitGroup.add(pitOuter);

        const pitInnerDark = new THREE.Mesh(
            new THREE.BoxGeometry(3.55, 0.1, 3.05),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        pitInnerDark.position.y = 1.41;
        pitGroup.add(pitInnerDark);

        const pitLiquidMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            emissive: 0xf8fafc,
            emissiveIntensity: 0.18,
            roughness: 0.12,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const pitLiquidMesh = new THREE.Mesh(new RoundedBoxGeometry(3.48, 1.25, 2.98, 3, 0.06), pitLiquidMat);
        pitLiquidMesh.position.y = 0.25;
        pitLiquidMesh.scale.y = 0.05;
        pitGroup.add(pitLiquidMesh);

        const rippleRingMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.0
        });
        const rippleRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.42, 32), rippleRingMat);
        rippleRing.rotation.x = -Math.PI / 2;
        rippleRing.position.set(0, 1.44, 0);
        pitGroup.add(rippleRing);

        const pourStreamMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.0
        });
        const pourStream = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.3, 16), pourStreamMat);
        pourStream.position.set(-1.35, 1.45, 0);
        pitGroup.add(pourStream);

        const mixerBridge = new THREE.Mesh(
            new RoundedBoxGeometry(4.3, 0.2, 0.48, 3, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.25 })
        );
        mixerBridge.position.y = 1.68;
        mixerBridge.castShadow = true;
        pitGroup.add(mixerBridge);

        const mixerMotor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.55, 16),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.3 })
        );
        mixerMotor.position.y = 2.02;
        pitGroup.add(mixerMotor);

        const mixerGroup = new THREE.Group();
        mixerGroup.position.set(0, 1.55, 0);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.25, 12), pillarMat);
        shaft.position.y = -0.5;
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.3, roughness: 0.3 });
        const blade1 = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.14, 0.26, 2, 0.03), bladeMat);
        blade1.position.y = -0.95;
        const blade2 = blade1.clone();
        blade2.rotation.y = Math.PI / 2;
        mixerGroup.add(shaft, blade1, blade2);
        pitGroup.add(mixerGroup);

        const ammoniaTank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.44, 1.35, 24),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.15 })
        );
        ammoniaTank.position.set(-1.25, 0.68, -2.35);
        ammoniaTank.castShadow = true;
        pitGroup.add(ammoniaTank);

        const whiteChemTank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.44, 1.35, 24),
            new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.25, metalness: 0.15 })
        );
        whiteChemTank.position.set(-0.1, 0.68, -2.35);
        whiteChemTank.castShadow = true;
        pitGroup.add(whiteChemTank);

        const pumpMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            metalness: 0.4,
            roughness: 0.25,
            emissive: 0x10b981,
            emissiveIntensity: 0.05
        });
        const pumpMesh = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.9, 1.05, 4, 0.12), pumpMat);
        pumpMesh.position.set(2.6, 0.45, 0);
        pumpMesh.castShadow = true;
        pitGroup.add(pumpMesh);

        const pipeMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.6,
            roughness: 0.25,
            transparent: true,
            opacity: 0.72
        });
        const pipeVert = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.6, 16), pipeMat);
        pipeVert.position.set(2.6, 2.2, 0);
        const pipeHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5.9, 16), pipeMat);
        pipeHoriz.rotation.z = Math.PI / 2;
        pipeHoriz.position.set(5.5, 3.95, 0);
        pitGroup.add(pipeVert, pipeHoriz);

        const flowPulses = [];
        const pulseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        for (let i = 0; i < 5; i++) {
            const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), pulseMat);
            pulse.visible = false;
            pitGroup.add(pulse);
            flowPulses.push(pulse);
        }

        scene.add(pitGroup);

        const staffTransport = createDetailedCharacter(0xf97316, 0xffffff, true);
        staffTransport.position.set(5.2, 0.32, -1.25);
        scene.add(staffTransport);

        const pitLabel = createFloatingLabel('💧 บ่อพัก (0.0 / 500 กก.)', new THREE.Vector3(5.2, 3.3, 2.2), '#10b981');

        // 7. HEAVY TANKER TRUCK (3,000L)
        const truckGroup = new THREE.Group();
        truckGroup.position.set(13.5, 0.08, 2.2);

        const chassis = new THREE.Mesh(
            new RoundedBoxGeometry(3.3, 0.55, 9.6, 3, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.5 })
        );
        chassis.position.y = 0.72;
        chassis.castShadow = true;
        truckGroup.add(chassis);

        const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.15 });
        const cabin = new THREE.Mesh(new RoundedBoxGeometry(3.15, 2.35, 2.6, 5, 0.2), cabinMat);
        cabin.position.set(0, 2.15, 3.3);
        cabin.castShadow = true;
        truckGroup.add(cabin);

        const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.08, metalness: 0.8 });
        const windshield = new THREE.Mesh(new RoundedBoxGeometry(2.75, 1.05, 0.12, 2, 0.04), glassMat);
        windshield.position.set(0, 2.42, 4.58);
        truckGroup.add(windshield);

        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        [-1.05, 1.05].forEach(hx => {
            const hl = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.28, 0.1, 2, 0.03), headlightMat);
            hl.position.set(hx, 1.35, 4.6);
            truckGroup.add(hl);
        });

        const beaconMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.4
        });
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.28, 16), beaconMat);
        beacon.position.set(0, 3.45, 3.3);
        truckGroup.add(beacon);

        const tankCylGeo = new THREE.CylinderGeometry(1.52, 1.52, 6.2, 32);
        tankCylGeo.rotateX(Math.PI / 2);
        const tankShell = new THREE.Mesh(
            tankCylGeo,
            new THREE.MeshPhysicalMaterial({
                color: 0xe2e8f0,
                metalness: 0.25,
                roughness: 0.15,
                transparent: true,
                opacity: 0.58,
                transmission: 0.25
            })
        );
        tankShell.position.set(0, 2.48, -1.25);
        tankShell.castShadow = true;
        truckGroup.add(tankShell);

        [-3.8, -1.25, 1.3].forEach(rz => {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1.54, 0.06, 12, 32),
                new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.25 })
            );
            ring.position.set(0, 2.48, rz);
            truckGroup.add(ring);
        });

        const truckLiquidMesh = new THREE.Mesh(
            new RoundedBoxGeometry(2.45, 2.25, 5.85, 4, 0.25),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                emissive: 0x38bdf8,
                emissiveIntensity: 0.18,
                roughness: 0.12,
                clearcoat: 1.0
            })
        );
        truckLiquidMesh.position.set(0, 1.4, -1.25);
        truckLiquidMesh.scale.y = 0.02;
        truckGroup.add(truckLiquidMesh);

        const truckWheels = [];
        const wheelTireGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.45, 24);
        wheelTireGeo.rotateZ(Math.PI / 2);
        const wheelHubGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.48, 16);
        wheelHubGeo.rotateZ(Math.PI / 2);
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
        const hubMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });

        [
            [-1.65, 0.58, 3.2], [1.65, 0.58, 3.2],
            [-1.65, 0.58, -0.4], [1.65, 0.58, -0.4],
            [-1.65, 0.58, -2.9], [1.65, 0.58, -2.9]
        ].forEach(([wx, wy, wz]) => {
            const wGroup = new THREE.Group();
            wGroup.position.set(wx, wy, wz);
            const tire = new THREE.Mesh(wheelTireGeo, tireMat);
            tire.castShadow = true;
            const hub = new THREE.Mesh(wheelHubGeo, hubMat);
            wGroup.add(tire, hub);
            truckGroup.add(wGroup);
            truckWheels.push(wGroup);
        });

        scene.add(truckGroup);
        const truckLabel = createFloatingLabel('🚚 รถแท็งก์ (0 / 3,000 กก.)', new THREE.Vector3(13.5, 4.9, 2.2), '#0ea5e9');

        // 8. FARMER INBOUND VEHICLE
        const motoGroup = new THREE.Group();
        const motoPaintMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.3 });
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.15 });

        const motoBody = new THREE.Mesh(new RoundedBoxGeometry(1.85, 0.52, 0.65, 3, 0.12), motoPaintMat);
        motoBody.position.y = 0.55;
        motoBody.castShadow = true;
        motoGroup.add(motoBody);

        const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 10), chromeMat);
        handlebar.rotation.x = Math.PI / 2;
        handlebar.position.set(0.65, 1.15, 0);
        motoGroup.add(handlebar);

        const motoLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), headlightMat);
        motoLight.position.set(0.82, 1.05, 0);
        motoGroup.add(motoLight);

        const rearRack = new THREE.Mesh(
            new RoundedBoxGeometry(0.95, 0.12, 0.95, 2, 0.03),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
        );
        rearRack.position.set(-0.85, 0.82, 0);
        motoGroup.add(rearRack);

        const motoWheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20);
        motoWheelGeo.rotateX(Math.PI / 2);
        const motoWheelF = new THREE.Mesh(motoWheelGeo, tireMat);
        motoWheelF.position.set(0.7, 0.34, 0);
        motoWheelF.castShadow = true;
        const motoWheelB = motoWheelF.clone();
        motoWheelB.position.set(-0.7, 0.34, 0);
        motoGroup.add(motoWheelF, motoWheelB);

        const farmerChar = createDetailedCharacter(0x16a34a, 0xfacc15, false);
        farmerChar.position.set(-0.05, 0.35, 0);
        farmerChar.rotation.y = Math.PI / 2;
        motoGroup.add(farmerChar);

        motoGroup.position.set(-16, 0.08, 9.5);
        scene.add(motoGroup);

        const activeBucket = createLatexBucket(1.05);
        activeBucket.position.set(-16.85, 0.9, 9.5);
        scene.add(activeBucket);

        const sampleCup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.13, 0.28, 16),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                emissive: 0x38bdf8,
                emissiveIntensity: 0.35,
                roughness: 0.1,
                clearcoat: 1.0
            })
        );
        sampleCup.visible = false;
        scene.add(sampleCup);

        threeRefs.current.actors = {
            motoGroup,
            motoWheelF,
            motoWheelB,
            farmerChar,
            staffWeigh,
            staffLab,
            staffBill,
            staffTransport,
            activeBucket,
            sampleCup,
            scaleHeadMat,
            ovenWindowMat,
            monitorMat,
            paperSlipMesh,
            pitLiquidMesh,
            pitLiquidMat,
            rippleRing,
            rippleRingMat,
            pourStream,
            pourStreamMat,
            mixerGroup,
            pumpMat,
            flowPulses,
            truckGroup,
            truckLiquidMesh,
            truckWheels,
            beaconMat,
            pitLabel,
            truckLabel
        };

        // ---------------------------------------------------------------------
        // VISUAL GAUGES & STANDBY POSE HELPERS
        // ---------------------------------------------------------------------
        const updateVisualGauges = () => {
            const s = simRef.current;
            const { pitLiquidMesh: plm, truckLiquidMesh: tlm, pitLabel: pl, truckLabel: tl } = threeRefs.current.actors;

            const hasPitLatex = s.pitVolume > 0.1;
            plm.visible = hasPitLatex;
            if (hasPitLatex) {
                const targetPitScale = Math.max(0.06, Math.min(1.0, s.pitVolume / s.pitMax));
                plm.scale.y = targetPitScale;
                plm.position.y = 0.15 + (targetPitScale * 1.2) / 2;
            }

            const hasTruckLatex = s.truckVolume > 0.1;
            tlm.visible = hasTruckLatex;
            if (hasTruckLatex) {
                const targetTruckScale = Math.max(0.05, Math.min(1.0, s.truckVolume / s.truckMax));
                tlm.scale.y = targetTruckScale;
                tlm.position.y = 1.35 + (targetTruckScale * 2.15) / 2;
            }

            if (pl?.element) pl.element.innerHTML = `💧 บ่อพัก (${s.pitVolume.toFixed(1)} / 500 กก.)`;
            if (tl?.element) tl.element.innerHTML = `🚚 รถแท็งก์ (${s.truckVolume.toFixed(0)} / 3,000 กก.)`;
        };
        threeRefs.current.updateVisualGauges = updateVisualGauges;

        const setStandbyPose = () => {
            const s = simRef.current;
            const {
                motoGroup: mg,
                activeBucket: ab,
                sampleCup: sc,
                paperSlipMesh: ps,
                pourStreamMat: psm,
                rippleRingMat: rrm,
                flowPulses: fp,
                truckGroup: tg,
                truckLabel: tl
            } = threeRefs.current.actors;

            s.step = 0;
            s.stepProgress = 0;
            s.isPlayingAnim = false;
            psm.opacity = 0;
            rrm.opacity = 0;
            fp.forEach(p => (p.visible = false));
            sc.visible = false;
            tg.position.z = 2.2;
            tl.position.z = 2.2;

            // In Live Mode, always restore exact real DB figures
            if (s.dataMode === 'live') {
                const rm = s.realMetrics;
                s.rubberPrice = rm.rubberPrice;
                s.cupLumpPrice = rm.cupLumpPrice;
                s.todayLatexWeight = rm.todayLatexWeight;
                s.todayTotalDryWeight = rm.todayTotalDryWeight;
                s.todayAvgDrc = rm.todayAvgDrc;
                s.todayLatexBuy = rm.todayLatexBuy;
                s.totalMoneyPaid = rm.totalMoneyPaid;
                s.farmerCount = rm.farmerCount;
                s.pitVolume = rm.pitVolume;
                s.truckVolume = rm.truckVolume;
                s.trucksDispatched = rm.trucksDispatched;
                if (rm.latestTicket) {
                    s.currentTicket = { ...rm.latestTicket };
                }
            }

            if (s.farmerCount > 0) {
                mg.position.set(-6.5, 0.08, 9.5);
                ab.visible = true;
                ab.rotation.set(0, 0, 0);
                ab.position.set(-6.5, 0.52, 2.8);
                ps.scale.y = 1.0;
                ps.position.y = 1.47;
            } else {
                mg.position.set(-16, 0.08, 9.5);
                ab.visible = true;
                ab.rotation.set(0, 0, 0);
                ab.position.set(-16.85, 0.92, 9.5);
                ps.scale.y = 0.01;
            }

            updateVisualGauges();
            syncReactState();
        };
        threeRefs.current.setStandbyPose = setStandbyPose;

        // ---------------------------------------------------------------------
        // STEP ENGINE FOR 1-CYCLE LIVE ANIMATION OR DEMO LOOP
        // ---------------------------------------------------------------------
        const prepareNextTicket = () => {
            const s = simRef.current;

            if (s.queuedRealTicket) {
                s.currentTicket = s.queuedRealTicket;
                s.queuedRealTicket = null;
                return;
            }

            if (s.dataMode === 'live') {
                if (s.realMetrics.latestTicket) {
                    s.currentTicket = { ...s.realMetrics.latestTicket };
                }
                return;
            }

            // Demo Mode Only
            s.farmerCount++;
            const numStr = String(s.farmerCount).padStart(3, '0');
            const name = DEMO_FARMERS[(s.farmerCount - 1) % DEMO_FARMERS.length];
            const freshVol = +(38 + Math.random() * 18).toFixed(1);
            const drc = +(29 + Math.random() * 8).toFixed(1);
            const dryKg = +(freshVol * (drc / 100)).toFixed(2);
            const price = s.rubberPrice > 0 ? s.rubberPrice : 65.0;
            const total = +(dryKg * price).toFixed(2);

            s.currentTicket = {
                id: `DEMO-${numStr}`,
                farmerName: name,
                freshVolume: freshVol,
                drcPercent: drc,
                dryWeight: dryKg,
                totalBaht: total,
                timeStr: format(new Date(), 'HH:mm น.'),
                isReal: false
            };
        };

        let pitStartVol = 0;
        let pitTargetVol = 0;
        let truckStartVol = 0;

        const enterStep = (newStep) => {
            const s = simRef.current;
            s.step = newStep;
            s.stepProgress = 0;

            const {
                motoGroup: mg,
                activeBucket: ab,
                sampleCup: sc,
                paperSlipMesh: ps,
                pourStreamMat: psm,
                rippleRingMat: rrm,
                flowPulses: fp
            } = threeRefs.current.actors;

            psm.opacity = 0;
            rrm.opacity = 0;
            fp.forEach(p => (p.visible = false));

            if (newStep === 1) {
                prepareNextTicket();
                mg.position.set(-22, 0.08, 9.5);
                ab.visible = true;
                ab.rotation.set(0, 0, 0);
                sc.visible = false;
                ps.scale.y = 0.01;

                if (s.dataMode === 'live') {
                    // Animate pouring up to the real pitVolume without exceeding real data
                    pitTargetVol = s.realMetrics.pitVolume;
                    pitStartVol = Math.max(0, pitTargetVol - s.currentTicket.freshVolume);
                } else {
                    pitStartVol = s.pitVolume;
                    pitTargetVol = Math.min(s.pitMax, pitStartVol + s.currentTicket.freshVolume);
                }
                truckStartVol = s.truckVolume;
            } else if (newStep === 2) {
                sc.visible = true;
            } else if (newStep === 4) {
                if (s.dataMode === 'demo') {
                    const price = s.rubberPrice > 0 ? s.rubberPrice : 65.0;
                    s.currentTicket.dryWeight = +(s.currentTicket.freshVolume * (s.currentTicket.drcPercent / 100)).toFixed(2);
                    s.currentTicket.totalBaht = +(s.currentTicket.dryWeight * price).toFixed(2);
                    s.totalMoneyPaid = truncateOneDecimal(s.totalMoneyPaid + s.currentTicket.totalBaht);
                    s.todayLatexWeight = truncateOneDecimal(s.todayLatexWeight + s.currentTicket.freshVolume);
                    s.todayTotalDryWeight = truncateOneDecimal(s.todayTotalDryWeight + s.currentTicket.dryWeight);
                    s.todayAvgDrc =
                        s.todayLatexWeight > 0
                            ? truncateOneDecimal((s.todayTotalDryWeight / s.todayLatexWeight) * 100)
                            : s.currentTicket.drcPercent;
                }
            } else if (newStep === 5) {
                sc.visible = false;
            }

            if (s.autoFollowCam) {
                if (newStep === 1 || newStep === 2 || newStep === 3) focusCameraPreset('weigh_lab');
                else if (newStep === 5 || newStep === 6) focusCameraPreset('pit_pump');
                else if (newStep === 7 || newStep === 8) focusCameraPreset('truck');
            }

            const actionMap = {
                1: `🏍️ เกษตรกร (${s.currentTicket.farmerName}) นำน้ำยางสด ${s.currentTicket.freshVolume} กก. เข้าจุดชั่ง...`,
                2: `⚖️ ชั่งตวงน้ำยางสด (${s.currentTicket.freshVolume} กก.) และตักตัวอย่างส่งห้องแล็บ`,
                3: `🔬 ห้องแล็บกำลังอบหาค่าเปอร์เซ็นต์เนื้อยางแห้ง (%DRC = ${s.currentTicket.drcPercent.toFixed(1)}%)...`,
                4: `🧾 ออกบิลสำเร็จ! เนื้อยางแห้ง ${s.currentTicket.dryWeight} กก. • ยอดสุทธิ ${s.currentTicket.totalBaht.toLocaleString()} ฿`,
                5: `💧 เทน้ำยางสด (${s.currentTicket.freshVolume} กก.) ลงบ่อพักสะสม 500 กก.`,
                6: `🧪 บ่อพักครบ 500 กก.! เติมแอมโมเนีย + ยาขาว และเปิดใบพัดกวนผสม`,
                7: `⚡ เดินเครื่องปั๊มสูบน้ำยาง 500 กก. ผ่านท่อขึ้นสู่รถบรรทุกแท็งก์ 3,000 กก.`,
                8: `🚚 รถแท็งก์เต็มพิกัด 3,000 กก.! ออกเดินทางส่งโรงงานแปรรูป`
            };

            const chemMap = {
                6: 'กำลังเติมแอมโมเนีย + ยาขาว & ปั่นกวน',
                7: 'กำลังสูบน้ำยางขึ้นรถแท็งก์ 3,000 กก....'
            };

            syncReactState({
                actionText: actionMap[newStep] || 'กำลังปฏิบัติการ...',
                pitChemStatus: chemMap[newStep] || 'พร้อมรับน้ำยางสด'
            });
        };

        threeRefs.current.startStepOne = () => enterStep(1);

        // Start in Standby Pose for Live Mode
        setStandbyPose();

        // RESIZE HANDLER
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            const newAspect = w / h;
            camera.left = -d * newAspect;
            camera.right = d * newAspect;
            camera.top = d;
            camera.bottom = -d;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // MAIN 60FPS ANIMATION LOOP
        let elapsedTotal = 0;

        const animate = () => {
            threeRefs.current.animFrame = requestAnimationFrame(animate);
            const dt = Math.min(threeRefs.current.clock.getDelta(), 0.1);
            elapsedTotal += dt;

            if (threeRefs.current.camAnim) {
                const ca = threeRefs.current.camAnim;
                ca.progress += dt * 2.6;
                const t = Math.min(1, ca.progress);
                const ease = 1 - Math.pow(1 - t, 3);
                camera.position.lerpVectors(ca.startPos, ca.endPos, ease);
                controls.target.lerpVectors(ca.startTarget, ca.endTarget, ease);
                camera.zoom = THREE.MathUtils.lerp(ca.startZoom, ca.endZoom, ease);
                camera.updateProjectionMatrix();
                if (t >= 1) threeRefs.current.camAnim = null;
            }

            controls.update();

            const s = simRef.current;
            const actors = threeRefs.current.actors;

            // Gentle idle character breathing
            [actors.staffWeigh, actors.staffLab, actors.staffBill, actors.staffTransport].forEach((ch, idx) => {
                if (ch?.userData) {
                    const phase = elapsedTotal * 2.2 + idx;
                    ch.userData.headGroup.rotation.y = Math.sin(phase * 0.7) * 0.12;
                    ch.userData.leftArm.rotation.x = Math.sin(phase) * 0.06;
                    ch.userData.rightArm.rotation.x = -Math.sin(phase) * 0.06;
                }
            });

            // Gentle slow agitator spin if pit has real latex in Standby
            if (s.pitVolume > 0) {
                actors.mixerGroup.rotation.y += dt * 1.8;
            }

            // Active Step Simulation Progression (only when playing animation)
            if (s.isPlayingAnim && s.step >= 1 && !s.waitingManual) {
                const durations = { 1: 2.0, 2: 2.2, 3: 2.0, 4: 1.8, 5: 2.5, 6: 2.6, 7: 2.8, 8: 3.2 };
                const stepDur = durations[s.step] || 2.0;

                s.stepProgress += (dt * s.speed) / stepDur;
                const p = Math.min(1, s.stepProgress);
                const easeP = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

                if (s.step === 1) {
                    const curX = THREE.MathUtils.lerp(-22, -6.5, easeP);
                    const bounce = Math.abs(Math.sin(p * Math.PI * 10)) * 0.05 * (1 - p);
                    actors.motoGroup.position.set(curX, 0.08 + bounce, 9.5);
                    actors.motoWheelF.rotation.z -= dt * 14 * s.speed;
                    actors.motoWheelB.rotation.z -= dt * 14 * s.speed;
                    actors.activeBucket.position.set(curX - 0.85, 0.92 + bounce, 9.5);
                } else if (s.step === 2) {
                    actors.scaleHeadMat.emissiveIntensity = 0.4 + Math.sin(p * Math.PI * 6) * 0.35;
                    actors.staffWeigh.userData.rightArm.rotation.x = -Math.sin(p * Math.PI * 2) * 0.85;

                    if (p < 0.5) {
                        const sp = p * 2;
                        actors.activeBucket.position.set(
                            -6.5,
                            THREE.MathUtils.lerp(0.92, 0.52, sp) + Math.sin(sp * Math.PI) * 0.65,
                            THREE.MathUtils.lerp(9.5, 2.8, sp)
                        );
                    } else {
                        const sp = (p - 0.5) * 2;
                        actors.activeBucket.position.set(-6.5, 0.52, 2.8);
                        actors.sampleCup.position.set(
                            THREE.MathUtils.lerp(-6.5, -2.85, sp),
                            THREE.MathUtils.lerp(0.95, 1.75, sp) + Math.sin(sp * Math.PI) * 0.55,
                            THREE.MathUtils.lerp(2.8, -2.2, sp)
                        );
                    }
                } else if (s.step === 3) {
                    actors.sampleCup.position.set(-2.85, 1.75, -2.2);
                    actors.ovenWindowMat.emissiveIntensity = 0.6 + Math.abs(Math.sin(p * Math.PI * 8)) * 0.8;
                    actors.staffLab.userData.rightArm.rotation.x = -0.6 + Math.sin(p * Math.PI * 4) * 0.25;
                } else if (s.step === 4) {
                    actors.monitorMat.emissiveIntensity = 0.4 + Math.abs(Math.sin(p * Math.PI * 5)) * 0.7;
                    actors.paperSlipMesh.scale.y = THREE.MathUtils.lerp(0.05, 1.0, easeP);
                    actors.paperSlipMesh.position.y = 1.25 + easeP * 0.22;
                    actors.staffBill.userData.leftArm.rotation.x = -0.55 * Math.sin(p * Math.PI);
                } else if (s.step === 5) {
                    if (p < 0.55) {
                        const sp = p / 0.55;
                        const bx = THREE.MathUtils.lerp(-6.5, 3.6, sp);
                        const bz = THREE.MathUtils.lerp(2.8, 2.2, sp);
                        actors.activeBucket.position.set(bx, 1.35 + Math.sin(sp * Math.PI) * 0.35, bz);
                    } else {
                        const sp = (p - 0.55) / 0.45;
                        actors.activeBucket.position.set(3.6, 1.72, 2.2);
                        actors.activeBucket.rotation.z = -Math.sin(sp * Math.PI * 0.5) * (Math.PI * 0.55);

                        actors.pourStreamMat.opacity = Math.sin(sp * Math.PI) * 0.92;
                        actors.rippleRingMat.opacity = (1 - sp) * 0.85;
                        const rScale = 0.5 + sp * 3.2;
                        actors.rippleRing.scale.set(rScale, rScale, 1);

                        s.pitVolume = truncateOneDecimal(THREE.MathUtils.lerp(pitStartVol, pitTargetVol, sp));
                        updateVisualGauges();

                        actors.motoGroup.position.x = THREE.MathUtils.lerp(-6.5, 24, sp);
                        actors.motoWheelF.rotation.z -= dt * 16 * s.speed;
                        actors.motoWheelB.rotation.z -= dt * 16 * s.speed;
                    }
                    if (p >= 1) actors.activeBucket.visible = false;
                } else if (s.step === 6) {
                    actors.mixerGroup.rotation.y += dt * 15 * s.speed;
                    actors.rippleRingMat.opacity = 0.55;
                    const vortexScale = 1.2 + Math.sin(p * Math.PI * 6) * 0.45;
                    actors.rippleRing.scale.set(vortexScale, vortexScale, 1);
                    actors.pitLiquidMat.color.lerpColors(
                        new THREE.Color(0xffffff),
                        new THREE.Color(0xdbeafe),
                        Math.sin(p * Math.PI) * 0.65
                    );
                } else if (s.step === 7) {
                    actors.mixerGroup.rotation.y += dt * 7 * s.speed;
                    actors.pumpMat.emissiveIntensity = 0.3 + Math.abs(Math.sin(p * Math.PI * 8)) * 0.6;

                    actors.flowPulses.forEach((pulse, idx) => {
                        pulse.visible = true;
                        const flowT = (p * 3 + idx * 0.2) % 1;
                        if (flowT < 0.38) {
                            const vp = flowT / 0.38;
                            pulse.position.set(2.6, THREE.MathUtils.lerp(0.6, 3.95, vp), 0);
                        } else {
                            const hp = (flowT - 0.38) / 0.62;
                            pulse.position.set(THREE.MathUtils.lerp(2.6, 8.3, hp), 3.95, 0);
                        }
                    });

                    s.pitVolume = THREE.MathUtils.lerp(500, 0, p);
                    s.truckVolume = Math.min(s.truckMax, truckStartVol + 500 * p);
                    updateVisualGauges();
                } else if (s.step === 8) {
                    actors.beaconMat.emissiveIntensity = 0.5 + Math.abs(Math.sin(p * Math.PI * 12)) * 1.2;
                    actors.truckWheels.forEach(w => {
                        w.rotation.x += dt * 12 * s.speed;
                    });

                    if (p < 0.5) {
                        actors.truckGroup.position.z = THREE.MathUtils.lerp(2.2, 32, p * 2);
                    } else {
                        s.truckVolume = 0;
                        updateVisualGauges();
                        actors.truckGroup.position.z = THREE.MathUtils.lerp(-28, 2.2, (p - 0.5) * 2);
                    }
                    actors.truckLabel.position.z = actors.truckGroup.position.z;
                }

                // Transition to next step when progress reaches 1.0
                if (p >= 1) {
                    actors.ovenWindowMat.emissiveIntensity = 0.05;
                    actors.scaleHeadMat.emissiveIntensity = 0.2;
                    actors.pumpMat.emissiveIntensity = 0.05;
                    actors.activeBucket.rotation.set(0, 0, 0);
                    actors.pourStreamMat.opacity = 0;
                    actors.rippleRingMat.opacity = 0;
                    actors.flowPulses.forEach(fp => (fp.visible = false));

                    // In Live Mode: Stop after completing 1 bill cycle (Step 5) and lock to exact real figures!
                    if (s.dataMode === 'live' && s.step === 5) {
                        setStandbyPose();
                        syncReactState({
                            actionText: `🟢 แสดงแอนิเมชันบิลล่าสุดเสร็จสมบูรณ์ • ข้อมูลตรงกับระบบจริง (${s.todayLatexWeight.toLocaleString()} กก.)`
                        });
                        return;
                    }

                    let nextStep = 1;
                    if (s.step === 1) nextStep = 2;
                    else if (s.step === 2) nextStep = 3;
                    else if (s.step === 3) nextStep = 4;
                    else if (s.step === 4) nextStep = 5;
                    else if (s.step === 5) {
                        if (s.pitVolume >= s.pitMax - 0.5) nextStep = 6;
                        else nextStep = 1;
                    } else if (s.step === 6) nextStep = 7;
                    else if (s.step === 7) {
                        if (s.truckVolume >= s.truckMax - 1) nextStep = 8;
                        else if (s.dataMode === 'live') {
                            setStandbyPose();
                            return;
                        } else nextStep = 1;
                    } else if (s.step === 8) {
                        if (s.dataMode === 'demo') s.trucksDispatched++;
                        s.truckVolume = 0;
                        updateVisualGauges();
                        if (s.dataMode === 'live') {
                            setStandbyPose();
                            return;
                        }
                        nextStep = 1;
                    }

                    if (s.autoMode || s.dataMode === 'live') {
                        enterStep(nextStep);
                    } else {
                        s.waitingManual = true;
                        s.nextQueuedStep = nextStep;
                        syncReactState({
                            waitingManual: true,
                            actionText: `⏸️ [รอคำสั่ง] กดปุ่ม "ขั้นตอนถัดไป ▶" เพื่อเริ่มขั้นตอนที่ ${nextStep}`
                        });
                    }
                }
            }

            // Project 3D Floating Labels to 2D Screen Coordinates
            const halfW = container.clientWidth / 2;
            const halfH = container.clientHeight / 2;
            threeRefs.current.labels3D.forEach(item => {
                const pos = item.position.clone();
                pos.project(camera);
                if (pos.z > 1) {
                    item.element.style.opacity = '0';
                } else {
                    const x = pos.x * halfW + halfW;
                    const y = -(pos.y * halfH) + halfH;
                    item.element.style.opacity = '1';
                    item.element.style.left = `${x}px`;
                    item.element.style.top = `${y}px`;
                }
            });

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (threeRefs.current.animFrame) cancelAnimationFrame(threeRefs.current.animFrame);
            pmremGenerator.dispose();
            if (threeRefs.current.renderer?.domElement) {
                threeRefs.current.renderer.dispose();
                if (container.contains(threeRefs.current.renderer.domElement)) {
                    container.removeChild(threeRefs.current.renderer.domElement);
                }
            }
        };
    }, [focusCameraPreset, syncReactState]);

    // -------------------------------------------------------------------------
    // UI CONTROL HANDLERS
    // -------------------------------------------------------------------------
    const handleReplayLatestRealBill = () => {
        const s = simRef.current;
        if (s.realBills.length === 0) return;
        s.isPlayingAnim = true;
        s.waitingManual = false;
        if (threeRefs.current.startStepOne) {
            threeRefs.current.startStepOne();
        }
    };

    const handleStopLiveAnim = () => {
        if (threeRefs.current.setStandbyPose) {
            threeRefs.current.setStandbyPose();
        }
        syncReactState({
            actionText: `🟢 หยุดแอนิเมชันแล้ว • แสดงข้อมูลจริงปัจจุบัน (${simRef.current.todayLatexWeight.toLocaleString()} กก.)`
        });
    };

    const handleToggleAutoMode = () => {
        const s = simRef.current;
        s.autoMode = !s.autoMode;
        if (s.autoMode && s.waitingManual) {
            s.waitingManual = false;
            s.isPlayingAnim = true;
            s.step = s.nextQueuedStep || 1;
            s.stepProgress = 0;
        }
        syncReactState();
    };

    const handleNextManualStep = () => {
        const s = simRef.current;
        if (s.waitingManual) {
            s.waitingManual = false;
            s.isPlayingAnim = true;
            s.step = s.nextQueuedStep || 1;
            s.stepProgress = 0;
            syncReactState();
        }
    };

    const handleSetSpeed = (spd) => {
        simRef.current.speed = spd;
        syncReactState();
    };

    const handleToggleDataMode = (mode) => {
        const s = simRef.current;
        s.dataMode = mode;
        setDataMode(mode);

        if (mode === 'live') {
            s.autoMode = false;
            s.isPlayingAnim = false;
            s.waitingManual = false;
            if (threeRefs.current.setStandbyPose) {
                threeRefs.current.setStandbyPose();
            }
            loadRealSystemData(true);
        } else {
            // Switch to Demo Mode
            s.autoMode = true;
            s.isPlayingAnim = true;
            s.waitingManual = false;
            if (s.rubberPrice <= 0) s.rubberPrice = 65.0;
            if (threeRefs.current.startStepOne) {
                threeRefs.current.startStepOne();
            }
        }
    };

    const handleFastFillPit = () => {
        const s = simRef.current;
        if (s.dataMode === 'live') {
            handleToggleDataMode('demo');
        }
        s.pitVolume = 500;
        s.isPlayingAnim = true;
        s.waitingManual = false;
        s.step = 6;
        s.stepProgress = 0;
        if (threeRefs.current.actors.activeBucket) threeRefs.current.actors.activeBucket.visible = false;
        if (threeRefs.current.actors.sampleCup) threeRefs.current.actors.sampleCup.visible = false;
        if (threeRefs.current.updateVisualGauges) threeRefs.current.updateVisualGauges();
        syncReactState({
            pitVolume: 500,
            step: 6,
            pitChemStatus: 'กำลังเติมแอมโมเนีย + ยาขาว & ปั่นกวน',
            actionText: '⚡ [โหมดจำลอง] เร่งน้ำยางเต็มบ่อ 500L! เริ่มเติมแอมโมเนียและเปิดใบพัดกวนผสม'
        });
    };

    const handleFastFillTruck = () => {
        const s = simRef.current;
        if (s.dataMode === 'live') {
            handleToggleDataMode('demo');
        }
        s.truckVolume = 2500;
        if (threeRefs.current.updateVisualGauges) threeRefs.current.updateVisualGauges();
        syncReactState({ truckVolume: 2500 });
    };

    const handleToggleLabels = () => {
        setSimState(prev => {
            const nextShow = !prev.showLabels;
            if (labelsContainerRef.current) {
                labelsContainerRef.current.style.display = nextShow ? 'block' : 'none';
            }
            return { ...prev, showLabels: nextShow };
        });
    };

    const handleToggleAutoFollow = () => {
        const nextVal = !autoFollowCam;
        setAutoFollowCam(nextVal);
        simRef.current.autoFollowCam = nextVal;
        if (!nextVal) focusCameraPreset('overview');
    };

    const brandInitial = String(storeName || 'R').trim().charAt(0).toUpperCase();

    return (
        <div className="relative w-full h-[calc(100vh-4.5rem)] overflow-hidden font-sans select-none bg-[#eef2f6]">
            {/* 3D Canvas Container */}
            <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

            {/* Floating 3D Labels Container */}
            <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none z-10" />

            {/* Custom Glassmorphism & 3D Label Styles */}
            <style>{`
                .label-3d {
                    position: absolute;
                    pointer-events: none;
                    transform: translate(-50%, -100%);
                    background: rgba(255, 255, 255, 0.95);
                    color: #0f172a;
                    padding: 4px 10px;
                    border-radius: 9px;
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                    border: 1.5px solid rgba(16, 185, 129, 0.5);
                    box-shadow: 0 6px 16px -3px rgba(15, 23, 42, 0.14);
                    transition: opacity 0.2s;
                    z-index: 5;
                }
                .label-3d::after {
                    content: '';
                    position: absolute;
                    bottom: -5px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 5px 5px 0;
                    border-style: solid;
                    border-color: rgba(255, 255, 255, 0.95) transparent;
                }
                .glass-panel-3d {
                    background: rgba(255, 255, 255, 0.92);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.1), 0 4px 10px -3px rgba(15, 23, 42, 0.05);
                }
            `}</style>

            {/* TOP HEADER NAVBAR */}
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-2 pointer-events-none">
                {/* Brand & Data Source Switcher */}
                <div className="glass-panel-3d px-3.5 py-2 rounded-2xl pointer-events-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => navigate('/')}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition-colors"
                            title="กลับหน้าหลัก Dashboard 1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-base shadow-md">
                            {brandInitial}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight">
                                    {storeName}
                                </h1>
                                <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                                        dataMode === 'live'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                                    {dataMode === 'live' ? `ข้อมูลจริง (${realBills.length} บิล)` : 'โหมดสาธิต'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 hidden sm:block">
                                ซิงค์ข้อมูลตรงกับหน้า Dashboard หลัก • ราคาน้ำยางวันนี้ {simState.rubberPrice.toFixed(2)} บ./กก.
                            </p>
                        </div>
                    </div>

                    {/* Live vs Demo Switcher + Refresh */}
                    <div className="flex items-center gap-1.5">
                        <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center">
                            <button
                                onClick={() => handleToggleDataMode('live')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                    dataMode === 'live'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                🟢 ข้อมูลจริง
                            </button>
                            <button
                                onClick={() => handleToggleDataMode('demo')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                    dataMode === 'demo'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                🎮 สาธิต
                            </button>
                        </div>
                        <button
                            onClick={() => loadRealSystemData()}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="ซิงค์ข้อมูลล่าสุดจากระบบ"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingData ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Desktop KPI Metric Cards (100% Matching Dashboard 1) */}
                <div className="hidden lg:flex items-center gap-2 pointer-events-auto">
                    <div className="glass-panel-3d px-3 py-2 rounded-2xl flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm">
                            🏷️
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-semibold">ราคาน้ำยางวันนี้</div>
                            <div className="text-sm font-extrabold text-teal-700">
                                {simState.rubberPrice.toFixed(2)} บ./กก.
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel-3d px-3 py-2 rounded-2xl flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                            💧
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                                น้ำยางสดวันนี้ ({simState.farmerCount} บิล)
                            </div>
                            <div className="text-sm font-extrabold text-slate-900">
                                {simState.todayLatexWeight.toLocaleString('th-TH', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                })}{' '}
                                กก.
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel-3d px-3 py-2 rounded-2xl flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                            🔬
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-semibold">%ยางแห้งเฉลี่ย (DRC)</div>
                            <div className="text-sm font-extrabold text-amber-600">
                                {simState.todayAvgDrc.toFixed(1)}%{' '}
                                <span className="text-[11px] font-semibold text-slate-500">
                                    ({simState.todayTotalDryWeight.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.)
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel-3d px-3 py-2 rounded-2xl flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            💰
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-semibold">ยอดรับซื้อวันนี้</div>
                            <div className="text-sm font-extrabold text-emerald-700">
                                {simState.totalMoneyPaid.toLocaleString('th-TH', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                })}{' '}
                                ฿
                            </div>
                        </div>
                    </div>
                </div>

                {/* Camera Presets */}
                <div className="glass-panel-3d p-1.5 rounded-2xl pointer-events-auto flex items-center gap-1 overflow-x-auto">
                    <span className="text-xs text-slate-500 px-1.5 font-semibold hidden sm:inline">มุมกล้อง:</span>
                    <button
                        onClick={() => focusCameraPreset('overview')}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition shrink-0"
                    >
                        ภาพรวม
                    </button>
                    <button
                        onClick={() => focusCameraPreset('weigh_lab')}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition shrink-0"
                    >
                        จุดชั่ง & แล็บ
                    </button>
                    <button
                        onClick={() => focusCameraPreset('pit_pump')}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition shrink-0"
                    >
                        บ่อ & เคมี
                    </button>
                    <button
                        onClick={() => focusCameraPreset('truck')}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition shrink-0"
                    >
                        รถแท็งก์
                    </button>
                    <button
                        onClick={handleToggleAutoFollow}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1 ${
                            autoFollowCam
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        <Video className="w-3.5 h-3.5" />
                        <span>ตามอัตโนมัติ</span>
                    </button>
                    <button
                        onClick={handleToggleLabels}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition shrink-0 ${
                            simState.showLabels
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                        ป้าย: {simState.showLabels ? 'เปิด' : 'ปิด'}
                    </button>
                </div>
            </div>

            {/* LEFT CONTROL PANEL (FOUNDATIONAL DATA + ANIMATION CONTROLS) */}
            <div
                className={`fixed bottom-16 left-2.5 right-2.5 md:bottom-auto md:right-auto md:top-20 md:left-2.5 z-20 md:w-80 max-h-[52vh] md:max-h-[calc(100vh-6.5rem)] overflow-y-auto glass-panel-3d rounded-2xl p-4 pointer-events-auto ${
                    activeMobileTab === 'controls' ? 'flex flex-col' : 'hidden md:flex flex-col'
                } gap-3.5 transition-all`}
            >
                <div className="flex md:hidden justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-emerald-700">⚙️ ข้อมูลพื้นฐาน & การควบคุมแอนิเมชัน</span>
                    <button
                        onClick={() => setActiveMobileTab('none')}
                        className="text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-100"
                    >
                        ปิด ✕
                    </button>
                </div>

                {/* Foundational Store Summary (Matches Dashboard 1 100%) */}
                <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1">
                        <span className="text-[11px] font-extrabold text-slate-700">📊 ข้อมูลจริงวันนี้ (ตรงกับหน้าหลัก)</span>
                        <span className="text-[10px] font-bold text-emerald-600">{format(new Date(), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">ชื่อร้าน/ลานรับซื้อ:</span>
                        <span className="font-bold text-slate-900 truncate max-w-[150px]">{storeName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">ราคาน้ำยางสดวันนี้:</span>
                        <span className="font-bold text-teal-700">{simState.rubberPrice.toFixed(2)} บ./กก.</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">น้ำยางสดรับเข้าวันนี้:</span>
                        <span className="font-bold text-slate-900">
                            {simState.todayLatexWeight.toLocaleString('th-TH', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1
                            })}{' '}
                            กก.
                        </span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">เนื้อยางแห้งรวมวันนี้:</span>
                        <span className="font-bold text-slate-900">
                            {simState.todayTotalDryWeight.toLocaleString('th-TH', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1
                            })}{' '}
                            กก.
                        </span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">%ยางแห้งเฉลี่ย (%DRC):</span>
                        <span className="font-bold text-amber-600">{simState.todayAvgDrc.toFixed(1)} %</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-dashed border-slate-200">
                        <span className="text-slate-600 font-semibold">ยอดรับซื้อรวมวันนี้:</span>
                        <span className="font-extrabold text-emerald-700">
                            {simState.totalMoneyPaid.toLocaleString('th-TH', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1
                            })}{' '}
                            บาท
                        </span>
                    </div>
                </div>

                {/* Animation Controls depending on Live vs Demo mode */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">การควบคุมแอนิเมชัน 3D</h2>
                        <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                dataMode === 'live'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-800'
                            }`}
                        >
                            {dataMode === 'live'
                                ? simState.isPlayingAnim
                                    ? 'กำลังเล่นบิลจริง'
                                    : 'พร้อมรับบิลจริง (Standby)'
                                : simState.autoMode
                                ? 'สาธิตอัตโนมัติ'
                                : 'สาธิตทีละขั้น'}
                        </span>
                    </div>

                    {dataMode === 'live' ? (
                        <div className="space-y-2 mb-2">
                            <p className="text-[11px] text-slate-500 leading-relaxed bg-emerald-50/70 border border-emerald-200 rounded-lg p-2">
                                ใน <b>โหมดข้อมูลจริง</b> แอนิเมชันจะไม่วิ่งวนซ้ำเอง เพื่อรักษายอดน้ำยางให้ตรงกับข้อมูลจริง 100% (จะทำงานเมื่อมีการบันทึกบิลใหม่ หรือกดปุ่มด้านล่าง)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReplayLatestRealBill}
                                    disabled={realBills.length === 0 || simState.isPlayingAnim}
                                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white transition shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <Play className="w-3.5 h-3.5" />
                                    <span>
                                        {realBills.length > 0
                                            ? 'เล่นจำลองบิลจริงล่าสุด (1 รอบ)'
                                            : 'ยังไม่มีบิลวันนี้ให้เล่น'}
                                    </span>
                                </button>
                                {simState.isPlayingAnim && (
                                    <button
                                        onClick={handleStopLiveAnim}
                                        className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm flex items-center gap-1"
                                    >
                                        <Square className="w-3.5 h-3.5" /> หยุด
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <button
                                    onClick={handleToggleAutoMode}
                                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm"
                                >
                                    {simState.autoMode ? 'โหมด: อัตโนมัติ' : 'โหมด: กดทีละขั้น'}
                                </button>
                                <button
                                    onClick={handleNextManualStep}
                                    disabled={simState.autoMode || !simState.waitingManual}
                                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white transition shadow-sm"
                                >
                                    ขั้นตอนถัดไป ▶
                                </button>
                            </div>
                            <div className="space-y-1.5 mb-2">
                                <button
                                    onClick={handleFastFillPit}
                                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition flex items-center justify-center gap-1.5"
                                >
                                    <span>⚡</span> เร่งเติมบ่อครบ 500L ทันที (ทดสอบสูบ)
                                </button>
                                <button
                                    onClick={handleFastFillTruck}
                                    className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition flex items-center justify-center gap-1.5"
                                >
                                    <span>🚚</span> เติมรถแท็งก์เป็น 2,500L (รอดำเนินการ)
                                </button>
                            </div>
                        </>
                    )}

                    <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-600 pl-2 font-medium">ความเร็วแอนิเมชัน:</span>
                        <div className="flex gap-1">
                            {[1, 2, 5].map(spd => (
                                <button
                                    key={spd}
                                    onClick={() => handleSetSpeed(spd)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                        simState.speed === spd
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    }`}
                                >
                                    {spd}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 8-Step Workflow List */}
                <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        สถานะลำดับการทำงาน (8 ขั้นตอน)
                    </h3>
                    <div className="space-y-1 text-xs">
                        {[
                            '1. เกษตรกรนำน้ำยางสดเข้าจุดชั่ง',
                            '2. ชั่งน้ำหนัก & ตักตัวอย่างส่งตรวจ %DRC',
                            '3. อบหาค่า %DRC ในห้องแล็บ',
                            '4. ออกบิลคำนวณยอดเงินรับซื้อ',
                            '5. เทน้ำยางลงบ่อพัก (สะสม 500 กก.)',
                            '6. เติมแอมโมเนีย + ยาขาว & กวนผสม',
                            '7. สูบน้ำยาง 500 กก. ขึ้นรถแท็งก์ 3,000 กก.',
                            '8. รถบรรทุกเต็ม 3,000 กก. วิ่งส่งโรงงาน'
                        ].map((label, idx) => {
                            const stepNum = idx + 1;
                            const isActive = simState.step === stepNum;
                            return (
                                <div
                                    key={stepNum}
                                    className={`p-1.5 rounded-lg border transition-all duration-300 ${
                                        isActive
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-500 font-bold pl-2.5 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200'
                                    }`}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT TELEMETRY & LIVE RECEIPT PANEL */}
            <div
                className={`fixed bottom-16 left-2.5 right-2.5 md:bottom-auto md:left-auto md:top-20 md:right-2.5 z-20 md:w-80 max-h-[52vh] md:max-h-[calc(100vh-6.5rem)] overflow-y-auto glass-panel-3d rounded-2xl p-4 pointer-events-auto ${
                    activeMobileTab === 'status' ? 'flex flex-col' : 'hidden md:flex flex-col'
                } gap-3.5 transition-all`}
            >
                <div className="flex md:hidden justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-blue-700">🧾 บิลรับซื้อ & ปริมาณน้ำยางจริง</span>
                    <button
                        onClick={() => setActiveMobileTab('none')}
                        className="text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-100"
                    >
                        ปิด ✕
                    </button>
                </div>

                {/* Current Action Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-0.5">
                        สถานะระบบปัจจุบัน
                    </div>
                    <div className="text-xs font-semibold text-emerald-950 leading-snug">{simState.actionText}</div>
                </div>

                {/* Storage Gauges */}
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ปริมาณน้ำยางวันนี้</h2>
                        <span className="text-xs font-extrabold text-emerald-700">
                            รวม{' '}
                            {simState.todayLatexWeight.toLocaleString('th-TH', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1
                            })}{' '}
                            กก.
                        </span>
                    </div>

                    {/* Pit 500L */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-end mb-1">
                            <div>
                                <span className="text-xs font-semibold text-slate-800 block">บ่อพักน้ำยางสด (500 กก.)</span>
                                <span className="text-[10px] text-slate-500">{simState.pitChemStatus}</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-600">
                                {simState.pitVolume.toFixed(1)} / 500 กก.
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (simState.pitVolume / simState.pitMax) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Truck 3,000L */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-end mb-1">
                            <div>
                                <span className="text-xs font-semibold text-slate-800 block">รถบรรทุกน้ำยาง (แท็งก์)</span>
                                <span className="text-[10px] text-slate-500">
                                    สูบจากบ่อพักแล้ว: {Math.floor(simState.truckVolume / 500)} / 6 รอบ
                                </span>
                            </div>
                            <span className="text-xs font-bold text-blue-600">
                                {simState.truckVolume.toFixed(0)} / 3,000 กก.
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (simState.truckVolume / simState.truckMax) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Live Purchase Receipt Card */}
                <div className="bg-white text-slate-900 rounded-xl p-3.5 shadow-md border border-slate-200 border-l-4 border-l-emerald-500 relative">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-xs text-slate-900">
                                    {dataMode === 'live' ? 'บิลรับซื้อล่าสุดวันนี้' : 'บิลจำลองการรับซื้อ'}
                                </h3>
                                <span
                                    className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                                        simState.currentTicket.isReal
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}
                                >
                                    {simState.currentTicket.isReal ? 'ข้อมูลจริง' : 'สาธิต'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500">{storeName}</p>
                        </div>
                        <span className="text-[11px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            #{simState.currentTicket.id}
                        </span>
                    </div>

                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">เกษตรกร:</span>
                            <span className="font-semibold text-slate-800">{simState.currentTicket.farmerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">น้ำหนักน้ำยางสด:</span>
                            <span className="font-semibold text-slate-800">
                                {simState.currentTicket.freshVolume.toFixed(1)} กก.
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">เปอร์เซ็นต์ยางแห้ง (%DRC):</span>
                            <span className="font-bold text-amber-600">
                                {simState.currentTicket.drcPercent.toFixed(1)} %
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">น้ำหนักยางแห้งสุทธิ:</span>
                            <span className="font-semibold text-slate-800">
                                {simState.currentTicket.dryWeight.toFixed(2)} กก.
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">ราคาน้ำยางวันนี้:</span>
                            <span className="font-semibold text-slate-800">
                                {simState.rubberPrice.toFixed(2)} ฿/กก.
                            </span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1.5 flex justify-between items-baseline">
                            <span className="font-bold text-slate-700">ยอดเงินสุทธิ:</span>
                            <span className="text-sm font-extrabold text-emerald-600">
                                {simState.currentTicket.totalBaht.toLocaleString('th-TH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}{' '}
                                บาท
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-2 left-2 right-2 z-30 md:hidden glass-panel-3d p-1.5 rounded-2xl flex items-center justify-between gap-1 pointer-events-auto shadow-lg">
                <button
                    onClick={() => setActiveMobileTab('none')}
                    className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                        activeMobileTab === 'none' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-700'
                    }`}
                >
                    <Eye className="w-3.5 h-3.5" /> <span>ดู 3D</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('controls')}
                    className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                        activeMobileTab === 'controls'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                >
                    <SettingsIcon className="w-3.5 h-3.5" /> <span>ข้อมูล/ควบคุม</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('status')}
                    className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                        activeMobileTab === 'status'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                >
                    <FileText className="w-3.5 h-3.5" /> <span>บิล/น้ำยาง</span>
                </button>
                {realBills.length > 0 && (
                    <button
                        onClick={handleReplayLatestRealBill}
                        title="เล่นแอนิเมชันบิลล่าสุด"
                        className="py-2 px-2.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white transition shrink-0"
                    >
                        ▶ เล่นบิล
                    </button>
                )}
            </div>
        </div>
    );
};

export default Dashboard3D;

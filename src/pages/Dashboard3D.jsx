import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
    LayoutDashboard, 
    Truck, 
    Droplets, 
    Scale, 
    Layers, 
    Clock, 
    Sparkles, 
    RefreshCw, 
    TrendingUp, 
    CheckCircle2,
    ArrowLeft,
    FastForward,
    Play,
    Pause,
    Eye,
    Settings as SettingsIcon,
    FileText,
    Zap
} from 'lucide-react';
import { fetchDashboardData, getSettings } from '../services/apiService';

export const Dashboard3D = () => {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const labelsContainerRef = useRef(null);

    // Simulation Config & State
    const [simState, setSimState] = useState({
        autoMode: true,
        speed: 1,
        step: 1,
        rubberPrice: 65.00,
        pitVolume: 0,
        pitMax: 500,
        truckVolume: 0,
        truckMax: 3000,
        farmerCount: 0,
        trucksDispatched: 0,
        totalMoneyPaid: 0,
        currentTicket: {
            id: 'RT-001',
            farmerName: 'นายสมชาย',
            freshVolume: 45.0,
            drcPercent: 32.5,
            dryWeight: 14.63,
            totalBaht: 950.95
        },
        actionText: 'กำลังรอเกษตรกรเข้าสู่จุดรับซื้อ...',
        pitChemStatus: 'รอรับน้ำยางสด',
        showLabels: true,
        waitingManual: false
    });

    const [activeMobileTab, setActiveMobileTab] = useState('none'); // 'none' | 'controls' | 'status'
    const [storeName, setStoreName] = useState('RubberTrade Co., Ltd.');

    // References to Three.js objects
    const threeRefs = useRef({
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        animFrame: null,
        clock: new THREE.Clock(),
        labels3D: [],
        camAnim: null,
        actors: {}
    });

    // Load initial real store stats if available
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [dashData, settingsRes] = await Promise.all([
                    fetchDashboardData(true),
                    getSettings()
                ]);
                if (settingsRes?.companyName) {
                    setStoreName(settingsRes.companyName);
                }
                if (dashData?.dailyPrice) {
                    setSimState(prev => ({
                        ...prev,
                        rubberPrice: Number(dashData.dailyPrice) || prev.rubberPrice
                    }));
                }
            } catch (e) {
                console.warn('Dashboard3D load error:', e);
            }
        };
        loadInitialData();
    }, []);

    // -------------------------------------------------------------------------
    // THREE.JS SETUP & LIFECYCLE
    // -------------------------------------------------------------------------
    useEffect(() => {
        const container = containerRef.current;
        const labelsContainer = labelsContainerRef.current;
        if (!container || !labelsContainer) return;

        labelsContainer.innerHTML = '';
        threeRefs.current.labels3D = [];

        // 1. Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f9);
        scene.fog = new THREE.FogExp2(0xf1f5f9, 0.008);
        threeRefs.current.scene = scene;

        // 2. Camera (Strict Isometric Orthographic Camera)
        const aspect = container.clientWidth / container.clientHeight;
        const d = 24;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 300);
        camera.position.set(45, 45, 45);
        camera.lookAt(0, 1, 0);
        threeRefs.current.camera = camera;

        // 3. Renderer with Soft Shadows
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
        threeRefs.current.renderer = renderer;

        // 4. Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.6;
        controls.zoomSpeed = 1.2;
        controls.enablePan = true;
        controls.target.set(0, 1, 0);
        threeRefs.current.controls = controls;

        // 5. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(25, 40, 25);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        const shadowDim = 32;
        dirLight.shadow.camera.left = -shadowDim;
        dirLight.shadow.camera.right = shadowDim;
        dirLight.shadow.camera.top = shadowDim;
        dirLight.shadow.camera.bottom = -shadowDim;
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        // Helper: Floating 3D Label
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

        // Helper: Canvas Texture for Signboard
        function createSignboardTexture(title, subtitle) {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            const grad = ctx.createLinearGradient(0, 0, 1024, 0);
            grad.addColorStop(0, '#047857');
            grad.addColorStop(0.5, '#059669');
            grad.addColorStop(1, '#047857');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1024, 256);

            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 10;
            ctx.strokeRect(12, 12, 1000, 232);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 64px Kanit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, 512, 115);

            ctx.fillStyle = '#fde047';
            ctx.font = '36px Kanit, sans-serif';
            ctx.fillText(subtitle, 512, 185);

            return new THREE.CanvasTexture(canvas);
        }

        // Helper: Character
        function createCharacter(shirtColor, hatColor = null) {
            const group = new THREE.Group();
            const legGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.7, 12);
            const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
            const leftLeg = new THREE.Mesh(legGeo, pantsMat);
            leftLeg.position.set(-0.18, 0.35, 0);
            leftLeg.castShadow = true;
            const rightLeg = new THREE.Mesh(legGeo, pantsMat);
            rightLeg.position.set(0.18, 0.35, 0);
            rightLeg.castShadow = true;
            group.add(leftLeg, rightLeg);

            const bodyGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.85, 16);
            const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5 });
            const body = new THREE.Mesh(bodyGeo, shirtMat);
            body.position.y = 1.1;
            body.castShadow = true;
            group.add(body);

            const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.5 });
            const head = new THREE.Mesh(headGeo, skinMat);
            head.position.y = 1.8;
            head.castShadow = true;
            group.add(head);

            if (hatColor) {
                const hatGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
                const hatMat = new THREE.MeshStandardMaterial({ color: hatColor });
                const hat = new THREE.Mesh(hatGeo, hatMat);
                hat.position.y = 2.02;
                group.add(hat);
            }
            return group;
        }

        // Helper: Latex Bucket
        function createLatexBucket(scale = 1) {
            const group = new THREE.Group();
            const cylGeo = new THREE.CylinderGeometry(0.38 * scale, 0.32 * scale, 0.75 * scale, 20);
            const bucketMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
            const mesh = new THREE.Mesh(cylGeo, bucketMat);
            mesh.position.y = 0.375 * scale;
            mesh.castShadow = true;
            group.add(mesh);

            const latexGeo = new THREE.CircleGeometry(0.35 * scale, 20);
            const latexMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const latexTop = new THREE.Mesh(latexGeo, latexMat);
            latexTop.rotation.x = -Math.PI / 2;
            latexTop.position.y = 0.73 * scale;
            group.add(latexTop);
            return group;
        }

        // ---------------------------------------------------------------------
        // ENVIRONMENT & FACILITY BUILDING
        // ---------------------------------------------------------------------
        const groundGeo = new THREE.PlaneGeometry(90, 90);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Roads
        const roadMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8 });
        const frontRoad = new THREE.Mesh(new THREE.BoxGeometry(50, 0.05, 4.2), roadMat);
        frontRoad.position.set(0, 0.03, 9.5);
        frontRoad.receiveShadow = true;
        scene.add(frontRoad);

        const sideRoad = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.05, 46), roadMat);
        sideRoad.position.set(13.5, 0.03, 0);
        sideRoad.receiveShadow = true;
        scene.add(sideRoad);

        // Facility Building (RubberTrade)
        const facilityGroup = new THREE.Group();
        const floorGeo = new THREE.BoxGeometry(19, 0.25, 12);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
        const facilityFloor = new THREE.Mesh(floorGeo, floorMat);
        facilityFloor.position.set(-1, 0.125, 0);
        facilityFloor.receiveShadow = true;
        facilityGroup.add(facilityFloor);

        // Pillars
        const pillarGeo = new THREE.CylinderGeometry(0.22, 0.22, 6.2, 12);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.3, roughness: 0.4 });
        [[-9.8, 5.5], [7.8, 5.5], [-9.8, -5.5], [7.8, -5.5], [-1, 5.5], [-1, -5.5]].forEach(([px, pz]) => {
            const p = new THREE.Mesh(pillarGeo, pillarMat);
            p.position.set(px, 3.1, pz);
            p.castShadow = true;
            facilityGroup.add(p);
        });

        // Roof
        const roofGeo = new THREE.BoxGeometry(20.5, 0.35, 13.5);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(-1, 6.3, 0);
        roof.castShadow = true;
        facilityGroup.add(roof);

        // Signboard
        const signTex = createSignboardTexture('RubberTrade Co., Ltd.', 'ระบบบริหารจัดการและจำลองลานรับซื้อน้ำยางสด • ISO Standard');
        const signGeo = new THREE.BoxGeometry(11, 2.2, 0.3);
        const signMat = new THREE.MeshStandardMaterial({ map: signTex });
        const signSideMat = new THREE.MeshStandardMaterial({ color: 0x064e3b });
        const signboard = new THREE.Mesh(signGeo, [signSideMat, signSideMat, signSideMat, signSideMat, signMat, signSideMat]);
        signboard.position.set(-1, 7.6, 6.6);
        facilityGroup.add(signboard);
        scene.add(facilityGroup);

        // Weighing Station
        const scalePlatform = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.2, 2.0),
            new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.3 })
        );
        scalePlatform.position.set(-6.5, 0.35, 2.8);
        scalePlatform.castShadow = true;
        scene.add(scalePlatform);

        const staffWeigh = createCharacter(0x2563eb, 0x1d4ed8);
        staffWeigh.position.set(-8.2, 0.25, 2.8);
        staffWeigh.rotation.y = Math.PI / 2;
        scene.add(staffWeigh);
        createFloatingLabel('⚖️ จุดชั่งน้ำหนัก', new THREE.Vector3(-6.5, 2.8, 2.8), '#0ea5e9');

        // DRC Lab Station
        const labTable = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.9, 1.6),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
        );
        labTable.position.set(-2.2, 0.75, -2.2);
        labTable.castShadow = true;
        scene.add(labTable);

        const drcOven = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.75, 0.85),
            new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        drcOven.position.set(-2.8, 1.6, -2.2);
        drcOven.castShadow = true;
        scene.add(drcOven);

        const ovenWindowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0xf59e0b, emissiveIntensity: 0 });
        const ovenWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), ovenWindowMat);
        ovenWindow.position.set(-2.8, 1.6, -1.76);
        scene.add(ovenWindow);

        const staffLab = createCharacter(0xffffff, 0x0ea5e9);
        staffLab.position.set(-2.2, 0.25, -3.6);
        scene.add(staffLab);
        createFloatingLabel('🔬 ห้องแล็บ %DRC', new THREE.Vector3(-2.2, 3.0, -2.2), '#f59e0b');

        // Billing Station
        const billDesk = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.9, 1.5),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
        );
        billDesk.position.set(2.5, 0.75, -2.2);
        billDesk.castShadow = true;
        scene.add(billDesk);

        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0ea5e9, emissiveIntensity: 0.2 });
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.1), monitorMat);
        monitor.position.set(2.1, 1.5, -2.2);
        scene.add(monitor);

        const staffBill = createCharacter(0x10b981);
        staffBill.position.set(2.5, 0.25, -3.5);
        scene.add(staffBill);
        createFloatingLabel('🧾 จุดออกบิล', new THREE.Vector3(2.5, 3.0, -2.2), '#10b981');

        // Collection Pit (500L) + Agitator & Chemicals
        const pitGroup = new THREE.Group();
        pitGroup.position.set(5.2, 0.25, 2.2);

        const pitOuter = new THREE.Mesh(
            new THREE.BoxGeometry(3.8, 1.4, 3.4),
            new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 })
        );
        pitOuter.position.y = 0.7;
        pitOuter.castShadow = true;
        pitGroup.add(pitOuter);

        const pitLiquidGeo = new THREE.BoxGeometry(3.25, 1.2, 2.85);
        const pitLiquidMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            emissive: 0xffffff,
            emissiveIntensity: 0.15
        });
        const pitLiquidMesh = new THREE.Mesh(pitLiquidGeo, pitLiquidMat);
        pitLiquidMesh.position.y = 0.15;
        pitLiquidMesh.scale.y = 0.02;
        pitGroup.add(pitLiquidMesh);

        // Agitator Mixer
        const mixerBridge = new THREE.Mesh(
            new THREE.BoxGeometry(4.0, 0.18, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 })
        );
        mixerBridge.position.y = 1.6;
        pitGroup.add(mixerBridge);

        const mixerGroup = new THREE.Group();
        mixerGroup.position.set(0, 1.45, 0);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), pillarMat);
        shaft.position.y = -0.5;
        const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
        blade1.position.y = -1.0;
        const blade2 = blade1.clone();
        blade2.rotation.y = Math.PI / 2;
        mixerGroup.add(shaft, blade1, blade2);
        pitGroup.add(mixerGroup);

        // Chem Tanks
        const ammoniaTank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 1.2, 20),
            new THREE.MeshStandardMaterial({ color: 0x0284c7 })
        );
        ammoniaTank.position.set(-1.2, 0.6, -2.3);
        pitGroup.add(ammoniaTank);

        const whiteChemTank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 1.2, 20),
            new THREE.MeshStandardMaterial({ color: 0xeab308 })
        );
        whiteChemTank.position.set(-0.1, 0.6, -2.3);
        pitGroup.add(whiteChemTank);

        // Pump & Pipes
        const pumpMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.3 });
        const pumpMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), pumpMat);
        pumpMesh.position.set(2.5, 0.4, 0);
        pitGroup.add(pumpMesh);

        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5 });
        const pipeVert = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4), pipeMat);
        pipeVert.position.set(2.5, 2.1, 0);
        const pipeHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.8), pipeMat);
        pipeHoriz.rotation.z = Math.PI / 2;
        pipeHoriz.position.set(5.4, 3.7, 0);
        pitGroup.add(pipeVert, pipeHoriz);

        scene.add(pitGroup);

        const staffTransport = createCharacter(0xf97316, 0xc2410c);
        staffTransport.position.set(5.2, 0.25, -1.2);
        scene.add(staffTransport);

        const pitLabel = createFloatingLabel('💧 บ่อพักน้ำยาง 500 ลิตร', new THREE.Vector3(5.2, 3.1, 2.2), '#10b981');

        // Tanker Truck (3,000L)
        const truckGroup = new THREE.Group();
        truckGroup.position.set(13.5, 0.1, 2.2);

        const chassis = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.5, 9.2),
            new THREE.MeshStandardMaterial({ color: 0x1e293b })
        );
        chassis.position.y = 0.7;
        chassis.castShadow = true;
        truckGroup.add(chassis);

        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 2.2, 2.4),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
        );
        cabin.position.set(0, 2.1, 3.2);
        cabin.castShadow = true;
        truckGroup.add(cabin);

        const windshield = new THREE.Mesh(
            new THREE.PlaneGeometry(2.6, 1.0),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 })
        );
        windshield.position.set(0, 2.35, 4.41);
        truckGroup.add(windshield);

        const tankCylGeo = new THREE.CylinderGeometry(1.4, 1.4, 6.0, 24);
        tankCylGeo.rotateX(Math.PI / 2);
        const tankShell = new THREE.Mesh(
            tankCylGeo,
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.3, roughness: 0.3, transparent: true, opacity: 0.7 })
        );
        tankShell.position.set(0, 2.4, -1.2);
        truckGroup.add(tankShell);

        const truckLiquidMesh = new THREE.Mesh(
            new THREE.BoxGeometry(2.3, 2.1, 5.7),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0ea5e9, emissiveIntensity: 0.2 })
        );
        truckLiquidMesh.position.set(0, 1.35, -1.2);
        truckLiquidMesh.scale.y = 0.01;
        truckGroup.add(truckLiquidMesh);

        const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        [[-1.6, 0.55, 3.2], [1.6, 0.55, 3.2], [-1.6, 0.55, -0.5], [1.6, 0.55, -0.5], [-1.6, 0.55, -2.8], [1.6, 0.55, -2.8]].forEach(([wx, wy, wz]) => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(wx, wy, wz);
            truckGroup.add(w);
        });

        scene.add(truckGroup);
        const truckLabel = createFloatingLabel('🚚 รถบรรทุกน้ำยาง (3,000L)', new THREE.Vector3(13.5, 4.6, 2.2), '#0ea5e9');

        // Dynamic Actors (Motorcycle, Bucket & Sample Cup)
        const motoGroup = new THREE.Group();
        const motoBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        motoBody.position.y = 0.5;
        const motoWheelF = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), wheelMat);
        motoWheelF.rotation.x = Math.PI / 2;
        motoWheelF.position.set(0.65, 0.3, 0);
        const motoWheelB = motoWheelF.clone();
        motoWheelB.position.set(-0.65, 0.3, 0);
        const farmerChar = createCharacter(0x84cc16, 0xfacc15);
        farmerChar.position.set(-0.1, 0.35, 0);
        farmerChar.rotation.y = Math.PI / 2;
        motoGroup.add(motoBody, motoWheelF, motoWheelB, farmerChar);
        motoGroup.position.set(-24, 0.05, 9.5);
        scene.add(motoGroup);

        const activeBucket = createLatexBucket(1);
        activeBucket.position.set(-24.85, 0.9, 9.5);
        scene.add(activeBucket);

        const sampleCup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.12, 0.25, 14),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0ea5e9, emissiveIntensity: 0.3 })
        );
        sampleCup.visible = false;
        scene.add(sampleCup);

        // Store refs for simulation update loop
        threeRefs.current.actors = {
            motoGroup,
            activeBucket,
            sampleCup,
            pitLiquidMesh,
            pitLiquidMat,
            mixerGroup,
            ovenWindowMat,
            monitorMat,
            truckGroup,
            truckLiquidMesh,
            pitLabel,
            truckLabel
        };

        // ---------------------------------------------------------------------
        // RESIZE HANDLER
        // ---------------------------------------------------------------------
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

        // ---------------------------------------------------------------------
        // RENDER & SIMULATION LOOP
        // ---------------------------------------------------------------------
        let currentStepProgress = 0;
        let pitStartVol = 0;
        let truckStartVol = 0;

        const animate = () => {
            threeRefs.current.animFrame = requestAnimationFrame(animate);
            const dt = Math.min(threeRefs.current.clock.getDelta(), 0.1);

            // Camera transition
            if (threeRefs.current.camAnim) {
                const ca = threeRefs.current.camAnim;
                ca.progress += dt * 3.0;
                const t = Math.min(1, ca.progress);
                const ease = 1 - Math.pow(1 - t, 3);
                camera.position.lerpVectors(ca.startPos, ca.endPos, ease);
                controls.target.lerpVectors(ca.startTarget, ca.endTarget, ease);
                if (t >= 1) threeRefs.current.camAnim = null;
            }

            controls.update();

            // Run simulation step animation
            setSimState(prevSim => {
                if (prevSim.waitingManual) return prevSim;

                const durations = { 1: 2.0, 2: 2.2, 3: 2.0, 4: 1.6, 5: 2.4, 6: 2.8, 7: 3.0, 8: 3.2 };
                const stepDur = durations[prevSim.step] || 2.0;

                if (currentStepProgress === 0) {
                    pitStartVol = prevSim.pitVolume;
                    truckStartVol = prevSim.truckVolume;
                }

                currentStepProgress += (dt * prevSim.speed) / stepDur;
                const p = Math.min(1, currentStepProgress);

                const { 
                    motoGroup, activeBucket, sampleCup, pitLiquidMesh, pitLiquidMat,
                    mixerGroup, ovenWindowMat, monitorMat, truckGroup, truckLiquidMesh
                } = threeRefs.current.actors;

                if (prevSim.step === 1) {
                    const curX = THREE.MathUtils.lerp(-22, -6.5, p);
                    motoGroup.position.set(curX, 0.05, 9.5);
                    activeBucket.position.set(curX - 0.85, 0.9, 9.5);
                } else if (prevSim.step === 2) {
                    if (p < 0.5) {
                        const sp = p * 2;
                        activeBucket.position.set(-6.5, THREE.MathUtils.lerp(0.9, 0.5, sp) + Math.sin(sp * Math.PI) * 0.5, THREE.MathUtils.lerp(9.5, 2.8, sp));
                    } else {
                        const sp = (p - 0.5) * 2;
                        activeBucket.position.set(-6.5, 0.5, 2.8);
                        sampleCup.position.set(THREE.MathUtils.lerp(-6.5, -2.8, sp), THREE.MathUtils.lerp(0.9, 1.6, sp) + Math.sin(sp * Math.PI) * 0.4, THREE.MathUtils.lerp(2.8, -2.2, sp));
                    }
                } else if (prevSim.step === 3) {
                    sampleCup.position.set(-2.8, 1.6, -2.2);
                    ovenWindowMat.emissiveIntensity = 0.5 + Math.abs(Math.sin(p * Math.PI * 6)) * 0.5;
                } else if (prevSim.step === 4) {
                    monitorMat.emissiveIntensity = 0.3 + Math.abs(Math.sin(p * Math.PI * 4)) * 0.7;
                } else if (prevSim.step === 5) {
                    if (p < 0.65) {
                        const sp = p / 0.65;
                        const bx = THREE.MathUtils.lerp(-6.5, 3.5, sp);
                        const bz = THREE.MathUtils.lerp(2.8, 2.2, sp);
                        activeBucket.position.set(bx, 1.3, bz);
                    } else {
                        const sp = (p - 0.65) / 0.35;
                        activeBucket.position.set(3.5, 1.6, 2.2);
                        activeBucket.rotation.z = -sp * (Math.PI / 2);
                        motoGroup.position.x = THREE.MathUtils.lerp(-6.5, 24, sp);
                    }
                    if (p >= 1) activeBucket.visible = false;
                } else if (prevSim.step === 6) {
                    mixerGroup.rotation.y += dt * 12 * prevSim.speed;
                    pitLiquidMat.color.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xdbeafe), Math.sin(p * Math.PI) * 0.5);
                } else if (prevSim.step === 7) {
                    mixerGroup.rotation.y += dt * 6 * prevSim.speed;
                } else if (prevSim.step === 8) {
                    if (p < 0.5) {
                        truckGroup.position.z = THREE.MathUtils.lerp(2.2, 32, p * 2);
                    } else {
                        truckGroup.position.z = THREE.MathUtils.lerp(-28, 2.2, (p - 0.5) * 2);
                    }
                }

                // Step Finished Handler
                if (p >= 1) {
                    currentStepProgress = 0;
                    ovenWindowMat.emissiveIntensity = 0;
                    activeBucket.rotation.set(0, 0, 0);

                    let nextStep = 1;
                    let newPitVol = prevSim.pitVolume;
                    let newTruckVol = prevSim.truckVolume;
                    let newDispatched = prevSim.trucksDispatched;

                    if (prevSim.step === 1) nextStep = 2;
                    else if (prevSim.step === 2) nextStep = 3;
                    else if (prevSim.step === 3) nextStep = 4;
                    else if (prevSim.step === 4) nextStep = 5;
                    else if (prevSim.step === 5) {
                        newPitVol = Math.min(prevSim.pitMax, pitStartVol + prevSim.currentTicket.freshVolume);
                        if (newPitVol >= prevSim.pitMax) nextStep = 6;
                        else nextStep = 1;
                    } else if (prevSim.step === 6) nextStep = 7;
                    else if (prevSim.step === 7) {
                        newPitVol = 0;
                        newTruckVol = Math.min(prevSim.truckMax, truckStartVol + 500);
                        if (newTruckVol >= prevSim.truckMax) nextStep = 8;
                        else nextStep = 1;
                    } else if (prevSim.step === 8) {
                        newDispatched++;
                        newTruckVol = 0;
                        nextStep = 1;
                    }

                    // Update 3D Visual Liquid Scales
                    const targetPitScale = Math.max(0.02, Math.min(1.0, newPitVol / prevSim.pitMax));
                    pitLiquidMesh.scale.y = targetPitScale;
                    pitLiquidMesh.position.y = 0.15 + (targetPitScale * 1.2) / 2;

                    const targetTruckScale = Math.max(0.01, Math.min(1.0, newTruckVol / prevSim.truckMax));
                    truckLiquidMesh.scale.y = targetTruckScale;
                    truckLiquidMesh.position.y = 1.35 + (targetTruckScale * 2.1) / 2;

                    if (!prevSim.autoMode) {
                        return {
                            ...prevSim,
                            waitingManual: true,
                            step: nextStep,
                            pitVolume: newPitVol,
                            truckVolume: newTruckVol,
                            trucksDispatched: newDispatched,
                            actionText: `[หยุดรอ] กด "ขั้นตอนถัดไป" เพื่อเริ่ม สเตปที่ ${nextStep}`
                        };
                    }

                    // Generate next ticket on step 1
                    let newTicket = prevSim.currentTicket;
                    let newFarmerCount = prevSim.farmerCount;
                    let newTotalMoney = prevSim.totalMoneyPaid;

                    if (nextStep === 1) {
                        newFarmerCount++;
                        const names = ['ลุงหมาย สวนยางใต้', 'พี่พงษ์ ท่าช้าง', 'น้าศักดิ์ ควนเนียง', 'ป้าศรี นาหม่อม', 'บ่าววี รัตภูมิ', 'โกชัย หาดใหญ่', 'ลุงดำ คลองหอยโข่ง'];
                        const name = names[(newFarmerCount - 1) % names.length];
                        const freshVol = +(40 + Math.random() * 10).toFixed(1);
                        const drc = +(28 + Math.random() * 10).toFixed(1);
                        const dryKg = +(freshVol * (drc / 100)).toFixed(2);
                        const total = +(dryKg * prevSim.rubberPrice).toFixed(2);

                        newTicket = {
                            id: `RT-${String(newFarmerCount).padStart(3, '0')}`,
                            farmerName: name,
                            freshVolume: freshVol,
                            drcPercent: drc,
                            dryWeight: dryKg,
                            totalBaht: total
                        };
                        motoGroup.position.set(-22, 0.05, 9.5);
                        activeBucket.visible = true;
                        activeBucket.rotation.set(0, 0, 0);
                        sampleCup.visible = false;
                    } else if (nextStep === 4) {
                        newTotalMoney += newTicket.totalBaht;
                    }

                    const actionTexts = {
                        1: `เกษตรกร (${newTicket.farmerName}) ขับ จยย. นำน้ำยางสดมาส่ง...`,
                        2: `ชั่งตวงน้ำยางสด (${newTicket.freshVolume} ลิตร) และเก็บตัวอย่างส่งแล็บ`,
                        3: `ห้องแล็บกำลังนำตัวอย่างเข้าเครื่องอบ %DRC...`,
                        4: `ออกบิลเรียบร้อย! ยอดจ่าย ${newTicket.totalBaht.toLocaleString()} บาท`,
                        5: `เทน้ำยาง (${newTicket.freshVolume}L) ลงบ่อพัก 500 ลิตร`,
                        6: `บ่อครบ 500 ลิตร! เติมแอมโมเนียและยาขาว พร้อมเปิดใบพัดกวน`,
                        7: `สูบน้ำยาง 500 ลิตรจากบ่อพัก ขึ้นสู่รถบรรทุก 3,000 ลิตร`,
                        8: `รถบรรทุกเต็ม 3,000 ลิตรแล้ว! วิ่งออกส่งโรงงาน`
                    };

                    return {
                        ...prevSim,
                        step: nextStep,
                        farmerCount: newFarmerCount,
                        totalMoneyPaid: newTotalMoney,
                        pitVolume: newPitVol,
                        truckVolume: newTruckVol,
                        trucksDispatched: newDispatched,
                        currentTicket: newTicket,
                        actionText: actionTexts[nextStep] || 'กำลังปฏิบัติการ...',
                        pitChemStatus: nextStep === 6 ? 'เติมแอมโมเนีย+ยาขาว และกวนผสม' : (nextStep === 7 ? 'กำลังสูบขึ้นรถแท็งก์...' : 'รอรับน้ำยางสด')
                    };
                }

                return prevSim;
            });

            // Update 3D Floating Labels Projection
            const halfW = container.clientWidth / 2;
            const halfH = container.clientHeight / 2;
            threeRefs.current.labels3D.forEach(item => {
                const pos = item.position.clone();
                pos.project(camera);
                if (pos.z > 1) {
                    item.element.style.opacity = '0';
                } else {
                    const x = (pos.x * halfW) + halfW;
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
            if (threeRefs.current.renderer?.domElement) {
                threeRefs.current.renderer.dispose();
                if (container.contains(threeRefs.current.renderer.domElement)) {
                    container.removeChild(threeRefs.current.renderer.domElement);
                }
            }
        };
    }, []);

    // Camera view preset switcher
    const setCameraView = (preset) => {
        const { camera, controls } = threeRefs.current;
        if (!camera || !controls) return;
        const views = {
            overview: { pos: new THREE.Vector3(45, 45, 45), target: new THREE.Vector3(0, 1, 0) },
            weigh_lab: { pos: new THREE.Vector3(5, 25, 25), target: new THREE.Vector3(-4, 1, 0) },
            pit_pump: { pos: new THREE.Vector3(25, 25, 35), target: new THREE.Vector3(5, 1, 2) },
            truck: { pos: new THREE.Vector3(35, 25, 15), target: new THREE.Vector3(13, 2, 2) }
        };
        const v = views[preset];
        if (!v) return;

        threeRefs.current.camAnim = {
            startPos: camera.position.clone(),
            endPos: v.pos,
            startTarget: controls.target.clone(),
            endTarget: v.target,
            progress: 0
        };
        setActiveMobileTab('none');
    };

    // Fast-Forward helpers
    const fastFillPit = () => {
        setSimState(prev => ({
            ...prev,
            pitVolume: 500,
            step: 6,
            waitingManual: false,
            actionText: 'บ่อครบ 500 ลิตร! เติมแอมโมเนียและยาขาว พร้อมเปิดใบพัดกวน'
        }));
    };

    const fastFillTruck = () => {
        setSimState(prev => ({
            ...prev,
            truckVolume: 2500
        }));
    };

    const toggleLabels = () => {
        setSimState(prev => {
            const nextShow = !prev.showLabels;
            if (labelsContainerRef.current) {
                labelsContainerRef.current.style.display = nextShow ? 'block' : 'none';
            }
            return { ...prev, showLabels: nextShow };
        });
    };

    return (
        <div className="relative w-full h-[calc(100vh-4.5rem)] overflow-hidden font-sans select-none bg-slate-100 dark:bg-slate-950">
            {/* 3D Canvas Mount */}
            <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

            {/* Floating 3D Labels Mount */}
            <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none z-10" />

            {/* Custom Embedded CSS for Floating Labels */}
            <style>{`
                .label-3d {
                    position: absolute;
                    pointer-events: none;
                    transform: translate(-50%, -100%);
                    background: rgba(255, 255, 255, 0.95);
                    color: #0f172a;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                    border: 1px solid rgba(16, 185, 129, 0.4);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
                .glass-panel-custom {
                    background: rgba(255, 255, 255, 0.88);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    border: 1px solid rgba(226, 232, 240, 0.9);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
                }
                .dark .glass-panel-custom {
                    background: rgba(15, 23, 42, 0.88);
                    border: 1px solid rgba(51, 65, 85, 0.9);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                }
            `}</style>

            {/* Top Navigation & KPI Header */}
            <div className="absolute top-2 left-2 right-2 z-20 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 pointer-events-none">
                {/* Brand & Switcher */}
                <div className="glass-panel-custom px-3.5 py-2 rounded-2xl pointer-events-auto flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => navigate('/')}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                            title="กลับหน้าหลัก Dashboard 1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-md">
                            RT
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">RubberTrade Live Track</h1>
                                <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 font-bold rounded-full border border-emerald-200/60">
                                    Live ISO
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 hidden sm:block">ระบบจำลองลานรับซื้อน้ำยางสดและคลังสินค้าเสมือนจริง</p>
                        </div>
                    </div>

                    {/* Mobile Quick Mini Badges */}
                    <div className="flex md:hidden items-center gap-1.5">
                        <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-right border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] text-slate-400 block leading-none">บ่อ 500L</span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{simState.pitVolume.toFixed(0)}L</span>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-right border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] text-slate-400 block leading-none">รถแท็งก์</span>
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{simState.truckVolume.toFixed(0)}L</span>
                        </div>
                    </div>
                </div>

                {/* Top Desktop KPI Metric Cards */}
                <div className="hidden lg:flex items-center gap-2 pointer-events-auto">
                    <div className="glass-panel-custom px-3.5 py-1.5 rounded-2xl flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-sm">🌾</div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">รับซื้อวันนี้</div>
                            <div className="text-xs font-black text-slate-900 dark:text-white">{simState.farmerCount} คัน</div>
                        </div>
                    </div>
                    <div className="glass-panel-custom px-3.5 py-1.5 rounded-2xl flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-sm">🚚</div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">ส่งโรงงาน</div>
                            <div className="text-xs font-black text-slate-900 dark:text-white">{simState.trucksDispatched} คัน</div>
                        </div>
                    </div>
                    <div className="glass-panel-custom px-3.5 py-1.5 rounded-2xl flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold text-sm">💰</div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">ยอดจ่ายรวม</div>
                            <div className="text-xs font-black text-slate-900 dark:text-white">฿{simState.totalMoneyPaid.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Camera Presets & Toggles */}
                <div className="glass-panel-custom p-1 rounded-2xl pointer-events-auto flex items-center gap-1 overflow-x-auto">
                    <button onClick={() => setCameraView('overview')} className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition shrink-0">ภาพรวม</button>
                    <button onClick={() => setCameraView('weigh_lab')} className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition shrink-0">จุดชั่ง & แล็บ</button>
                    <button onClick={() => setCameraView('pit_pump')} className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition shrink-0">บ่อ & เคมี</button>
                    <button onClick={() => setCameraView('truck')} className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition shrink-0">รถแท็งก์</button>
                    <button onClick={toggleLabels} className={`px-2 py-1 rounded-xl text-xs font-bold transition shrink-0 ${simState.showLabels ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-500'}`}>
                        {simState.showLabels ? 'ป้าย: เปิด' : 'ป้าย: ปิด'}
                    </button>
                </div>
            </div>

            {/* Left Control Panel (Workflow & Steps) */}
            <div className={`fixed bottom-14 left-2 right-2 md:bottom-auto md:right-auto md:top-16 md:left-2 z-20 md:w-80 max-h-[50vh] md:max-h-[calc(100vh-5.5rem)] overflow-y-auto glass-panel-custom rounded-2xl p-3.5 pointer-events-auto ${activeMobileTab === 'controls' ? 'flex flex-col' : 'hidden md:flex flex-col'} gap-3 shadow-xl transition-all`}>
                <div className="flex md:hidden justify-between items-center border-b border-slate-200 pb-1.5">
                    <span className="text-xs font-bold text-emerald-700">⚙️ แผงควบคุมและขั้นตอน</span>
                    <button onClick={() => setActiveMobileTab('none')} className="text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-100">ปิด ✕</button>
                </div>

                {/* Mode Controls */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">โหมดการทำงาน</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
                            {simState.autoMode ? 'Auto Simulation' : 'Manual Step'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <button
                            onClick={() => setSimState(prev => ({ ...prev, autoMode: !prev.autoMode, waitingManual: false }))}
                            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition shadow-sm ${simState.autoMode ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                        >
                            {simState.autoMode ? 'โหมด: อัตโนมัติ' : 'โหมด: กดทีละขั้น'}
                        </button>
                        <button
                            onClick={() => setSimState(prev => ({ ...prev, waitingManual: false }))}
                            disabled={simState.autoMode || !simState.waitingManual}
                            className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white transition shadow-sm"
                        >
                            ขั้นตอนถัดไป ▶
                        </button>
                    </div>

                    {/* Speed Selector */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 mb-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300 pl-1.5 font-medium">ความเร็ว:</span>
                        <div className="flex gap-1">
                            {[1, 2, 5].map(spd => (
                                <button
                                    key={spd}
                                    onClick={() => setSimState(prev => ({ ...prev, speed: spd }))}
                                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${simState.speed === spd ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                                >
                                    {spd}x
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fast-Forward Buttons */}
                    <div className="space-y-1">
                        <button
                            onClick={fastFillPit}
                            className="w-full py-1.5 px-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 transition flex items-center justify-center gap-1.5"
                        >
                            <span>⚡</span> เร่งเติมบ่อครบ 500L ทันที (ทดสอบสูบ)
                        </button>
                        <button
                            onClick={fastFillTruck}
                            className="w-full py-1.5 px-2.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 transition flex items-center justify-center gap-1.5"
                        >
                            <span>🚚</span> เติมรถแท็งก์เป็น 2,500L (รอดำเนินการ)
                        </button>
                    </div>
                </div>

                {/* Price Input */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] text-slate-500 font-bold mb-1">ราคารับซื้อยางแห้งวันนี้ (บาท/กก.)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={simState.rubberPrice}
                            step="0.5"
                            min="10"
                            max="200"
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) setSimState(prev => ({ ...prev, rubberPrice: val }));
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-sm font-black text-emerald-600 dark:text-emerald-400 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">บ./กก.</span>
                    </div>
                </div>

                {/* 8-Step Workflow List */}
                <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">สถานะลำดับการทำงาน (Workflow)</span>
                    <div className="space-y-1 text-xs">
                        {[
                            '1. เกษตรกรขับ จยย. มาส่งน้ำยาง',
                            '2. ชั่งน้ำหนัก & ตักตัวอย่างส่งตรวจ %DRC',
                            '3. อบหาค่า %DRC ในห้องแล็บ',
                            '4. ออกบิลคำนวณยอดเงินรับซื้อ',
                            '5. เทน้ำยางลงบ่อพัก (สะสม 500L)',
                            '6. เติมแอมโมเนีย + ยาขาว & กวนผสม',
                            '7. สูบน้ำยาง 500L ขึ้นรถแท็งก์ 3,000L',
                            '8. รถบรรทุกเต็ม 3,000L วิ่งส่งโรงงาน'
                        ].map((txt, idx) => {
                            const stepNum = idx + 1;
                            const isActive = simState.step === stepNum;
                            return (
                                <div
                                    key={stepNum}
                                    className={`p-1.5 rounded-lg border text-[11px] transition-all ${
                                        isActive
                                            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold pl-2.5 shadow-sm'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {txt}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Status Panel (Telemetry, Gauges & Live Receipt) */}
            <div className={`fixed bottom-14 left-2 right-2 md:bottom-auto md:left-auto md:top-16 md:right-2 z-20 md:w-80 max-h-[50vh] md:max-h-[calc(100vh-5.5rem)] overflow-y-auto glass-panel-custom rounded-2xl p-3.5 pointer-events-auto ${activeMobileTab === 'status' ? 'flex flex-col' : 'hidden md:flex flex-col'} gap-3 shadow-xl transition-all`}>
                <div className="flex md:hidden justify-between items-center border-b border-slate-200 pb-1.5">
                    <span className="text-xs font-bold text-blue-700">🧾 บิลรับซื้อ & ปริมาณน้ำยาง</span>
                    <button onClick={() => setActiveMobileTab('none')} className="text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-100">ปิด ✕</button>
                </div>

                {/* Current Action Banner */}
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5">
                    <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">สถานะระบบปัจจุบัน</span>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 leading-tight block mt-0.5">
                        {simState.actionText}
                    </span>
                </div>

                {/* Storage Gauges */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">มาตรวัดปริมาณน้ำยาง</span>
                    
                    {/* Pit 500L */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-end mb-1">
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">บ่อพักน้ำยางสด</span>
                                <span className="text-[10px] text-slate-400">{simState.pitChemStatus}</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                {simState.pitVolume.toFixed(1)} / 500 ลิตร
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                            <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (simState.pitVolume / simState.pitMax) * 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Truck 3000L */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-end mb-1">
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">รถบรรทุกน้ำยาง (แท็งก์)</span>
                                <span className="text-[10px] text-slate-400">รอบสูบ: {Math.round(simState.truckVolume / 500)} / 6 รอบ</span>
                            </div>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                {simState.truckVolume.toFixed(0)} / 3,000 ลิตร
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                            <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (simState.truckVolume / simState.truckMax) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Live Purchase Receipt Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-md border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                        <div>
                            <h3 className="font-bold text-xs text-slate-900 dark:text-white">บิลรับซื้อน้ำยางสด</h3>
                            <p className="text-[10px] text-slate-400">{storeName}</p>
                        </div>
                        <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                            #{simState.currentTicket.id}
                        </span>
                    </div>

                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-400">เกษตรกร:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{simState.currentTicket.farmerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">น้ำยางสด:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                {simState.step >= 2 ? `${simState.currentTicket.freshVolume.toFixed(1)} ลิตร` : 'รอชั่ง...'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">ผลตรวจ %DRC:</span>
                            <span className="font-bold text-amber-600">
                                {simState.step >= 4 ? `${simState.currentTicket.drcPercent.toFixed(1)} %` : 'รอผลแล็บ...'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">น้ำหนักยางแห้ง:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                {simState.step >= 4 ? `${simState.currentTicket.dryWeight.toFixed(2)} กก.` : '0.00 กก.'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">ราคารับซื้อ:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                {simState.rubberPrice.toFixed(2)} ฿/กก.
                            </span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-1.5 mt-1.5 flex justify-between items-baseline">
                            <span className="font-bold text-slate-700 dark:text-slate-300">ยอดจ่ายสุทธิ:</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {simState.step >= 4 ? `${simState.currentTicket.totalBaht.toLocaleString()} ฿` : '0.00 ฿'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="fixed bottom-2 left-2 right-2 z-30 md:hidden glass-panel-custom p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-lg">
                <button
                    onClick={() => setActiveMobileTab('none')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${activeMobileTab === 'none' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                    <Eye className="w-3.5 h-3.5" /> <span>ดู 3D</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('controls')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${activeMobileTab === 'controls' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                    <SettingsIcon className="w-3.5 h-3.5" /> <span>ควบคุม</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('status')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${activeMobileTab === 'status' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                    <FileText className="w-3.5 h-3.5" /> <span>บิล/ยาง</span>
                </button>
                <button
                    onClick={fastFillPit}
                    title="เร่งน้ำยางเต็มบ่อ 500L"
                    className="py-1.5 px-2.5 rounded-xl text-xs font-black bg-indigo-600 text-white transition shrink-0"
                >
                    ⚡ 500L
                </button>
            </div>
        </div>
    );
};

export default Dashboard3D;

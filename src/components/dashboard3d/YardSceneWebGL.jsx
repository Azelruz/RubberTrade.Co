import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SIMULATION_STATES } from '../../hooks/useYardSimulation';

export const YardSceneWebGL = ({
    simState,
    activeJob,
    onSelectEntity,
    selectedEntityId,
    filterLayer = 'all',
    zoom = 1
}) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const truckGroupRef = useRef(null);
    const liquidMeshRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Screen-projected HTML markers
    const [markers, setMarkers] = useState([]);

    // Keep track of 3D objects for raycasting
    const interactableObjectsRef = useRef([]);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // 1. Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f9);
        sceneRef.current = scene;

        // Soft atmospheric fog
        scene.fog = new THREE.FogExp2(0xf1f5f9, 0.008);

        // 2. Camera (Isometric Perspective)
        const camera = new THREE.PerspectiveCamera(36, width / height, 1, 300);
        camera.position.set(48, 38, 48);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // 3. Renderer with Antialiasing & Soft Shadows
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 4. Orbit Controls (Interactive Pan / Zoom / Rotate)
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.maxPolarAngle = Math.PI / 2.1; // Don't go below ground
        controls.minDistance = 25;
        controls.maxDistance = 120;
        controls.target.set(0, 2, 0);
        controlsRef.current = controls;

        // 5. Lighting Setup (Bright Sunlight + Soft Ambient Occlusion Fill)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0xe2e8f0, 0.5);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
        dirLight.position.set(45, 65, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 160;
        const d = 42;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0006;
        scene.add(dirLight);

        // ----------------------------------------------------
        // BUILD 3D PROCEDURAL YARD & WAREHOUSE ENVIRONMENT
        // ----------------------------------------------------
        const interactables = [];

        // Materials
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85, metalness: 0.05 });
        const groundGrassMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95 });
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        const warehouseBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.2 });
        const warehouseRoofMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.15 });
        const wallLightMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
        const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const woodPalletMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
        const rubberBoxMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
        const containerTealMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.4, metalness: 0.3 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 });
        const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
        const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });

        // Base Ground Slab
        const groundGeo = new THREE.BoxGeometry(75, 1, 65);
        const ground = new THREE.Mesh(groundGeo, groundGrassMat);
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        scene.add(ground);

        // Concrete Yard Apron
        const yardGeo = new THREE.BoxGeometry(60, 0.1, 48);
        const yard = new THREE.Mesh(yardGeo, concreteMat);
        yard.position.set(-2, 0.05, -3);
        yard.receiveShadow = true;
        scene.add(yard);

        // Asphalt Road running along front
        const roadGeo = new THREE.BoxGeometry(75, 0.12, 14);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.set(0, 0.06, 24);
        road.receiveShadow = true;
        scene.add(road);

        // White Road Dashed Lines
        for (let i = -32; i <= 32; i += 8) {
            const dashGeo = new THREE.BoxGeometry(4, 0.13, 0.35);
            const dash = new THREE.Mesh(dashGeo, whiteLineMat);
            dash.position.set(i, 0.07, 24);
            scene.add(dash);
        }

        // Yellow Parking / Bay Markings
        const createBayMarkings = (x, z, label) => {
            const bayGroup = new THREE.Group();
            const w = 6.5, l = 13, border = 0.2;
            
            // Left line
            const l1 = new THREE.Mesh(new THREE.BoxGeometry(border, 0.14, l), yellowLineMat);
            l1.position.set(-w / 2, 0.08, 0);
            bayGroup.add(l1);

            // Right line
            const l2 = new THREE.Mesh(new THREE.BoxGeometry(border, 0.14, l), yellowLineMat);
            l2.position.set(w / 2, 0.08, 0);
            bayGroup.add(l2);

            // Top line
            const l3 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, border), yellowLineMat);
            l3.position.set(0, 0.08, -l / 2);
            bayGroup.add(l3);

            bayGroup.position.set(x, 0, z);
            scene.add(bayGroup);
        };

        createBayMarkings(-6, 7, 'BAY 01');
        createBayMarkings(6, 7, 'BAY 02');

        // ----------------------------------------------------
        // MAIN WAREHOUSE (WH-01) - BEAUTIFUL BLUE INDUSTRIAL
        // ----------------------------------------------------
        const warehouseGroup = new THREE.Group();
        warehouseGroup.userData = {
            type: 'station',
            title: 'อาคารชั่งและรับซื้อยาง WH-01',
            status: 'พร้อมใช้งาน (Online)',
            todayCount: 18
        };

        // Main Hall Building
        const whWidth = 24, whHeight = 9.5, whDepth = 18;
        const whBodyGeo = new THREE.BoxGeometry(whWidth, whHeight, whDepth);
        const whBody = new THREE.Mesh(whBodyGeo, warehouseBlueMat);
        whBody.position.set(0, whHeight / 2, -14);
        whBody.castShadow = true;
        whBody.receiveShadow = true;
        warehouseGroup.add(whBody);

        // Corrugated Roof
        const roofGeo = new THREE.ConeGeometry(whWidth * 0.72, 3.5, 4);
        const roof = new THREE.Mesh(roofGeo, warehouseRoofMat);
        roof.position.set(0, whHeight + 1.75, -14);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        warehouseGroup.add(roof);

        // Dock Canopies & Open Doors
        const dockDoors = [-6, 6];
        dockDoors.forEach((dx) => {
            // Dark door interior
            const doorGeo = new THREE.BoxGeometry(4.8, 6.2, 0.5);
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(dx, 3.1, -4.8);
            warehouseGroup.add(door);

            // Canopy awning
            const awningGeo = new THREE.BoxGeometry(6.2, 0.4, 3.5);
            const awning = new THREE.Mesh(awningGeo, warehouseRoofMat);
            awning.position.set(dx, 6.5, -3.2);
            awning.castShadow = true;
            warehouseGroup.add(awning);
        });

        // WH-01 Logo Sign Plate
        const signGeo = new THREE.BoxGeometry(7, 1.8, 0.4);
        const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, whHeight + 0.5, -4.8);
        warehouseGroup.add(sign);

        scene.add(warehouseGroup);
        interactables.push(whBody);

        // ----------------------------------------------------
        // SILO TANKS (LIQUID LATEX SILO TANKS)
        // ----------------------------------------------------
        const createSiloTank = (x, z, label, isPrimary = false) => {
            const tankGroup = new THREE.Group();
            tankGroup.userData = {
                type: 'tank',
                title: label,
                volumePct: 78,
                currentVolume: '15,600',
                avgDrc: '33.8%'
            };

            // Cylinder body
            const tankRadius = 3.2, tankH = 8.5;
            const tankGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, tankH, 32);
            const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.6 });
            const tank = new THREE.Mesh(tankGeo, tankMat);
            tank.position.set(0, tankH / 2 + 0.5, 0);
            tank.castShadow = true;
            tank.receiveShadow = true;
            tankGroup.add(tank);

            // Dome Top
            const domeGeo = new THREE.SphereGeometry(tankRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.5 });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.position.set(0, tankH + 0.5, 0);
            tankGroup.add(dome);

            // Glass Level Window
            const glassGeo = new THREE.BoxGeometry(0.5, tankH * 0.7, 0.4);
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.set(0, tankH / 2 + 0.5, tankRadius + 0.05);
            tankGroup.add(glass);

            // Animated Liquid Inside Window
            if (isPrimary) {
                const liquidGeo = new THREE.BoxGeometry(0.35, tankH * 0.5, 0.45);
                const liquidMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2 });
                const liquid = new THREE.Mesh(liquidGeo, liquidMat);
                liquid.position.set(0, tankH * 0.35 + 0.5, tankRadius + 0.06);
                tankGroup.add(liquid);
                liquidMeshRef.current = liquid;
            }

            tankGroup.position.set(x, 0, z);
            scene.add(tankGroup);
            interactables.push(tank);
        };

        createSiloTank(-20, -10, 'ถังพักน้ำยางสด Silo #1', true);
        createSiloTank(-20, -18, 'ถังสำรอง Silo #2');

        // Connecting Overhead Pipes
        const pipeCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-18, 5, -10),
            new THREE.Vector3(-14, 5, -10),
            new THREE.Vector3(-12, 5, -5),
            new THREE.Vector3(-8, 5, -5),
            new THREE.Vector3(-8, 3, -5)
        ]);
        const pipeGeo = new THREE.TubeGeometry(pipeCurve, 32, 0.25, 12, false);
        const pipe = new THREE.Mesh(pipeGeo, metalMat);
        pipe.castShadow = true;
        scene.add(pipe);

        // ----------------------------------------------------
        // SHIPPING CONTAINER (MAERSK STYLE)
        // ----------------------------------------------------
        const containerGroup = new THREE.Group();
        containerGroup.userData = {
            type: 'yard',
            title: 'ตู้คอนเทนเนอร์ส่งออก (Export Container)',
            status: 'กำลังบรรจุ'
        };
        const cWidth = 5.5, cHeight = 5.2, cLength = 14;
        const cBody = new THREE.Mesh(new THREE.BoxGeometry(cWidth, cHeight, cLength), containerTealMat);
        cBody.position.set(-21, cHeight / 2 + 0.1, 7);
        cBody.castShadow = true;
        cBody.receiveShadow = true;
        containerGroup.add(cBody);
        scene.add(containerGroup);
        interactables.push(cBody);

        // ----------------------------------------------------
        // CUP LUMP RUBBER YARD & PALLETS
        // ----------------------------------------------------
        const yardGroup = new THREE.Group();
        yardGroup.userData = {
            type: 'yard',
            title: 'ลานเทและกองเก็บยางก้อนถ้วย (Yard-A)',
            stockWeight: '8,450 กก.',
            moisture: '50%'
        };

        const createPalletStack = (px, pz) => {
            const pGroup = new THREE.Group();
            // Pallet wood
            const pBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 3.5), woodPalletMat);
            pBase.position.y = 0.2;
            pBase.castShadow = true;
            pGroup.add(pBase);

            // Stacked Rubber Bales / Boxes
            const b1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 3.2), rubberBoxMat);
            b1.position.y = 1.0;
            b1.castShadow = true;
            pGroup.add(b1);

            const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 2.8), rubberBoxMat);
            b2.position.y = 2.2;
            b2.castShadow = true;
            pGroup.add(b2);

            pGroup.position.set(px, 0, pz);
            yardGroup.add(pGroup);
            interactables.push(b1);
        };

        createPalletStack(18, -6);
        createPalletStack(18, -11);
        createPalletStack(23, -8);
        scene.add(yardGroup);

        // ----------------------------------------------------
        // INDUSTRIAL FORKLIFT (YELLOW TACTILE 3D)
        // ----------------------------------------------------
        const forkliftGroup = new THREE.Group();
        forkliftGroup.userData = {
            type: 'yard',
            title: 'รถโฟล์คลิฟต์ประจำลาน (Forklift #1)',
            status: 'สแตนด์บาย'
        };
        const flBodyMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3 });
        const flCageMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        
        // Body
        const flBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 3.6), flBodyMat);
        flBody.position.set(0, 1.1, 0);
        flBody.castShadow = true;
        forkliftGroup.add(flBody);

        // Roll cage
        const flCage = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 2.1), flCageMat);
        flCage.position.set(0, 2.8, -0.4);
        flCage.castShadow = true;
        forkliftGroup.add(flCage);

        // Mast & Forks
        const flMast = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.6, 0.4), flCageMat);
        flMast.position.set(0, 2.1, 2.0);
        forkliftGroup.add(flMast);

        const flForks = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 2.0), flCageMat);
        flForks.position.set(0, 0.35, 2.8);
        forkliftGroup.add(flForks);

        forkliftGroup.position.set(16, 0, 7);
        forkliftGroup.rotation.y = -Math.PI / 3;
        scene.add(forkliftGroup);
        interactables.push(flBody);

        // ----------------------------------------------------
        // STYLIZED TREES & SHRUBS
        // ----------------------------------------------------
        const createTree = (tx, tz, scale = 1) => {
            const tGroup = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 2.5 * scale), treeTrunkMat);
            trunk.position.y = (2.5 * scale) / 2;
            trunk.castShadow = true;
            tGroup.add(trunk);

            const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.8 * scale, 16, 16), treeLeavesMat);
            foliage.position.y = 2.8 * scale;
            foliage.castShadow = true;
            tGroup.add(foliage);

            tGroup.position.set(tx, 0, tz);
            scene.add(tGroup);
        };

        createTree(27, 8, 1.1);
        createTree(28, -2, 1.3);
        createTree(-27, -5, 1.0);
        createTree(-28, -22, 1.2);
        createTree(10, -22, 1.4);

        // ----------------------------------------------------
        // DYNAMIC INBOUND TRUCK (ANIMATED VIA STATE MACHINE)
        // ----------------------------------------------------
        const truckGroup = new THREE.Group();
        truckGroup.userData = {
            type: 'truck',
            title: 'รถกระบะชาวสวน (Inbound Truck)'
        };

        const truckCabMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.2 });
        const truckCargoMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
        const truckWheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
        const truckGlassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.1, metalness: 0.3 });

        // Cab
        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 2.6), truckCabMat);
        cab.position.set(0, 1.8, 3.2);
        cab.castShadow = true;
        truckGroup.add(cab);

        // Windshield
        const glass = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 0.3), truckGlassMat);
        glass.position.set(0, 2.3, 4.4);
        truckGroup.add(glass);

        // Cargo Bed
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.8, 5.2), truckCargoMat);
        cargo.position.set(0, 2.0, -0.8);
        cargo.castShadow = true;
        truckGroup.add(cargo);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16);
        const wheelOffsets = [
            [-1.7, 0.7, 3.2], [1.7, 0.7, 3.2],
            [-1.7, 0.7, -1.8], [1.7, 0.7, -1.8],
            [-1.7, 0.7, -0.2], [1.7, 0.7, -0.2]
        ];
        wheelOffsets.forEach(([wx, wy, wz]) => {
            const w = new THREE.Mesh(wheelGeo, truckWheelMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(wx, wy, wz);
            w.castShadow = true;
            truckGroup.add(w);
        });

        truckGroup.position.set(-6, 0, 24); // Start at road entrance
        scene.add(truckGroup);
        truckGroupRef.current = truckGroup;
        interactables.push(cab);

        interactableObjectsRef.current = interactables;

        // ----------------------------------------------------
        // 3D PIN ANCHORS (Floating Badges on Screen)
        // ----------------------------------------------------
        const pinAnchors = [
            { id: 'wh-01', pos: new THREE.Vector3(0, 11, -14), label: 'WH-01 ศูนย์รับซื้อ', type: 'station' },
            { id: 'bay-01', pos: new THREE.Vector3(-6, 2, 7), label: 'Bay 1: จุดชั่ง', type: 'station' },
            { id: 'tank-01', pos: new THREE.Vector3(-20, 10, -10), label: 'ถังน้ำยาง Silo 1', type: 'tank' },
            { id: 'yard-a', pos: new THREE.Vector3(18, 4, -8), label: 'ลานยางก้อนถ้วย', type: 'yard' }
        ];

        // ----------------------------------------------------
        // ANIMATION LOOP & PROJECTION
        // ----------------------------------------------------
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);

            // Update Controls
            controls.update();

            // Calculate 2D Screen Coordinates for HTML Floating Pins
            const newMarkers = pinAnchors.map(p => {
                const screenPos = p.pos.clone().project(camera);
                const x = ((screenPos.x + 1) * width) / 2;
                const y = ((-screenPos.y + 1) * height) / 2;
                const isVisible = screenPos.z < 1;
                return { ...p, x, y, isVisible };
            });
            setMarkers(newMarkers);

            renderer.render(scene, camera);
        };
        animate();

        // Click Handler (Raycasting)
        const handleClick = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(interactableObjectsRef.current, true);

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && !obj.userData?.type && obj.parent) {
                    obj = obj.parent;
                }
                if (obj && obj.userData?.type) {
                    onSelectEntity(obj.userData.type, obj.userData);
                }
            }
        };

        const canvasEl = renderer.domElement;
        canvasEl.addEventListener('click', handleClick);

        // Window Resize Handler
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            canvasEl.removeEventListener('click', handleClick);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (rendererRef.current && rendererRef.current.domElement) {
                rendererRef.current.dispose();
                if (container.contains(rendererRef.current.domElement)) {
                    container.removeChild(rendererRef.current.domElement);
                }
            }
        };
    }, [onSelectEntity]);

    // ----------------------------------------------------
    // STATE MACHINE REACTION (TRUCK POSITION & ANIMATIONS)
    // ----------------------------------------------------
    useEffect(() => {
        const truck = truckGroupRef.current;
        const liquid = liquidMeshRef.current;
        if (!truck) return;

        let targetPos = new THREE.Vector3(-6, 0, 24); // Default road position
        let targetRotY = 0;

        if (simState === SIMULATION_STATES.IDLE) {
            targetPos.set(-6, 0, 24);
            targetRotY = 0;
            if (liquid) liquid.scale.set(1, 1, 1);
        } else if (simState === SIMULATION_STATES.TRUCK_INBOUND) {
            targetPos.set(-6, 0, 14);
            targetRotY = 0;
        } else if (
            simState === SIMULATION_STATES.WEIGHING_SCALE ||
            simState === SIMULATION_STATES.DRC_SAMPLING ||
            simState === SIMULATION_STATES.TRANSFER_PAYLOAD ||
            simState === SIMULATION_STATES.SETTLEMENT_SLIP
        ) {
            targetPos.set(-6, 0, 7); // Docked at Bay 1
            targetRotY = 0;

            if (simState === SIMULATION_STATES.TRANSFER_PAYLOAD && liquid) {
                // Raise liquid level in Silo Tank!
                liquid.scale.set(1, 1.45, 1);
            }
        } else if (simState === SIMULATION_STATES.TRUCK_OUTBOUND || simState === SIMULATION_STATES.METRICS_SYNC) {
            targetPos.set(24, 0, 24); // Driving away towards road exit
            targetRotY = Math.PI / 2;
        }

        // Smooth tween with requestAnimationFrame
        let startTime = performance.now();
        const startPos = truck.position.clone();
        const startRot = truck.rotation.y;
        const duration = 750;

        const animateMove = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            truck.position.lerpVectors(startPos, targetPos, ease);
            truck.rotation.y = THREE.MathUtils.lerp(startRot, targetRotY, ease);

            if (progress < 1) {
                requestAnimationFrame(animateMove);
            }
        };
        requestAnimationFrame(animateMove);
    }, [simState]);

    return (
        <div className="relative w-full h-[520px] md:h-[640px] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl select-none">
            {/* Three.js Canvas Mount */}
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />

            {/* Floating 3D Projected Screen Markers */}
            {markers.map((m) => {
                if (!m.isVisible) return null;
                return (
                    <button
                        key={m.id}
                        onClick={() => onSelectEntity(m.type, { title: m.label, status: 'ออนไลน์' })}
                        style={{
                            left: `${m.x}px`,
                            top: `${m.y}px`,
                            transform: 'translate(-50%, -100%)'
                        }}
                        className="absolute z-10 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-700 text-[11px] font-black text-slate-800 dark:text-white hover:scale-105 active:scale-95 transition-all group"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping group-hover:bg-rubber-500"></span>
                        <span>{m.label}</span>
                    </button>
                );
            })}

            {/* Gesture Helper Hint on Mobile */}
            <div className="absolute bottom-3 left-4 pointer-events-none text-[11px] text-slate-500/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-slate-200/40">
                🖐️ แตะลากเพื่อหมุน 360° · หนีบซูมเข้า-ออก
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
    Upload, 
    FileSpreadsheet, 
    AlertCircle, 
    CheckCircle2, 
    ChevronRight, 
    Database, 
    Download,
    ArrowRight,
    Loader2,
    Trash2,
    Edit3,
    FileJson,
    Save,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    bulkAddRecords, 
    fetchFarmers, 
    fetchFactories, 
    fetchStaff, 
    fetchEmployees,
    fetchBuyRecords,
    fetchSellRecords,
    getSettings,
    adminExportTable,
    adminImportTable,
    adminFetchReportData
} from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';

const IMPORT_TYPES = [
    { id: 'farmers', name: 'ข้อมูลเกษตรกร', icon: <Database className="text-blue-500" /> },
    { id: 'staff', name: 'ข้อมูลพนักงาน (Staff)', icon: <Database className="text-purple-500" /> },
    { id: 'employees', name: 'ข้อมูลลูกจ้าง (Employees)', icon: <Database className="text-indigo-500" /> },
    { id: 'factories', name: 'ข้อมูลโรงงาน', icon: <Database className="text-green-500" /> },
    { id: 'farmer_types', name: 'ประเภทสมาชิก', icon: <Database className="text-yellow-500" /> },
    { id: 'buys', name: 'ประวัติการซื้อ', icon: <FileSpreadsheet className="text-orange-500" /> },
    { id: 'sells', name: 'ประวัติการขาย', icon: <FileSpreadsheet className="text-red-500" /> },
];

const FIELD_MAPPINGS = {
    farmers: {
        'id': ['farmerId', 'id', 'รหัส'],
        'name': ['name', 'ชื่อเกษตรกร', 'ชื่อ-นามสกุล', 'Farmer Name'],
        'phone': ['phone', 'เบอร์โทร', 'Phone'],
        'bankAccount': ['bankAccount', 'เลขบัญชี', 'Bank Account'],
        'bankName': ['bankName', 'ธนาคาร', 'Bank Name'],
        'address': ['address', 'ที่อยู่', 'Address'],
        'fscId': ['fscId', 'รหัส FSC', 'FSC ID'],
        'lineId': ['lineId', 'LINE ID', 'รหัสไลน์'],
        'lineName': ['lineName', 'ชื่อไลน์', 'LINE Name'],
        'memberTypeId': ['memberTypeId', 'ประเภทสมาชิก', 'Member Type'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    staff: {
        'id': ['staffId', 'id', 'รหัส'],
        'name': ['name', 'ชื่อพนักงาน', 'Staff Name'],
        'phone': ['phone', 'เบอร์โทร', 'Phone'],
        'address': ['address', 'ที่อยู่', 'Address'],
        'salary': ['salary', 'เงินเดือน', 'Salary'],
        'bonus': ['bonus', 'โบนัส', 'Bonus'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    employees: {
        'id': ['employeeId', 'id', 'รหัส'],
        'name': ['name', 'ชื่อลูกจ้าง', 'Employee Name'],
        'farmerId': ['farmerId', 'รหัสเกษตรกร', 'Employer ID'],
        'profitSharePct': ['profitSharePct', 'ส่วนแบ่ง (%)', 'Profit %'],
        'phone': ['phone', 'เบอร์โทร', 'Phone'],
        'bankAccount': ['bankAccount', 'เลขบัญชี', 'Bank Account'],
        'bankName': ['bankName', 'ธนาคาร', 'Bank Name']
    },
    factories: {
        'id': ['factoryId', 'id', 'รหัส'],
        'name': ['name', 'ชื่อโรงงาน', 'Factory Name'],
        'code': ['code', 'รหัสโรงงาน', 'Factory Code'],
        'shortName': ['shortName', 'ชื่อย่อ', 'Short Name'],
        'taxId': ['taxId', 'เลขผู้เสียภาษี', 'Tax ID'],
        'address': ['address', 'ที่อยู่', 'Address']
    },
    trucks: {
        'id': ['id', 'truckId', 'รหัส'],
        'licensePlate': ['licensePlate', 'ทะเบียนรถ', 'plateNo', 'License Plate'],
        'chassisNumber': ['chassisNumber', 'เลขตัวถัง', 'Chassis No'],
        'brand': ['brand', 'ยี่ห้อ', 'Brand'],
        'model': ['model', 'รุ่น', 'Model'],
        'prbExpiry': ['prbExpiry', 'วันหมดอายุ พรบ.', 'Expiry']
    },
    farmer_types: {
        'id': ['id', 'typeId', 'รหัส'],
        'name': ['name', 'ชื่อประเภท', 'Type Name'],
        'bonus': ['bonus', 'โบนัสพิเศษ', 'Special Bonus']
    },
    buys: {
        'id': ['buyId', 'billId', 'billNo', 'id', 'รหัส'],
        'date': ['date', 'วันที่', 'Date'],
        'farmerId': ['farmerId', 'รหัสเกษตรกร', 'Farmer ID'],
        'farmerName': ['farmerName', 'ชื่อเกษตรกร', 'Farmer Name'],
        'weight': ['weight', 'น้ำหนักสด', 'Weight'],
        'bucketWeight': ['bucketWeight', 'น้ำหนักถัง', 'Bucket Weight'],
        'drc': ['drc', '%DRC', 'DRC'],
        'dryRubber': ['dryRubber', 'เนื้อยางแห้ง', 'Dry Rubber'],
        'pricePerKg': ['pricePerKg', 'ราคา/กก', 'Price'],
        'basePrice': ['basePrice', 'ราคากลาง', 'Base Price'],
        'bonusDrc': ['bonusDrc', 'โบนัส DRC', 'DRC Bonus'],
        'bonusMemberType': ['bonusMemberType', 'โบนัสสมาชิก', 'Member Bonus'],
        'actualPrice': ['actualPrice', 'ราคาสุทธิ', 'Actual Price'],
        'total': ['total', 'รวมทั้งสิ้น', 'Amount'],
        'empPct': ['empPct', 'ส่วนแบ่งลูกจ้าง (%)', 'Employee %'],
        'employeeTotal': ['employeeTotal', 'จ่ายลูกจ้าง', 'Employee Total'],
        'farmerTotal': ['farmerTotal', 'จ่ายเกษตรกร', 'Farmer Total'],
        'status': ['status', 'สถานะ', 'Status'],
        'farmerStatus': ['farmerStatus', 'สถานะเกษตรกร', 'Farmer Status'],
        'employeeStatus': ['employeeStatus', 'สถานะลูกจ้าง', 'Employee Status'],
        'receiptUrl': ['receiptUrl', 'receipt_url', 'URL รูปเสร็จ'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    sells: {
        'id': ['sellId', 'billId', 'billNo', 'id', 'รหัส'],
        'date': ['date', 'วันที่', 'Date'],
        'buyerName': ['buyerName', 'ผู้ซื้อ', 'Buyer Name'],
        'factoryId': ['factoryId', 'รหัสโรงงาน', 'Factory ID'],
        'employeeId': ['employeeId', 'รหัสพนักงาน', 'Staff ID'],
        'truckId': ['truckId', 'รหัสรถ', 'Truck ID'],
        'truckInfo': ['truckInfo', 'ข้อมูลรถ', 'Truck Info'],
        'weight': ['weight', 'น้ำหนักรวม', 'Weight'],
        'drc': ['drc', '%DRC', 'DRC'],
        'pricePerKg': ['pricePerKg', 'ราคาขาย', 'Price'],
        'lossWeight': ['lossWeight', 'น้ำหนักสูญเสีย', 'Loss'],
        'total': ['total', 'รวมเงิน', 'Amount'],
        'profitShareAmount': ['profitShareAmount', 'ส่วนแบ่งกำไร', 'Profit Share'],
        'receiptUrl': ['receiptUrl', 'receipt_url', 'URL รูปเสร็จ'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    expenses: {
        'id': ['id', 'expenseId', 'รหัส'],
        'date': ['date', 'วันที่', 'Date'],
        'category': ['category', 'หมวดหมู่', 'Category'],
        'description': ['description', 'คำอธิบาย', 'Description'],
        'amount': ['amount', 'จำนวนเงิน', 'Amount'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    wages: {
        'id': ['id', 'wageId', 'รหัส'],
        'date': ['date', 'วันที่', 'Date'],
        'staffId': ['staffId', 'รหัสพนักงาน', 'Staff ID'],
        'staffName': ['staffName', 'ชื่อพนักงาน', 'Staff Name'],
        'workDays': ['workDays', 'จำนวนวัน', 'Work Days'],
        'dailyWage': ['dailyWage', 'ค่าจ้าง/วัน', 'Daily Wage'],
        'bonus': ['bonus', 'โบนัส', 'Bonus'],
        'total': ['total', 'รวมทั้งสิ้น', 'Total'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    chemical_usage: {
        'id': ['id', 'chemicalId', 'รหัส'],
        'date': ['date', 'วันที่', 'Date'],
        'chemicalId': ['chemicalId', 'ประเภทสารเคมี', 'Type'],
        'amount': ['amount', 'จำนวน', 'Amount'],
        'unit': ['unit', 'หน่วย', 'Unit']
    },
    settings: {
        'key': ['key', 'รหัสการตั้งค่า', 'Key'],
        'value': ['value', 'ค่าการตั้งค่า', 'Value']
    }
};

const DatabaseManagement = ({ isAdminMode = false, targetUserId = null }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('import');
    const [importMode, setImportMode] = useState('csv');
    const [selectedType, setSelectedType] = useState('farmers');
    const [csvData, setCsvData] = useState([]);
    const [rawJsonData, setRawJsonData] = useState({});
    const [stagedData, setStagedData] = useState({});
    const [idMapping, setIdMapping] = useState({});
    const [settings, setSettings] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [activeReviewTab, setActiveReviewTab] = useState('farmers');
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [step, setStep] = useState(1); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, label: '' });
    const [tableStates, setTableStates] = useState({}); // { tableName: 'waiting' | 'processing' | 'completed' | 'error' }
    const [purgeExisting, setPurgeExisting] = useState(true);

    // Load settings for ID remapping
    useEffect(() => {
        const loadSettings = async () => {
            try {
                let res;
                if (isAdminMode && targetUserId) {
                    // Fetch target user's settings via admin API
                    const reportRes = await adminFetchReportData('getUsageSettings', { userId: targetUserId });
                    // Normalize reportRes.settings (could be Array or Object)
                    let rawSettings = reportRes?.settings || {};
                    let normalized = {};
                    if (Array.isArray(rawSettings)) {
                        rawSettings.forEach(s => normalized[s.key] = s.value);
                    } else if (typeof rawSettings === 'object') {
                        normalized = rawSettings;
                    }
                    res = { status: 'success', data: normalized };
                } else {
                    res = await getSettings();
                }
                
                if (res.status === 'success') {
                    setSettings(res.data);
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        loadSettings();
    }, [isAdminMode, targetUserId]);

    const remapId = (oldId, type, currentSettings) => {
        if (!oldId || !currentSettings) return oldId;
        const sequence = String(oldId).trim(); // PRESERVE FULL ID STRING
        
        const getVal = (key1, key2) => currentSettings[key1] || currentSettings[key2];

        // Ensure station is derived correctly
        const uName = user?.username || 'RTB';
        const defaultStation = uName.substring(0, 3).toUpperCase();
        const station = getVal('station_code', 'stationCode') || defaultStation;
        
        const now = new Date();
        const YYYY = now.getFullYear().toString();
        const MM = (now.getMonth() + 1).toString().padStart(2, '0');
        const DD = now.getDate().toString().padStart(2, '0');
        
        const formatString = type === 'farmers' ? (getVal('format_farmer_id', 'formatFarmerId') || '{STATION}-F-{SEQ4}') 
                          : type === 'employees' ? (getVal('format_employee_id', 'formatEmployeeId') || '{STATION}-W-{SEQ3}')
                          : type === 'factories' ? (getVal('format_factory_id', 'formatFactoryId') || '{STATION}-FAC-{SEQ3}')
                          : type === 'staff' ? (getVal('format_staff_id', 'formatStaffId') || '{STATION}-S-{SEQ3}')
                          : type === 'trucks' ? (getVal('format_truck_id', 'formatTruckId') || '{STATION}-T-{SEQ3}')
                          : type === 'buys' ? (getVal('format_buy_bill', 'formatBuyBill') || 'B-{STATION}{YYYY}-{SEQ4}')
                          : type === 'sells' ? (getVal('format_sell_bill', 'formatSellBill') || 'S-{STATION}{YYYY}-{SEQ4}')
                          : null;
        
        if (!formatString) return oldId;
        
        // --- 1. PREVENTION: Skip if already prefixed correctly ---
        const prefixToCheck = formatString.split('{SEQ')[0]
            .replace(/{STATION}/g, station)
            .replace(/{YYYY}/g, YYYY)
            .replace(/{MM}/g, MM)
            .replace(/{DD}/g, DD);
        
        if (sequence.startsWith(prefixToCheck)) {
            console.log(`[Remap] Skipping ${sequence} (already has prefix ${prefixToCheck})`);
            return sequence;
        }

        // --- 2. GENERATION ---
        let newId = formatString
            .replace(/{STATION}/g, station)
            .replace(/{YYYY}/g, YYYY)
            .replace(/{MM}/g, MM)
            .replace(/{DD}/g, DD);

        const seqMatch = formatString.match(/\{SEQ(\d+)\}/);
        if (seqMatch) {
            const padLen = parseInt(seqMatch[1]);
            // Use full original ID, but ensure it meets minimum pad length if numeric
            const paddedSeq = sequence.length < padLen && !isNaN(sequence) ? sequence.padStart(padLen, '0') : sequence;
            newId = newId.replace(seqMatch[0], paddedSeq);
        }
        
        console.log(`[Remap] ${oldId} -> ${newId}`);
        return newId;
    };

    const validateData = (data) => {
        const errors = {};
        Object.keys(data).forEach(type => {
            const typeErrors = {};
            data[type]?.forEach((item, index) => {
                const rowErrors = [];
                if (type === 'farmers' && !item.name) rowErrors.push('ขาดชื่อเกษตรกร');
                if (type === 'buys' && !item.date) rowErrors.push('ขาดวันที่ซื้อ');
                if (type === 'sells' && !item.date) rowErrors.push('ขาดวันที่ขาย');
                if (type === 'employees' && !item.name) rowErrors.push('ขาดชื่อลูกจ้าง');
                if (rowErrors.length > 0) typeErrors[index] = rowErrors;
            });
            if (Object.keys(typeErrors).length > 0) errors[type] = typeErrors;
        });
        return errors;
    };

    const handleConvert = () => {
        if (!rawJsonData || typeof rawJsonData !== 'object') {
            toast.error('กรุณาเลือกไฟล์ JSON ที่ถูกต้องก่อน');
            return;
        }

        setIsConverting(true);
        const toastId = toast.loading('กำลังแปลงข้อมูลและปรับรหัส (IDs)...');
        console.log("Starting conversion with settings:", settings);
        console.log("Raw JSON Keys:", Object.keys(rawJsonData));

        try {
            const mappedIds = { farmers: {}, employees: {}, factories: {}, staff: {}, trucks: {}, buys: {}, sells: {} };
            const processedData = {};
            const normalizeRecord = (rawItem, type) => {
                const schema = FIELD_MAPPINGS[type];
                if (!schema) return rawItem;
                const normalized = {};
                Object.keys(schema).forEach(dbKey => {
                    const aliases = schema[dbKey];
                    const sourceKeys = Object.keys(rawItem);

                    // Find the BEST source key based on alias ORDER
                    let foundKey = null;
                    if (sourceKeys.some(sk => sk.toLowerCase() === dbKey.toLowerCase())) {
                        foundKey = sourceKeys.find(sk => sk.toLowerCase() === dbKey.toLowerCase());
                    } else {
                        // Check aliases sequentially representing priority
                        for (const alias of aliases) {
                            const match = sourceKeys.find(sk => sk.toLowerCase() === alias.toLowerCase());
                            if (match) {
                                foundKey = match;
                                break;
                            }
                        }
                    }
                    
                    normalized[dbKey] = foundKey !== null ? rawItem[foundKey] : null;
                });
                return normalized;
            };

            const allTables = ['farmers', 'employees', 'factories', 'staff', 'trucks', 'buys', 'sells', 'wages', 'expenses', 'chemicals', 'farmer_types'];
            const jsonKeys = Object.keys(rawJsonData);

            // First Pass: Remap primary IDs with case-insensitive table matching
            allTables.forEach(type => {
                const sourceKey = jsonKeys.find(k => k.toLowerCase() === type.toLowerCase());
                const sourceData = sourceKey ? rawJsonData[sourceKey] : null;

                if (Array.isArray(sourceData)) {
                    console.log(`Processing table: ${type} (${sourceData.length} records)`);
                    processedData[type] = sourceData.map(rawItem => {
                        const item = normalizeRecord(rawItem, type);
                        if (item.id) {
                            const newId = remapId(item.id, type, settings);
                            if (mappedIds[type]) mappedIds[type][item.id] = newId;
                            item.id = newId;
                        }
                        return item;
                    });
                }
            });

            // Second Pass: Update Foreign Key references in the already PROCESSED data
            allTables.forEach(type => {
                if (Array.isArray(processedData[type])) {
                    processedData[type] = processedData[type].map(item => {
                        if (item.farmerId && mappedIds.farmers[item.farmerId]) item.farmerId = mappedIds.farmers[item.farmerId];
                        if (item.employeeId && mappedIds.employees[item.employeeId]) item.employeeId = mappedIds.employees[item.employeeId];
                        if (item.factoryId && mappedIds.factories[item.factoryId]) item.factoryId = mappedIds.factories[item.factoryId];
                        if (item.truckId && mappedIds.trucks[item.truckId]) item.truckId = mappedIds.trucks[item.truckId];
                        if (item.staffId && mappedIds.staff[item.staffId]) item.staffId = mappedIds.staff[item.staffId];
                        return item;
                    });
                }
            });

            console.log("Conversion complete. Mapped IDs count:", 
                Object.keys(mappedIds).reduce((acc, k) => acc + Object.keys(mappedIds[k]).length, 0));
            
            setStagedData(processedData);
            setIdMapping(mappedIds);
            setValidationErrors(validateData(processedData));
            toast.success('แปลงข้อมูลสำเร็จ รหัสถูกปรับปรุงตามการตั้งค่าแล้ว', { id: toastId });
        } catch (err) {
            console.error("Conversion Error:", err);
            toast.error('การแปลงข้อมูลล้มเหลว: ' + err.message, { id: toastId });
        } finally {
            setIsConverting(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    setImportMode('json');
                    setRawJsonData(json);
                    setStagedData({});
                    const tables = Object.keys(json).filter(k => Array.isArray(json[k]));
                    if (tables.length > 0) setActiveReviewTab(tables[0]);
                    setStep(2);
                } catch (err) { toast.error('ไม่สามารถอ่านไฟล์ JSON ได้'); }
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.csv')) {
            setImportMode('csv');
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length > 0) {
                        setCsvData(results.data);
                        setHeaders(Object.keys(results.data[0]));
                        setStep(2);
                    } else toast.error('ไฟล์ว่างเปล่า');
                }
            });
        }
    };

    const handleImportTable = async (tableName) => {
        if (!stagedData[tableName] || stagedData[tableName].length === 0) return;
        
        setTableStates(prev => ({ ...prev, [tableName]: 'processing' }));
        const toastId = toast.loading(`กำลังนำเข้าตาราง ${tableName}${purgeExisting ? ' (แบบล้างข้อมูลเก่า)' : ''}...`);
        
        try {
            let res;
            if (isAdminMode && targetUserId) {
                res = await adminImportTable(targetUserId, tableName, stagedData[tableName], purgeExisting);
            } else {
                res = await bulkAddRecords(tableName, stagedData[tableName]);
            }

            if (res.status === 'success') {
                toast.success(`ตาราง ${tableName} สำเร็จ! (${res.count} รายการ)`, { id: toastId });
                setTableStates(prev => ({ ...prev, [tableName]: 'completed' }));
                return true;
            } else {
                toast.error(`ตาราง ${tableName} ล้มเหลว: ${res.message}`, { id: toastId });
                setTableStates(prev => ({ ...prev, [tableName]: 'error' }));
                return false;
            }
        } catch (error) {
            toast.error(`ข้อผิดพลาดตาราง ${tableName}: ${error.message}`, { id: toastId });
            setTableStates(prev => ({ ...prev, [tableName]: 'error' }));
            return false;
        }
    };

    const handleImport = async () => {
        setIsProcessing(true);
        const toastId = toast.loading('กำลังนำเข้าข้อมูล...');
        try {
            if (importMode === 'csv') {
                const transformedData = csvData.map(row => {
                    const item = {};
                    Object.keys(mapping).forEach(field => {
                        const csvHeader = mapping[field];
                        if (csvHeader) item[field] = row[csvHeader];
                    });
                    return item;
                });

                let res;
                if (isAdminMode && targetUserId) {
                    res = await adminImportTable(targetUserId, selectedType, transformedData);
                } else {
                    res = await bulkAddRecords(selectedType, transformedData);
                }

                if (res.status === 'success') {
                    toast.success(`นำเข้าสำเร็จ ${res.count} รายการ`, { id: toastId });
                    setStep(1);
                } else toast.error('ล้มเหลว: ' + res.message, { id: toastId });
            } else {
                const tables = Object.keys(stagedData).filter(k => Array.isArray(stagedData[k]) && stagedData[k].length > 0);
                const sortedTables = getSortedTables(tables);

                let successCount = 0;
                for (const table of sortedTables) {
                    if (tableStates[table] === 'completed') continue;
                    
                    const success = await handleImportTable(table);
                    if (success) successCount++;
                }
                
                toast.success(`ดำเนินการเสร็จสิ้น (สำเร็จ ${successCount} ตาราง)`, { id: toastId });
                
                // Clear all local cache to force fresh data display
                clearAllCache();
                toast.success('ล้าง Cache ในเครื่องเรียบร้อยแล้ว');
            }
        } catch (error) { toast.error('เกิดข้อผิดพลาดรวม: ' + error.message, { id: toastId }); }
        finally { setIsProcessing(false); }
    };

    const getSortedTables = (tables) => {
        const importOrder = ['settings', 'farmer_types', 'factories', 'staff', 'farmers', 'employees', 'trucks', 'buys', 'sells', 'expenses', 'wages', 'chemicals'];
        return tables.sort((a, b) => {
            const indexA = importOrder.indexOf(a);
            const indexB = importOrder.indexOf(b);
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });
    };

    const handleExport = async (type) => {
        const toastId = toast.loading(`กำลังส่งออก ${type}...`);
        try {
            let data = [];
            if (isAdminMode && targetUserId) {
                data = await adminExportTable(targetUserId, type);
            } else {
                switch (type) {
                    case 'farmers': data = await fetchFarmers(); break;
                    case 'staff': data = await fetchStaff(); break;
                    case 'employees': data = await fetchEmployees(); break;
                    case 'factories': data = await fetchFactories(); break;
                    case 'buys': data = await fetchBuyRecords(); break;
                    case 'sells': data = await fetchSellRecords(); break;
                    default: break;
                }
            }

            if (!data || data.length === 0) {
                toast.error(`ไม่มีข้อมูล ${type}`, { id: toastId });
                return;
            }

            const filteredData = data.map(item => {
                const { userId, created_at, updated_at, ...rest } = item;
                return rest;
            });

            const csv = Papa.unparse(filteredData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${type}_${targetUserId || 'me'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            toast.success('ส่งออกสำเร็จ', { id: toastId });
        } catch (err) { toast.error('ล้มเหลว: ' + err.message, { id: toastId }); }
    };

    return (
        <div className="space-y-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('import')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'import' ? 'bg-white text-rubber-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Upload size={16} className="inline mr-2" />
                    นำเข้าข้อมูล (Import)
                </button>
                <button
                    onClick={() => setActiveTab('export')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'export' ? 'bg-white text-rubber-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Download size={16} className="inline mr-2" />
                    ส่งออกข้อมูล (Export)
                </button>
            </div>

            {activeTab === 'import' ? (
                <div className="space-y-6">
                    {/* Stepper */}
                    <div className="flex items-center space-x-4 bg-white p-4 rounded-xl border border-gray-100">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`flex items-center space-x-2 ${step >= s ? 'text-rubber-600' : 'text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step >= s ? 'border-rubber-600' : 'border-gray-200'}`}>{s}</div>
                                <span className="text-xs font-bold">{s === 1 ? 'อัปโหลด' : s === 2 ? 'ตรวจสอบ' : 'ยืนยัน'}</span>
                                {s < 3 && <ChevronRight size={14} />}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4">1. เลือกประเภทการนำเข้า</h3>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button onClick={() => setImportMode('csv')} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 ${importMode === 'csv' ? 'border-rubber-500 bg-rubber-50 text-rubber-700' : 'border-gray-100 text-gray-400'}`}>
                                        <FileSpreadsheet />
                                        <span className="text-xs font-bold">รายตาราง (CSV)</span>
                                    </button>
                                    <button onClick={() => setImportMode('json')} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 ${importMode === 'json' ? 'border-rubber-500 bg-rubber-50 text-rubber-700' : 'border-gray-100 text-gray-400'}`}>
                                        <FileJson />
                                        <span className="text-xs font-bold">ฐานข้อมูลทั้งหมด (JSON)</span>
                                    </button>
                                </div>
                                {importMode === 'csv' && (
                                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full border-gray-200 rounded-lg text-sm">
                                        {IMPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <input type="file" accept={importMode === 'csv' ? '.csv' : '.json'} onClick={(e) => { e.target.value = null; }} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <div className="p-4 bg-rubber-50 rounded-full text-rubber-600 mb-2 group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>
                                <p className="font-bold text-gray-900 text-sm">คลิกเพื่ออัปโหลดไฟล์</p>
                                <p className="text-[10px] text-gray-500 mt-1">ไฟล์นำเข้าจะต้องเป็นนามสกุล .{importMode}</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
                            {importMode === 'csv' ? (
                                <div className="p-6">
                                    <h3 className="font-bold text-gray-900 mb-4">จับคู่หัวตาราง CSV (Mapping)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.keys(FIELD_MAPPINGS[selectedType]).map(field => (
                                            <div key={field} className="flex flex-col space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">{field}</label>
                                                <select 
                                                    value={mapping[field] || ''} 
                                                    onChange={(e) => setMapping(p => ({...p, [field]: e.target.value}))}
                                                    className="border-gray-200 rounded-lg text-xs"
                                                >
                                                    <option value="">-- ข้าม --</option>
                                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setStep(3)} className="mt-8 w-full bg-rubber-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-rubber-700 transition-all">ตรวจสอบความถูกต้อง</button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    <div className="p-4 bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            {Object.keys(rawJsonData).filter(k => Array.isArray(rawJsonData[k])).map(t => (
                                                <button key={t} onClick={() => setActiveReviewTab(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeReviewTab === t ? 'bg-rubber-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-100'}`}>
                                                    {t.toUpperCase()} ({rawJsonData[t].length})
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={handleConvert} disabled={isConverting} className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all flex items-center">
                                            {isConverting ? <RefreshCw className="animate-spin mr-2" size={12} /> : <RefreshCw className="mr-2" size={12} />}
                                            Convert & Adjust IDs
                                        </button>
                                    </div>
                                    <div className="flex flex-col space-y-8 p-4 bg-gray-50/20 overflow-hidden">
                                        {/* Raw Data Preview (Top) */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">1. ข้อมูลต้นฉบับ (Raw JSON Source)</h4>
                                                <span className="text-[9px] font-bold text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    {(() => {
                                                        const keys = Array.from(new Set(rawJsonData[activeReviewTab]?.flatMap(item => Object.keys(item)) || []));
                                                        return `${keys.length} คอลัมน์ที่ตรวจพบ`;
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto custom-scrollbar shadow-sm">
                                                <table className="min-w-full text-[10px] text-left border-collapse">
                                                    <thead className="bg-gray-50 sticky top-0 font-bold text-gray-400 z-10 border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-4 py-3 w-10 bg-gray-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] text-center text-[8px]">#</th>
                                                            {(() => {
                                                                const keys = Array.from(new Set(rawJsonData[activeReviewTab]?.flatMap(item => Object.keys(item)) || []));
                                                                return keys.map(k => (
                                                                    <th key={k} className="px-4 py-3 whitespace-nowrap border-r border-gray-100/50 last:border-r-0 min-w-[120px]">{k}</th>
                                                                ));
                                                            })()}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 text-gray-400 italic">
                                                        {rawJsonData[activeReviewTab]?.map((item, i) => {
                                                            const keys = Array.from(new Set(rawJsonData[activeReviewTab]?.flatMap(item => Object.keys(item)) || []));
                                                            return (
                                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="px-4 py-2.5 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] border-r border-gray-50 text-center font-bold">{i+1}</td>
                                                                    {keys.map((k, j) => (
                                                                        <td key={j} className="px-4 py-2.5 whitespace-nowrap border-r border-gray-50/30 last:border-r-0 max-w-[200px] truncate" title={String(item[k] ?? '-')}>
                                                                            {item[k] === null || item[k] === undefined ? '-' : String(item[k])}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Divider with label */}
                                        <div className="relative py-4 flex items-center">
                                            <div className="flex-grow border-t border-dashed border-gray-200"></div>
                                            <span className="flex-shrink mx-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-indigo-50 shadow-sm">
                                                กำลังแปลงข้อมูล... (Database Normalization)
                                            </span>
                                            <div className="flex-grow border-t border-dashed border-gray-200"></div>
                                        </div>

                                        {/* Converted Data Preview (Bottom) */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em]">2. ข้อมูลที่แปลงแล้ว (Ready for Import)</h4>
                                                <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                                    {Object.keys(FIELD_MAPPINGS[activeReviewTab] || {}).filter(k=>!['userId', 'created_at', 'updated_at'].includes(k)).length} ฟิลด์มาตรฐาน
                                                </span>
                                            </div>
                                            <div className="bg-white border border-green-100 rounded-xl overflow-x-auto custom-scrollbar shadow-sm">
                                                <table className="min-w-full text-[10px] text-left border-collapse">
                                                    <thead className="bg-green-50/80 sticky top-0 font-bold text-green-700 z-10 border-b border-green-100">
                                                        <tr>
                                                            <th className="px-4 py-3 w-10 bg-green-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center text-[8px]">#</th>
                                                            {Object.keys(FIELD_MAPPINGS[activeReviewTab] || {})
                                                                .filter(k => !['userId', 'created_at', 'updated_at'].includes(k))
                                                                .map(k => (
                                                                    <th key={k} className="px-4 py-3 whitespace-nowrap border-r border-green-100/30 last:border-r-0 min-w-[140px]">{k}</th>
                                                                ))
                                                            }
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-green-50">
                                                        {stagedData[activeReviewTab]?.map((item, i) => (
                                                            <tr key={i} className="bg-white hover:bg-green-50/30 transition-colors">
                                                                <td className="px-4 py-3 text-gray-300 font-mono bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] border-r border-green-50 text-center">{i+1}</td>
                                                                {Object.keys(FIELD_MAPPINGS[activeReviewTab] || {})
                                                                    .filter(k => !['userId', 'created_at', 'updated_at'].includes(k))
                                                                    .map(k => (
                                                                        <td key={k} className={`px-4 py-3 whitespace-nowrap border-r border-green-50/20 last:border-r-0 ${k.toLowerCase().endsWith('id') ? 'font-mono text-rubber-700 bg-rubber-50/30 font-bold' : 'text-gray-600'}`}>
                                                                            {item[k] === null || item[k] === undefined ? '-' : String(item[k])}
                                                                        </td>
                                                                    ))
                                                                }
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 flex justify-end">
                                        <button onClick={() => setStep(3)} disabled={Object.keys(stagedData).length === 0} className="px-8 py-2 bg-rubber-600 text-white font-bold rounded-lg shadow-md hover:bg-rubber-700 transition-all flex items-center text-sm disabled:opacity-50">ยืนยันข้อมูล <ArrowRight size={16} className="ml-2" /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900">ยืนยันการนำเข้าข้อมูล</h3>
                                <p className="text-gray-500 mt-2">โปรดตรวจสอบความถูกต้องเป็นครั้งสุดท้ายก่อนบันทึกลงระบบ</p>
                                
                                <div className="w-full max-w-md mt-6 p-4 bg-gray-50 rounded-xl space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-bold">โหมดนำเข้า:</span>
                                        <span className="text-gray-900 font-black uppercase text-rubber-600">{importMode === 'csv' ? `รายตาราง (${selectedType})` : 'FULL BACKUP (JSON)'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-bold">จำนวนรายการ:</span>
                                        <span className="text-gray-900 font-black">
                                            {importMode === 'csv' ? csvData.length : Object.values(stagedData).reduce((acc, curr) => acc + (curr?.length || 0), 0)} แถว
                                        </span>
                                    </div>
                                    {isAdminMode && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-bold">เป้าหมาย (UserID):</span>
                                            <span className="text-blue-600 font-black">{targetUserId}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Purge Option */}
                                <div className="mt-6 w-full max-w-md">
                                    <label className="flex items-center p-4 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={purgeExisting} 
                                            onChange={(e) => setPurgeExisting(e.target.checked)}
                                            className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500 mr-3"
                                        />
                                        <div className="text-left">
                                            <div className="text-xs font-black text-red-700">ล้างข้อมูลเดิมในระบบก่อนนำเข้า (แนะนำ)</div>
                                            <div className="text-[10px] text-red-600">ข้อมูลเก่าของ {targetUserId || 'คุณ'} ในตารางเหล่านี้จะถูกลบทิ้งทั้งหมดก่อนบันทึกใหม่</div>
                                        </div>
                                    </label>
                                </div>

                                {importMode === 'json' ? (
                                    <div className="w-full mt-8 space-y-3">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 text-left border-b pb-1">รายการตารางที่รอการยืนยัน</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {getSortedTables(Object.keys(stagedData)).map(tableName => {
                                                const rows = stagedData[tableName];
                                                const state = tableStates[tableName] || 'waiting';
                                                
                                                return (
                                                    <div key={tableName} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-all">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`p-1.5 rounded-lg ${state === 'completed' ? 'bg-green-50 text-green-600' : state === 'processing' ? 'bg-blue-50 text-blue-600' : state === 'error' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                                                                {state === 'completed' ? <CheckCircle2 size={16} /> : state === 'processing' ? <Loader2 size={16} className="animate-spin" /> : state === 'error' ? <AlertCircle size={16} /> : <Database size={16} />}
                                                            </div>
                                                            <div>
                                                                <div className="text-[11px] font-black text-gray-900 group-hover:text-rubber-600 transition-colors uppercase">{tableName}</div>
                                                                <div className="text-[9px] text-gray-500 font-bold">{rows.length} รายการ</div>
                                                            </div>
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={() => handleImportTable(tableName)}
                                                            disabled={state === 'completed' || state === 'processing'}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm transition-all flex items-center ${state === 'completed' ? 'bg-green-100 text-green-700 cursor-default' : 'bg-rubber-600 text-white hover:bg-rubber-700 active:scale-95 disabled:opacity-50'}`}
                                                        >
                                                            {state === 'completed' ? 'สำเร็จแล้ว' : state === 'processing' ? 'กำลังบันทึก...' : 'กดเพื่อยืนยัน'}
                                                            {state === 'waiting' && <ArrowRight size={12} className="ml-1.5" />}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex space-x-4 mt-8 w-full">
                                            <button onClick={() => setStep(2)} className="flex-1 px-6 py-3 border border-gray-200 text-gray-400 font-bold rounded-xl hover:bg-gray-50 transition-all lowercase">back</button>
                                            <button 
                                                onClick={handleImport} 
                                                disabled={isProcessing || Object.values(tableStates).every(s => s === 'completed')} 
                                                className="flex-[2] px-6 py-3 bg-rubber-600 text-white font-black rounded-xl shadow-lg hover:bg-rubber-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center border-2 border-rubber-100"
                                            >
                                                {isProcessing ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                                                บันทึกตารางที่เหลือทั้งหมด
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        {importProgress.total > 0 && (
                                            <div className="w-full max-w-md mt-6 border-t pt-6">
                                                <div className="text-[10px] font-black uppercase text-gray-400 mb-2 flex justify-between">
                                                    <span>{importProgress.label}</span>
                                                    <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                    <div className="bg-rubber-600 h-full transition-all duration-300" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex space-x-4 mt-8 w-full max-w-sm mx-auto">
                                            <button onClick={() => setStep(2)} className="flex-1 px-6 py-3 border border-gray-200 text-gray-400 font-bold rounded-xl hover:bg-gray-50 transition-all lowercase">back</button>
                                            <button onClick={handleImport} disabled={isProcessing} className="flex-[2] px-6 py-3 bg-rubber-600 text-white font-black rounded-xl shadow-lg hover:bg-rubber-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
                                                {isProcessing ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                                                เริ่มการบันทึกข้อมูล
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Export Section */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                    {[
                        { id: 'farmers', label: 'เกษตรกร (Farmers)', desc: 'รายชื่อและเบอร์โทร' },
                        { id: 'employees', label: 'ลูกจ้าง (Employees)', desc: 'รายชื่อและส่วนแบ่ง' },
                        { id: 'staff', label: 'พนักงาน (Staff)', desc: 'เงินเดือนและข้อมูลพนักงาน' },
                        { id: 'factories', label: 'โรงงาน (Factories)', desc: 'รายชื่อและรหัสโรงงาน' },
                        { id: 'buys', label: 'รายการซื้อ (Buys)', desc: 'ประวัติการรับซื้อยาง' },
                        { id: 'sells', label: 'รายการขาย (Sells)', desc: 'ประวัติการขายส่งโรงงาน' }
                    ].map(type => (
                        <div key={type.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-rubber-200 transition-all group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="p-2 bg-rubber-50 rounded-xl text-rubber-600 group-hover:bg-rubber-600 group-hover:text-white transition-all"><Download size={20} /></span>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{type.id}</span>
                            </div>
                            <h4 className="font-bold text-gray-900 group-hover:text-rubber-700 transition-colors">{type.label}</h4>
                            <p className="text-xs text-gray-500 mb-4">{type.desc}</p>
                            <button onClick={() => handleExport(type.id)} className="w-full text-xs font-black py-2.5 rounded-lg border-2 border-gray-100 text-gray-400 hover:border-rubber-600 hover:text-rubber-600 transition-all uppercase tracking-wider">Export CSV</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DatabaseManagement;

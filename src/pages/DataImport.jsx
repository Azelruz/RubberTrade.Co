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
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    bulkAddRecords, 
    fetchFarmers, 
    fetchFactories, 
    fetchStaff,
    fetchEmployees,
    fetchBuyRecords,
    fetchSellRecords
} from '../services/apiService';

const IMPORT_TYPES = [
    { id: 'farmers', name: 'ข้อมูลเกษตรกร', icon: <Database className="text-blue-500" /> },
    { id: 'staff', name: 'ข้อมูลพนักงาน (Staff)', icon: <Database className="text-purple-500" /> },
    { id: 'employees', name: 'ข้อมูลลูกจ้าง (Employees)', icon: <Database className="text-indigo-500" /> },
    { id: 'factories', name: 'ข้อมูลโรงงาน', icon: <Database className="text-green-500" /> },
    { id: 'buys', name: 'ประวัติการซื้อ', icon: <FileSpreadsheet className="text-orange-500" /> },
    { id: 'sells', name: 'ประวัติการขาย', icon: <FileSpreadsheet className="text-red-500" /> },
];

const FIELD_MAPPINGS = {
    farmers: {
        'name': ['name', 'ชื่อ', 'ชื่อ-นามสกุล', 'Name'],
        'phone': ['phone', 'เบอร์โทร', 'โทร', 'Phone', 'Telephone'],
        'bankAccount': ['bankAccount', 'เลขบัญชี', 'บัญชีธนาคาร', 'Bank Account'],
        'bankName': ['bankName', 'ธนาคาร', 'ชื่อธนาคาร', 'Bank Name'],
        'address': ['address', 'ที่อยู่', 'Address'],
        'note': ['note', 'หมายเหตุ', 'Note'],
        'fscId': ['fscId', 'รหัส FSC', 'fsc_id', 'FSC ID']
    },
    staff: {
        'name': ['name', 'ชื่อ', 'Name'],
        'phone': ['phone', 'เบอร์โทร', 'Phone'],
        'address': ['address', 'ที่อยู่', 'Address'],
        'salary': ['salary', 'เงินเดือน', 'Salary'],
        'bonus': ['bonus', 'โบนัส', 'Bonus'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    employees: {
        'name': ['name', 'ชื่อ', 'Name'],
        'farmerId': ['farmerId', 'รหัสเกษตรกร', 'Farmer ID'],
        'profitSharePct': ['profitSharePct', '% ส่วนแบ่ง', 'Profit Share %'],
        'phone': ['phone', 'เบอร์โทร', 'Phone'],
        'bankAccount': ['bankAccount', 'เลขบัญชี', 'Bank Account'],
        'bankName': ['bankName', 'ธนาคาร', 'Bank Name']
    },
    factories: {
        'name': ['name', 'ชื่อโรงงาน', 'Factory Name'],
        'code': ['code', 'รหัสโรงงาน', 'Factory Code'],
        'shortName': ['shortName', 'ชื่อย่อ', 'Short Name'],
        'taxId': ['taxId', 'เลขผู้เสียภาษี', 'Tax ID'],
        'address': ['address', 'ที่อยู่', 'Address']
    },
    buys: {
        'date': ['date', 'วันที่', 'Date'],
        'farmerId': ['farmerId', 'รหัสเกษตรกร', 'Farmer ID'],
        'weight': ['weight', 'น้ำหนักสด', 'Weight'],
        'drc': ['drc', '%DRC', 'DRC'],
        'pricePerKg': ['pricePerKg', 'ราคา/กก', 'Price'],
        'actualPrice': ['actualPrice', 'ราคาสุทธิ', 'Actual Price'],
        'note': ['note', 'หมายเหตุ', 'Note']
    },
    sells: {
        'date': ['date', 'วันที่', 'Date'],
        'factoryId': ['factoryId', 'รหัสโรงงาน', 'Factory ID'],
        'weight': ['weight', 'น้ำหนักรวม', 'Weight'],
        'drc': ['drc', '%DRC', 'DRC'],
        'pricePerKg': ['pricePerKg', 'ราคาขาย', 'Price'],
        'note': ['note', 'หมายเหตุ', 'Note']
    }
};

const DataImport = () => {
    const [activeTab, setActiveTab] = useState('import'); // 'import' or 'export'
    const [selectedType, setSelectedType] = useState('farmers');
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [step, setStep] = useState(1); // 1: Select Type/File, 2: Mapping, 3: Preview
    const [isProcessing, setIsProcessing] = useState(false);

    // Auto-map headers when new CSV is loaded
    useEffect(() => {
        if (headers.length > 0) {
            const newMapping = {};
            const config = FIELD_MAPPINGS[selectedType];
            
            Object.keys(config).forEach(field => {
                const possibleNames = config[field];
                const matchedHeader = headers.find(h => 
                    possibleNames.some(p => p.toLowerCase() === h.trim().toLowerCase())
                );
                if (matchedHeader) {
                    newMapping[field] = matchedHeader;
                }
            });
            setMapping(newMapping);
        }
    }, [headers, selectedType]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data.length > 0) {
                    setCsvData(results.data);
                    setHeaders(Object.keys(results.data[0]));
                    setStep(2);
                } else {
                    toast.error('ไฟล์ว่างเปล่าหรือไม่ถูกต้อง');
                }
            },
            error: (err) => {
                toast.error('ไม่สามารถอ่านไฟล์ได้: ' + err.message);
            }
        });
    };

    const handleConfirmMapping = () => {
        if (!mapping.name && selectedType !== 'buys' && selectedType !== 'sells') {
            toast.error('ต้องกำหนคหัวข้อ "ชื่อ" (Name) อย่างน้อยหนึ่งอย่าง');
            return;
        }
        if ((selectedType === 'buys' || selectedType === 'sells') && !mapping.date) {
            toast.error('ต้องระบุหัวข้อ "วันที่" (Date)');
            return;
        }
        setStep(3);
    };

    const handleImport = async () => {
        setIsProcessing(true);
        const toastId = toast.loading('กำลังนำเข้าข้อมูล...');

        try {
            // Transform data based on mapping
            const transformedData = csvData.map(row => {
                const item = {};
                Object.keys(mapping).forEach(field => {
                    const csvHeader = mapping[field];
                    if (csvHeader) {
                        item[field] = row[csvHeader];
                    }
                });
                return item;
            });

            // Call API
            const res = await bulkAddRecords(selectedType, transformedData);

            if (res.status === 'success') {
                toast.success(`นำเข้าสำเร็จ ${res.count} รายการ`, { id: toastId });
                setStep(1);
                setCsvData([]);
                setMapping({});
            } else {
                toast.error('การนำเข้าล้มเหลว: ' + res.message, { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาด: ' + error.message, { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = async (type) => {
        const toastId = toast.loading(`กำลังเตรียมข้อมูล ${type}...`);
        try {
            let data = [];
            switch (type) {
                case 'farmers': data = await fetchFarmers(); break;
                case 'staff': data = await fetchStaff(); break;
                case 'employees': data = await fetchEmployees(); break;
                case 'factories': data = await fetchFactories(); break;
                case 'buys': data = await fetchBuyRecords(); break;
                case 'sells': data = await fetchSellRecords(); break;
                default: break;
            }

            if (!data || data.length === 0) {
                console.warn(`[Export] No data found for type: ${type}`);
                toast.error(`ไม่มีข้อมูล ${type} สำหรับส่งออก`, { id: toastId });
                return;
            }

            console.log(`[Export] Preparing to download ${data.length} records for ${type}`);

            // Filter out internal fields (userId, created_at, updated_at) to make export clean for re-import
            const filteredData = data.map(item => {
                const { userId, created_at, updated_at, ...rest } = item;
                return rest;
            });

            // Client-side fetch wrapper fallback if needed
            const csv = Papa.unparse(filteredData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `${type}_export_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('ส่งออกข้อมูลสำเร็จ', { id: toastId });
        } catch (error) {
            toast.error('การส่งออกล้มเหลว: ' + error.message, { id: toastId });
        }
    };

    const resetImport = () => {
        setStep(1);
        setCsvData([]);
        setMapping({});
        setHeaders([]);
    };

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                    <Database className="mr-3 text-rubber-600" />
                    การจัดการข้อมูลระบบ (Cloud Data Management)
                </h1>
                <p className="text-gray-500 text-sm">นำเข้าหรือสำรองข้อมูลชุดใหญ่ผ่านไฟล์ CSV เพื่อความคล่องตัวในการบริหารจัดการ</p>
            </header>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('import')}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center ${
                        activeTab === 'import' 
                            ? 'bg-white text-rubber-700 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Upload size={18} className="mr-2" />
                    นำเข้าข้อมูล (Import)
                </button>
                <button
                    onClick={() => setActiveTab('export')}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center ${
                        activeTab === 'export' 
                            ? 'bg-white text-rubber-700 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Download size={18} className="mr-2" />
                    ส่งออกข้อมูล (Export)
                </button>
            </div>

            {activeTab === 'import' ? (
                <>
                    {/* Stepper */}
                    <div className="flex items-center justify-between mb-12 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        {[
                            { id: 1, name: 'เลือกประเภทและไฟล์' },
                            { id: 2, name: 'ตรวจสอบข้อมูลหัวตาราง' },
                            { id: 3, name: 'ยืนยันการนำเข้า' }
                        ].map((s, idx) => (
                            <React.Fragment key={s.id}>
                                <div className={`flex items-center space-x-3 ${step >= s.id ? 'text-rubber-600' : 'text-gray-400'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${step >= s.id ? 'border-rubber-600 bg-rubber-50' : 'border-gray-200'}`}>
                                        {step > s.id ? <CheckCircle2 size={18} /> : s.id}
                                    </div>
                                    <span className="font-semibold text-sm">{s.name}</span>
                                </div>
                                {idx < 2 && <ArrowRight size={20} className="text-gray-300 mx-2" />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step 1: Selection & Upload */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
                            <div className="md:col-span-1 space-y-4">
                                <label className="block text-sm font-bold text-gray-700 mb-4">1. เลือกประเภทข้อมูลที่ต้องการนำเข้า</label>
                                <div className="space-y-2">
                                    {IMPORT_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedType(type.id)}
                                            className={`w-full flex items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                                selectedType === type.id 
                                                    ? 'border-rubber-500 bg-rubber-50 ring-2 ring-rubber-200' 
                                                    : 'border-gray-100 bg-white hover:border-gray-200'
                                            }`}
                                        >
                                            <span className="p-2 bg-white rounded-lg shadow-sm mr-4">{type.icon}</span>
                                            <span className={`font-semibold ${selectedType === type.id ? 'text-rubber-800' : 'text-gray-700'}`}>
                                                {type.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 h-full flex flex-col items-center justify-center text-center">
                                    <label className="block text-sm font-bold text-gray-700 mb-6 w-full text-left">2. อัปโหลดไฟล์ CSV</label>
                                    
                                    <div className="w-full max-w-sm border-2 border-dashed border-gray-200 rounded-2xl p-10 hover:border-rubber-400 hover:bg-rubber-50/30 transition-all cursor-pointer group relative">
                                        <input 
                                            type="file" 
                                            accept=".csv" 
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="flex flex-col items-center">
                                            <div className="p-4 bg-rubber-50 rounded-full text-rubber-600 mb-4 group-hover:scale-110 transition-transform">
                                                <Upload size={32} />
                                            </div>
                                            <p className="font-bold text-gray-900 mb-1">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                                            <p className="text-sm text-gray-500">รองรับเฉพาะไฟล์ .csv เท่านั้น</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start text-left w-full max-w-lg">
                                        <AlertCircle size={20} className="text-blue-500 mr-3 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800">
                                            <h4 className="font-bold mb-1">คำแนะนำการนำเข้า:</h4>
                                            <ul className="list-disc ml-4 space-y-1 opacity-80">
                                                <li>บรรทัดแรกของไฟล์ต้องเป็นหัวตาราง (Header)</li>
                                                <li>หากมีข้อมูลบางส่วนเป็นภาษาไทย ระบบจะพยายามจับคู่ให้โดยอัตโนมัติ</li>
                                                <li>หากไม่ได้ระบุรหัส (ID) ระบบจะสร้างรหัสใหม่ให้โดยอ้างอิงจากลำดับล่าสุด</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Mapping */}
                    {step === 2 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">ตรวจสอบหัวตาราง (Mapping Fields)</h2>
                                    <p className="text-sm text-gray-500">ตรวจสอบว่าหัวข้อในไฟล์ CSV ตรงกับช่องฐานข้อมูลของระบบหรือไม่</p>
                                </div>
                                <button onClick={resetImport} className="text-sm text-gray-500 hover:text-red-500 font-bold">ยกเลิก</button>
                            </div>

                            <div className="p-6 lg:p-10">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
                                    {Object.keys(FIELD_MAPPINGS[selectedType]).map(field => {
                                        const matchedHeader = mapping[field];
                                        return (
                                            <div key={field} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                <div className="mb-2 sm:mb-0">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">System Field</span>
                                                    <span className="font-bold text-gray-800 text-lg">
                                                        {field === 'name' ? 'ชื่อ / รายการ' : field}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-gray-400 mx-4 hidden sm:flex">
                                                    <ArrowRight size={24} />
                                                </div>
                                                <div className="sm:w-64">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">CSV Header</span>
                                                    <select
                                                        value={matchedHeader || ''}
                                                        onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                                        className={`w-full p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                                                            matchedHeader 
                                                                ? 'border-rubber-200 bg-white text-rubber-700' 
                                                                : 'border-orange-200 bg-orange-50 text-orange-700'
                                                        }`}
                                                    >
                                                        <option value="">-- ไม่ได้เลือก / เว้นว่าง --</option>
                                                        {headers.map(h => (
                                                            <option key={h} value={h}>{h}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-12 flex justify-end">
                                    <button
                                        onClick={handleConfirmMapping}
                                        className="px-8 py-3 bg-rubber-600 text-white font-bold rounded-xl shadow-lg hover:bg-rubber-700 hover:translate-y-[-2px] transition-all flex items-center"
                                    >
                                        ตรวจสอบข้อมูลก่อนนำเข้า
                                        <ChevronRight size={20} className="ml-2" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview & Confirm */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-300">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">พรีวิวข้อมูล (Data Preview)</h2>
                                        <p className="text-sm text-gray-500">แสดงข้อมูล 5 แถวแรกที่ตรวจพบในไฟล์ ระบบจะนำเข้าทั้งหมด {csvData.length} รายการ</p>
                                    </div>
                                    <button onClick={() => setStep(2)} className="text-sm text-rubber-600 hover:text-rubber-700 font-bold px-4 py-2 bg-rubber-50 rounded-lg">กลับไปแก้ไข Mapping</button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4">#</th>
                                                {Object.keys(mapping).map(field => (
                                                    <th key={field} className="px-6 py-4 text-rubber-600 underline decoration-dotted capitalize">{field}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 font-medium">
                                            {csvData.slice(0, 5).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-gray-400 italic">{idx + 1}</td>
                                                    {Object.keys(mapping).map(field => (
                                                        <td key={field} className="px-6 py-4 text-gray-700">
                                                            {row[mapping[field]] || <span className="text-gray-300 italic">None</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {csvData.length > 5 && (
                                    <div className="p-4 text-center bg-gray-50 border-t border-gray-100 text-gray-500 text-xs font-medium">
                                        ... และรายการอื่นๆ อีก {csvData.length - 5} รายการ
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-rubber-50 border border-rubber-100 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-rubber-600 mr-4 border border-rubber-100">
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-rubber-900">คุณแน่ใจหรือไม่ที่ต้องการนำเข้าข้อมูล?</p>
                                        <p className="text-sm text-rubber-700">ข้อมูลทั้งหมด {csvData.length} รายการจะถูกบันทึกสู่ระบบและไม่สามารถย้อนคืนค่าแบบกลุ่มได้</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleImport}
                                    disabled={isProcessing}
                                    className={`px-10 py-4 bg-rubber-600 text-white font-bold rounded-xl shadow-lg hover:bg-rubber-700 transition-all flex items-center ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="animate-spin mr-3" />
                                            กำลังนำเข้า...
                                        </>
                                    ) : (
                                        <>ยืนยันการนำเข้าทั้งหมด {csvData.length} รายการ</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Export Tab */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-5 duration-300">
                    {IMPORT_TYPES.map(type => (
                        <div key={type.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-rubber-200 hover:shadow-md transition-all group">
                            <div className="flex items-center mb-6">
                                <div className="p-3 bg-gray-50 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                    {type.icon}
                                </div>
                                <h3 className="font-bold text-gray-900">{type.name}</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-6 h-10">สำรองข้อมูล {type.name} ทั้งหมดในระบบของคุณออกมาเป็นไฟล์ CSV</p>
                            <button
                                onClick={() => handleExport(type.id)}
                                className="w-full flex items-center justify-center px-4 py-3 bg-white border-2 border-rubber-200 text-rubber-700 font-bold rounded-xl hover:bg-rubber-600 hover:text-white hover:border-rubber-600 transition-all shadow-sm"
                            >
                                <Download size={18} className="mr-2" />
                                ดาวน์โหลด CSV
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DataImport;

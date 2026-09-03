import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Save, FileText, User, Scale, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

export const LandPlotFormModal = ({ plot = null, farmers = [], employees = [], farmerEmployees = [], onClose, onSubmit }) => {
    const [farmerId, setFarmerId] = useState(plot?.farmerId || '');
    const initialFarmer = farmers.find(f => f.id === plot?.farmerId);
    const [farmerSearch, setFarmerSearch] = useState(initialFarmer ? initialFarmer.name : '');
    const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
    const farmerDropdownRef = useRef(null);

    const [employeeId, setEmployeeId] = useState(plot?.employeeId || '');
    const [plotName, setPlotName] = useState(plot?.plotName || '');
    const [deedNumber, setDeedNumber] = useState(plot?.deedNumber || '');
    const [deedType, setDeedType] = useState(plot?.deedType || 'น.ส.4');
    const [rai, setRai] = useState(plot?.rai || '');
    const [ngan, setNgan] = useState(plot?.ngan || '');
    const [sqWah, setSqWah] = useState(plot?.sqWah || '');
    const [lat, setLat] = useState(plot?.lat || '');
    const [lng, setLng] = useState(plot?.lng || '');
    const [note, setNote] = useState(plot?.note || '');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (farmerDropdownRef.current && !farmerDropdownRef.current.contains(event.target)) {
                setShowFarmerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter available tappers for selected farmer
    const linkedEmployeeIds = farmerEmployees
        .filter(fe => fe.farmerId === farmerId)
        .map(fe => fe.employeeId);

    const availableEmployees = employees.filter(e => linkedEmployeeIds.includes(e.id));

    useEffect(() => {
        if (farmers.length > 0 && !farmerId) {
            setFarmerId(farmers[0].id);
        }
    }, [farmers]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!farmerId) {
            toast.error('กรุณาเลือกเกษตรกรเจ้าของแปลง');
            return;
        }

        if (!plotName) {
            toast.error('กรุณากำหนดชื่อแปลงสวนยาง');
            return;
        }

        const payload = {
            farmerId,
            employeeId: employeeId || null,
            plotName,
            deedNumber,
            deedType,
            rai: parseFloat(rai) || 0,
            ngan: parseFloat(ngan) || 0,
            sqWah: parseFloat(sqWah) || 0,
            lat: parseFloat(lat) || null,
            lng: parseFloat(lng) || null,
            note
        };

        try {
            setSubmitting(true);
            await onSubmit(payload);
            toast.success(plot ? 'แก้ไขข้อมูลแปลงสำเร็จ' : 'ลงทะเบียนแปลงโฉนดสำเร็จ');
            onClose();
        } catch (err) {
            console.error('Error saving land plot:', err);
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 p-5 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur">
                            <MapPin size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{plot ? 'แก้ไขแปลงสวนยางพารา' : 'ลงทะเบียนแปลงโฉนดที่ดินใหม่'}</h3>
                            <p className="text-xs text-slate-300">ระบุรายละเอียดแปลงและพิกัดแผนที่</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                    {/* Searchable Farmer Dropdown */}
                    <div className="relative" ref={farmerDropdownRef}>
                        <label className="block text-xs font-bold text-gray-700 mb-1">เกษตรกร (เจ้าของแปลง) *</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="พิมพ์เพื่อค้นหาชื่อเกษตรกร..."
                                value={farmerSearch}
                                onChange={(e) => {
                                    setFarmerSearch(e.target.value);
                                    setShowFarmerDropdown(true);
                                    if (!e.target.value) {
                                        setFarmerId('');
                                        setEmployeeId('');
                                    }
                                }}
                                onFocus={() => setShowFarmerDropdown(true)}
                                className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500 pr-8"
                                required
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                                <Search size={14} className="text-gray-400" />
                            </div>
                        </div>

                        {showFarmerDropdown && (
                            <div className="absolute z-[2100] w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1">
                                {farmers
                                    .filter(f => !farmerSearch || f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || (f.id && f.id.toLowerCase().includes(farmerSearch.toLowerCase())))
                                    .map(f => (
                                        <div
                                            key={f.id}
                                            className={`px-3 py-2 text-xs hover:bg-emerald-50 cursor-pointer rounded-xl flex justify-between items-center transition-colors ${farmerId === f.id ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-gray-800'}`}
                                            onClick={() => {
                                                setFarmerId(f.id);
                                                setFarmerSearch(f.name);
                                                setEmployeeId('');
                                                setShowFarmerDropdown(false);
                                            }}
                                        >
                                            <span className="font-medium">{f.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">{f.phone || f.id}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Employee (Tapper) Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">คนกรีดประจำแปลงนี้ (อ้างอิงจากรายชื่อคนกรีด)</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500"
                        >
                            <option value="">-- เกษตรกรกรีดเอง (ไม่มีคนกรีด) --</option>
                            {availableEmployees.map(emp => {
                                const link = farmerEmployees.find(fe => fe.farmerId === farmerId && fe.employeeId === emp.id);
                                const pct = link ? link.profitSharePct : 50;
                                return (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} (ส่วนแบ่ง {pct}%)
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Plot Name & Deed Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อแปลงสวนยาง *</label>
                            <input
                                type="text"
                                placeholder="เช่น แปลงบ้านดอน, แปลงควนดิน 1"
                                value={plotName}
                                onChange={(e) => setPlotName(e.target.value)}
                                className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ประเภทเอกสารสิทธิ์</label>
                            <select
                                value={deedType}
                                onChange={(e) => setDeedType(e.target.value)}
                                className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500"
                            >
                                <option value="น.ส.4">น.ส.4 (โฉนดที่ดิน)</option>
                                <option value="ส.ป.ก. 4-01">ส.ป.ก. 4-01</option>
                                <option value="น.ส.3ก">น.ส.3ก</option>
                                <option value="ภ.บ.ท.5">ภ.บ.ท.5</option>
                                <option value="อื่นๆ">อื่นๆ</option>
                            </select>
                        </div>
                    </div>

                    {/* Deed Number */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">เลขที่โฉนด / ระวาง / เลขที่ดิน</label>
                        <input
                            type="text"
                            placeholder="ระบุเลขที่โฉนดที่ดิน"
                            value={deedNumber}
                            onChange={(e) => setDeedNumber(e.target.value)}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500"
                        />
                    </div>

                    {/* Land Area (Rai - Ngan - SqWah) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">เนื้อที่ดิน (ไร่ - งาน - วา)</label>
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="number"
                                placeholder="ไร่"
                                value={rai}
                                onChange={(e) => setRai(e.target.value)}
                                className="text-xs font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center"
                            />
                            <input
                                type="number"
                                placeholder="งาน"
                                value={ngan}
                                onChange={(e) => setNgan(e.target.value)}
                                className="text-xs font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center"
                            />
                            <input
                                type="number"
                                placeholder="ตารางวา"
                                value={sqWah}
                                onChange={(e) => setSqWah(e.target.value)}
                                className="text-xs font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center"
                            />
                        </div>
                    </div>

                    {/* GPS Center Point */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ละติจูด (Latitude)</label>
                            <input
                                type="number"
                                step="0.000001"
                                placeholder="8.4377"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                className="w-full text-xs font-mono font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ลองจิจูด (Longitude)</label>
                            <input
                                type="number"
                                step="0.000001"
                                placeholder="99.9631"
                                value={lng}
                                onChange={(e) => setLng(e.target.value)}
                                className="w-full text-xs font-mono font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">หมายเหตุเพิ่มเติม</label>
                        <textarea
                            rows={2}
                            placeholder="ระบุหมายเหตุหรือข้อมูลจุดสังเกตแปลง"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full text-xs font-medium p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                        ></textarea>
                    </div>

                    {/* Submit Buttons */}
                    <div className="pt-3 flex items-center justify-end space-x-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                        >
                            <Save size={16} />
                            <span>บันทึกข้อมูลแปลง</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LandPlotFormModal;

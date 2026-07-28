import React, { useState, useEffect } from 'react';
import { 
    Receipt, Save, Image as ImageIcon, Store, MapPin, Phone, 
    Hash, Calendar, User, Scale, Percent, Calculator, 
    DollarSign, Sparkles, CreditCard, Users, MessageSquare, 
    ChevronRight, Eye, RefreshCw, AlertCircle, Leaf, Plus, Trash2, CheckCircle, Edit3, Type, Printer, Smartphone
} from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import { getSettings, updateSettingsAPI } from '../../services/apiService';
import toast from 'react-hot-toast';

export const PaperSlipSettings = () => {
    const [saving, setSaving] = useState(false);
    const [activePlatform, setActivePlatform] = useState('paper'); // 'paper' | 'eslip'
    const [previewType, setPreviewType] = useState('latex'); // 'latex' | 'cup_lump' (only for preview data)
    const [activeFontCategory, setActiveFontCategory] = useState('header'); // header | meta | data | summary | footer
    
    // Default config generator for a standalone template
    const createNewTemplate = (id, name, typeHint = 'latex') => {
        const isLatex = typeHint === 'latex';
        const baseFields = {
            // Identity visibility (independent per platform)
            showLogo: true,
            showStoreName: true,
            showAddress: true,
            showPhone: true,
            showFscCode: true,
            // Header
            headerTitle: isLatex ? 'ใบรับซื้อน้ำยางพารา' : 'ใบรับซื้อขี้ยางพารา',
            showBillType: true,
            showBillId: true,
            showDateTime: true,
            showSelectedDate: true,
            showRecordingTime: true,
            showFarmerName: true,
            // Detail fields
            showRawWeight: true,
            showBucketWeight: true,
            showNetWeight: true,
            showDrc: true,
            showDryWeight: true,
            // Pricing fields
            showBasePrice: true,
            showBonusDrc: true,
            showBonusFsc: true,
            showBonusMember: true,
            showActualPrice: true,
            showSplits: true,
            showPurchaseDetailsHeader: true,
            // Text (independent per platform)
            footerText: '=== ขอบคุณที่ใช้บริการ ===',
            topNote: '',
            extraMessage: '',
            labels: {
                rawWeight: isLatex ? 'น้ำหนักยางดิบ' : 'น้ำหนักขี้ยาง',
                bucketWeight: 'หักถังยาง',
                netWeight: 'น้ำหนักสุทธิ',
                drc: '% DRC',
                dryWeight: 'ยางแห้ง',
                basePrice: 'ราคากลาง',
                bonusDrc: 'โบนัส DRC',
                bonusFsc: 'โบนัส FSC',
                bonusMember: 'โบนัสสมาชิก',
                actualPrice: 'ราคาจริง (สุทธิ)',
                farmerSplit: 'เกษตรกร',
                employeeSplit: 'ลูกจ้าง',
                selectedDate: 'วันที่ทำรายการ',
                recordingTime: 'เวลาบันทึก',
                fscCode: 'รหัส FSC'
            },
            // [NEW] Granular Font Sizes (Thermal Paper default)
            fontSizeStoreName: 12,
            fontSizeAddress: 7,
            fontSizePhone: 8,
            fontSizeTopNote: 7,
            fontSizeHeaderTitle: 10,
            
            fontSizeBillIdLabel: 7,
            fontSizeBillIdValue: 7,
            fontSizeDateTimeLabel: 7,
            fontSizeDateTimeValue: 7,
            fontSizeFarmerNameLabel: 9,
            fontSizeFarmerNameValue: 10,

            fontSizeRawWeightLabel: 9,
            fontSizeRawWeightValue: 10,
            fontSizeBucketWeightLabel: 8,
            fontSizeBucketWeightValue: 8,
            fontSizeNetWeightLabel: 9,
            fontSizeNetWeightValue: 11,
            fontSizeDrcLabel: 9,
            fontSizeDrcValue: 10,
            fontSizeDryWeightLabel: 9,
            fontSizeDryWeightValue: 11,

            fontSizeBasePriceLabel: 8,
            fontSizeBasePriceValue: 10,
            fontSizeBonusDrcLabel: 8,
            fontSizeBonusDrcValue: 8,
            fontSizeBonusFscLabel: 8,
            fontSizeBonusFscValue: 8,
            fontSizeBonusMemberLabel: 8,
            fontSizeBonusMemberValue: 8,
            fontSizeActualPriceLabel: 10,
            fontSizeActualPriceValue: 12,

            fontSizeFarmerSplitLabel: 9,
            fontSizeFarmerSplitValue: 11,
            fontSizeEmployeeSplitLabel: 8,
            fontSizeEmployeeSplitValue: 9,

            fontSizeTotalLabel: 10,
            fontSizeTotalValue: 14,
            fontSizeExtraMessage: 7,
            fontSizeFooterText: 8
        };

        return {
            id,
            name,
            common: {}, 
            paper: { ...baseFields },
            eslip: { 
                ...baseFields, 
                headerTitle: isLatex ? 'E-Slip น้ำยาง' : 'E-Slip ขี้ยาง',
                // [NEW] Granular Font Sizes (Digital E-Slip default - slightly larger)
                fontSizeStoreName: 14,
                fontSizeAddress: 8,
                fontSizePhone: 9,
                fontSizeTopNote: 8,
                fontSizeHeaderTitle: 12,
                
                fontSizeBillIdLabel: 8,
                fontSizeBillIdValue: 8,
                fontSizeDateTimeLabel: 8,
                fontSizeDateTimeValue: 8,
                fontSizeFarmerNameLabel: 12,
                fontSizeFarmerNameValue: 16,

                fontSizeRawWeightLabel: 10,
                fontSizeRawWeightValue: 11,
                fontSizeBucketWeightLabel: 9,
                fontSizeBucketWeightValue: 9,
                fontSizeNetWeightLabel: 10,
                fontSizeNetWeightValue: 12,
                fontSizeDrcLabel: 10,
                fontSizeDrcValue: 11,
                fontSizeDryWeightLabel: 10,
                fontSizeDryWeightValue: 12,

                fontSizeBasePriceLabel: 9,
                fontSizeBasePriceValue: 11,
                fontSizeBonusDrcLabel: 9,
                fontSizeBonusDrcValue: 9,
                fontSizeBonusFscLabel: 9,
                fontSizeBonusFscValue: 9,
                fontSizeBonusMemberLabel: 9,
                fontSizeBonusMemberValue: 9,
                fontSizeActualPriceLabel: 11,
                fontSizeActualPriceValue: 14,

                fontSizeFarmerSplitLabel: 10,
                fontSizeFarmerSplitValue: 12,
                fontSizeEmployeeSplitLabel: 9,
                fontSizeEmployeeSplitValue: 10,

                fontSizeTotalLabel: 12,
                fontSizeTotalValue: 20,
                fontSizeExtraMessage: 8,
                fontSizeFooterText: 9
            }
        };
    };

    const [config, setConfig] = useState({
        activeTemplateId: 'default_latex',
        defaultLatexId: 'default_latex',
        defaultCupLumpId: 'default_cuplump',
        templates: [
            createNewTemplate('default_latex', 'มาตรฐานน้ำยาง', 'latex'),
            createNewTemplate('default_cuplump', 'มาตรฐานขี้ยาง', 'cup_lump')
        ]
    });

    const [settings, setLocalSettings] = useState({
        factoryName: 'ร้านรับซื้อน้ำยางพารา',
        address: '123 หมู่ 4 ต.ยางไทย อ.ยางงาม จ.ยางสงขลา 90000',
        phone: '081-234-5678',
        logoUrl: ''
    });

    // Active working template
    const activeTemplate = config.templates.find(t => t.id === config.activeTemplateId) || config.templates[0];
    
    // Derived state for editing — all fields are now in the platform sub-object
    const activeSub = activePlatform === 'paper' ? activeTemplate.paper : activeTemplate.eslip;

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await getSettings();
            if (res.status === 'success' && res.data) {
                setLocalSettings({
                    factoryName: res.data.factoryName || res.data.factory_name || 'ร้านรับซื้อน้ำยางพารา',
                    address: res.data.address || '',
                    phone: res.data.phone || '',
                    logoUrl: res.data.logoUrl || res.data.logo_url || ''
                });

                if (res.data.paperSlipConfig) {
                    try {
                        const savedData = JSON.parse(res.data.paperSlipConfig);
                        
                        // NEW MIGRATION ENGINE (v3: Multi-Template + Multi-Platform)
                        const migrateTemplates = (data) => {
                            // Helper: merge old common fields into paper/eslip sub-objects
                            const spreadCommonIntoSubs = (template) => {
                                const c = template.common || {};
                                const commonShowFields = {};
                                const commonTextFields = {};
                                ['showLogo','showStoreName','showAddress','showPhone'].forEach(k => { if (k in c) commonShowFields[k] = c[k]; });
                                ['footerText','topNote','extraMessage'].forEach(k => { if (k in c) commonTextFields[k] = c[k]; });
                                
                                const migratePlatform = (p, source) => {
                                    if (!source) return p;
                                    // Map legacy generic keys to new granular keys if they exist in source
                                    const m = { ...p, ...source };
                                    m.labels = {
                                        selectedDate: 'วันที่ทำรายการ',
                                        recordingTime: 'เวลาบันทึก',
                                        fscCode: 'รหัส FSC',
                                        ...(p.labels || {}),
                                        ...(source.labels || {}),
                                        ...(m.labels || {})
                                    };
                                    if ('showDateTime' in source) {
                                        if (!('showSelectedDate' in source)) m.showSelectedDate = source.showDateTime;
                                        if (!('showRecordingTime' in source)) m.showRecordingTime = source.showDateTime;
                                    }
                                    if (source.fontSizeBillId) { m.fontSizeBillIdValue = source.fontSizeBillId; m.fontSizeBillIdLabel = source.fontSizeBillId; }
                                    if (source.fontSizeDateTime) { m.fontSizeDateTimeValue = source.fontSizeDateTime; m.fontSizeDateTimeLabel = source.fontSizeDateTime; }
                                    if (source.fontSizeFarmerName) { m.fontSizeFarmerNameValue = source.fontSizeFarmerName; }
                                    if (source.fontSizeLabel) {
                                        ['RawWeight', 'BucketWeight', 'NetWeight', 'Drc', 'DryWeight', 'BasePrice', 'ActualPrice', 'BonusDrc', 'BonusFsc', 'BonusMember'].forEach(f => {
                                            m[`fontSize${f}Label`] = source.fontSizeLabel;
                                        });
                                    }
                                    if (source.fontSizeValue) {
                                        ['RawWeight', 'NetWeight', 'Drc', 'DryWeight', 'BasePrice', 'ActualPrice'].forEach(f => {
                                            m[`fontSize${f}Value`] = source.fontSizeValue;
                                        });
                                    }
                                    if (source.fontSizeSubData) {
                                        ['BucketWeightValue', 'BonusDrcValue', 'BonusFscValue', 'BonusMemberValue'].forEach(f => {
                                            m[`fontSize${f}`] = source.fontSizeSubData;
                                        });
                                    }
                                    if (source.fontSizeSplit) {
                                        ['FarmerSplitLabel', 'FarmerSplitValue', 'EmployeeSplitLabel', 'EmployeeSplitValue'].forEach(f => {
                                            m[`fontSize${f}`] = source.fontSizeSplit;
                                        });
                                    }
                                    return m;
                                };

                                return {
                                    ...template,
                                    common: {}, // Clear common — everything is now platform-specific
                                    paper: migratePlatform(createNewTemplate('','').paper, { ...commonShowFields, ...commonTextFields, ...(template.paper || {}) }),
                                    eslip: migratePlatform(createNewTemplate('','').eslip, { ...commonShowFields, ...commonTextFields, ...(template.eslip || {}) })
                                };
                            };

                            // Case 1: Already v3 (Flat templates with paper/eslip keys)
                            if (data.templates && data.templates.every(t => t.paper && t.eslip)) {
                                // Migrate common fields into subs if they still exist
                                return {
                                    ...data,
                                    templates: data.templates.map(spreadCommonIntoSubs)
                                };
                            }

                            // Case 2: v2 (Dual profile - latex/cupLump keys inside one template)
                            if (data.templates && data.templates.some(t => t.latex || t.cupLump)) {
                                let newTemplates = [];
                                let defaultLatexId = data.defaultLatexId || '';
                                let defaultCupLumpId = data.defaultCupLumpId || '';

                                data.templates.forEach(t => {
                                    const c = t.common || {};
                                    const tLat = spreadCommonIntoSubs({
                                        id: `${t.id}_latex`,
                                        name: `${t.name} (น้ำยาง)`,
                                        common: c,
                                        paper: { ...createNewTemplate('', '', 'latex').paper, ...(t.latex || {}) },
                                        eslip: { ...createNewTemplate('', '', 'latex').eslip, ...(t.latex || {}) }
                                    });
                                    const tCup = spreadCommonIntoSubs({
                                        id: `${t.id}_cuplump`,
                                        name: `${t.name} (ขี้ยาง)`,
                                        common: c,
                                        paper: { ...createNewTemplate('', '', 'cup_lump').paper, ...(t.cupLump || {}) },
                                        eslip: { ...createNewTemplate('', '', 'cup_lump').eslip, ...(t.cupLump || {}) }
                                    });
                                    newTemplates.push(tLat, tCup);
                                    
                                    if (t.id === data.activeTemplateId || t.id === 'default') {
                                        defaultLatexId = tLat.id;
                                        defaultCupLumpId = tCup.id;
                                    }
                                });

                                return {
                                    activeTemplateId: defaultLatexId,
                                    defaultLatexId,
                                    defaultCupLumpId,
                                    templates: newTemplates
                                };
                            }

                            // Case 3: Legacy (Plain config at root)
                            const baseLat = createNewTemplate('default_latex', 'มาตรฐานน้ำยาง', 'latex');
                            const baseCup = createNewTemplate('default_cuplump', 'มาตรฐานขี้ยาง', 'cup_lump');
                            
                            const mapLegacy = (base, source) => ({
                                ...base,
                                paper: { ...base.paper, ...source, headerTitle: source.headerTitle || base.paper.headerTitle },
                                eslip: { ...base.eslip, ...source, headerTitle: source.headerTitle || base.eslip.headerTitle }
                            });

                            return {
                                activeTemplateId: 'default_latex',
                                defaultLatexId: 'default_latex',
                                defaultCupLumpId: 'default_cuplump',
                                templates: [mapLegacy(baseLat, data), mapLegacy(baseCup, data)]
                            };
                        };

                        setConfig(migrateTemplates(savedData));
                    } catch (e) {
                        console.error('Error parsing config:', e);
                    }
                }
            }
        } catch (error) {
            toast.error('โหลดข้อมูลผิดพลาด');
        }
    };

    const handleUpdateActiveTemplate = (updates) => {
        setConfig(prev => ({
            ...prev,
            templates: prev.templates.map(t => 
                t.id === prev.activeTemplateId ? { ...t, ...updates } : t
            )
        }));
    };

    const handleUpdateLabel = (labelKey, value) => {
        handleUpdateActiveTemplate({
            [activePlatform]: {
                ...activeSub,
                labels: { ...activeSub.labels, [labelKey]: value }
            }
        });
    };

    const handleToggle = (key) => {
        // All toggles are now platform-specific (Paper vs E-Slip independent)
        handleUpdateActiveTemplate({
            [activePlatform]: { ...activeSub, [key]: !activeSub[key] }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateSettingsAPI({
                paperSlipConfig: JSON.stringify(config)
            });
            if (res.status === 'success') {
                toast.success('บันทึกการตั้งค่าทั้งหมดสำเร็จ');
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddTemplate = () => {
        const id = 'temp_' + Date.now();
        const name = prompt('ชื่อเทมเพลตใหม่:', 'เทมเพลตใหม่');
        if (!name) return;
        
        const typeHint = confirm('เทมเพลตนี้ใช้สำหรับน้ำยางพาราหรือไม่? (Cancel = ขี้ยาง)') ? 'latex' : 'cup_lump';
        const newTemp = createNewTemplate(id, name, typeHint);
        
        setConfig(prev => ({
            ...prev,
            templates: [...prev.templates, newTemp],
            activeTemplateId: id
        }));
        toast.success('เพิ่มเทมเพลตใหม่แล้ว');
    };

    const handleRenameTemplate = (id) => {
        const temp = config.templates.find(t => t.id === id);
        const name = prompt('เปลี่ยนชื่อเทมเพลต:', temp.name);
        if (!name) return;
        
        setConfig(prev => ({
            ...prev,
            templates: prev.templates.map(t => t.id === id ? { ...t, name } : t)
        }));
    };

    const handleDeleteTemplate = (id) => {
        if (config.templates.length <= 1) {
            toast.error('ไม่สามารถลบเทมเพลตสุดท้ายได้');
            return;
        }
        if (!window.confirm('ยืนยันการลบเทมเพลตนี้?')) return;
        
        setConfig(prev => {
            const newTemplates = prev.templates.filter(t => t.id !== id);
            return {
                ...prev,
                templates: newTemplates,
                activeTemplateId: prev.activeTemplateId === id ? newTemplates[0].id : prev.activeTemplateId,
                defaultLatexId: prev.defaultLatexId === id ? newTemplates[0].id : prev.defaultLatexId,
                defaultCupLumpId: prev.defaultCupLumpId === id ? newTemplates[0].id : prev.defaultCupLumpId
            };
        });
        toast.success('ลบเทมเพลตแล้ว');
    };

    const handleSetDefault = (id, type) => {
        if (type === 'latex') setConfig(prev => ({ ...prev, defaultLatexId: id }));
        else setConfig(prev => ({ ...prev, defaultCupLumpId: id }));
        toast.success(`ตั้งเป็นเทมเพลตเริ่มต้นสำหรับ${type === 'latex' ? 'น้ำยาง' : 'ขี้ยาง'}แล้ว`);
    };

    const fontSizeCategories = [
        { id: 'header', label: 'หัวบิล', icon: <Store size={14} /> },
        { id: 'meta', label: 'ข้อมูลบิล', icon: <Hash size={14} /> },
        { id: 'data', label: 'รายการ/เนื้อหา', icon: <Type size={14} /> },
        { id: 'pricing', label: 'ราคา/โบนัส', icon: <DollarSign size={14} /> },
        { id: 'summary', label: 'สรุปยอด', icon: <Calculator size={14} /> },
        { id: 'footer', label: 'ท้ายบิล', icon: <MessageSquare size={14} /> },
    ];

    const fontSizeControls = {
        header: [
            { key: 'fontSizeStoreName', label: 'ชื่อร้านค้า', rec: activePlatform === 'paper' ? 12 : 14, min: 3, max: 32 },
            { key: 'fontSizeAddress', label: 'ที่อยู่ร้าน', rec: activePlatform === 'paper' ? 7 : 8, min: 3, max: 20 },
            { key: 'fontSizePhone', label: 'เบอร์โทรศัพท์', rec: activePlatform === 'paper' ? 8 : 9, min: 3, max: 20 },
            { key: 'fontSizeTopNote', label: 'ข้อความโปรยหัว', rec: 7, min: 3, max: 16 },
            { key: 'fontSizeHeaderTitle', label: 'ชื่อหัวบิล', rec: 10, min: 3, max: 24 },
        ],
        meta: [
            { key: 'fontSizeBillIdLabel', label: 'คำว่า "เลขที่บิล"', rec: 7, min: 3, max: 16 },
            { key: 'fontSizeBillIdValue', label: 'ตัวเลขเลขที่บิล', rec: 7, min: 3, max: 16 },
            { key: 'fontSizeDateTimeLabel', label: 'คำว่า "วันที่/เวลา"', rec: 7, min: 3, max: 16 },
            { key: 'fontSizeDateTimeValue', label: 'ข้อมูลวันที่/เวลา', rec: 7, min: 3, max: 16 },
            { key: 'fontSizeFarmerNameLabel', label: 'คำว่า "ชื่อลูกค้า"', rec: 9, min: 3, max: 18 },
            { key: 'fontSizeFarmerNameValue', label: 'ชื่อเกษตรกร (ตัวหนา)', rec: 10, min: 3, max: 24 },
        ],
        data: [
            { key: 'fontSizeRawWeightLabel', label: 'ป้าย: น้ำหนักยางดิบ', rec: 9, min: 3, max: 18 },
            { key: 'fontSizeRawWeightValue', label: 'เลข: น้ำหนักยางดิบ', rec: 10, min: 3, max: 20 },
            { key: 'fontSizeBucketWeightLabel', label: 'ป้าย: หักถัง', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeBucketWeightValue', label: 'เลข: หักถัง', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeNetWeightLabel', label: 'ป้าย: น้ำหนักสุทธิ', rec: 9, min: 3, max: 18 },
            { key: 'fontSizeNetWeightValue', label: 'เลข: น้ำหนักสุทธิ', rec: 11, min: 3, max: 20 },
            { key: 'fontSizeDrcLabel', label: 'ป้าย: %DRC', rec: 9, min: 3, max: 18 },
            { key: 'fontSizeDrcValue', label: 'เลข: %DRC', rec: 10, min: 3, max: 20 },
            { key: 'fontSizeDryWeightLabel', label: 'ป้าย: น้ำหนักแห้ง', rec: 9, min: 3, max: 18 },
            { key: 'fontSizeDryWeightValue', label: 'เลข: น้ำหนักแห้ง', rec: 11, min: 3, max: 20 },
        ],
        pricing: [
            { key: 'fontSizeBasePriceLabel', label: 'ป้าย: ราคากลาง', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeBasePriceValue', label: 'เลข: ราคากลาง', rec: 10, min: 3, max: 20 },
            { key: 'fontSizeBonusDrcLabel', label: 'ป้าย: โบนัส DRC', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeBonusDrcValue', label: 'เลข: โบนัส DRC', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeBonusFscLabel', label: 'ป้าย: โบนัส FSC', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeBonusFscValue', label: 'เลข: โบนัส FSC', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeBonusMemberLabel', label: 'ป้าย: โบนัสสมาชิก', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeBonusMemberValue', label: 'เลข: โบนัสสมาชิก', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeActualPriceLabel', label: 'ป้าย: ราคาจริงสุทธิ', rec: 10, min: 3, max: 20 },
            { key: 'fontSizeActualPriceValue', label: 'เลข: ราคาจริงสุทธิ', rec: 12, min: 3, max: 24 },
        ],
        summary: [
            { key: 'fontSizeFarmerSplitLabel', label: 'ป้าย: ยอดเกษตรกร', rec: 9, min: 3, max: 18 },
            { key: 'fontSizeFarmerSplitValue', label: 'เลข: ยอดเกษตรกร', rec: 11, min: 3, max: 24 },
            { key: 'fontSizeEmployeeSplitLabel', label: 'ป้าย: ยอดลูกจ้าง', rec: 8, min: 3, max: 16 },
            { key: 'fontSizeEmployeeSplitValue', label: 'เลข: ยอดลูกจ้าง', rec: 9, min: 3, max: 18 },
            { key: 'fontSizeTotalLabel', label: 'คำว่า "ยอดร่วมสุทธิ"', rec: 10, min: 3, max: 20 },
            { key: 'fontSizeTotalValue', label: 'ตัวเลขยอดสุทธิ (ใหญ่)', rec: 14, min: 3, max: 40 },
        ],
        footer: [
            { key: 'fontSizeExtraMessage', label: 'ข้อความในกรอบ', rec: 7, min: 3, max: 16 },
            { key: 'fontSizeFooterText', label: 'ข้อความปิดท้าย', rec: 8, min: 3, max: 16 },
        ]
    };

    const toggleItems = [
        { key: 'showLogo', label: 'โลโก้ร้าน', icon: <ImageIcon size={14} />, group: 'identity' },
        { key: 'showStoreName', label: 'ชื่อร้าน', icon: <Store size={14} />, group: 'identity' },
        { key: 'showAddress', label: 'ที่อยู่ร้าน', icon: <MapPin size={14} />, group: 'identity' },
        { key: 'showPhone', label: 'เบอร์โทรศัพท์', icon: <Phone size={14} />, group: 'identity' },
        { key: 'showBillType', label: 'ประเภทบิล', icon: <CreditCard size={14} />, group: 'info' },
        { key: 'showBillId', label: 'เลขที่บิล', icon: <Hash size={14} />, group: 'info' },
        { key: 'showSelectedDate', label: 'วันที่ทำรายการ (ปฏิทิน)', icon: <Calendar size={14} />, group: 'info', labelKey: 'selectedDate' },
        { key: 'showRecordingTime', label: 'เวลาบันทึก (ระบบ)', icon: <Calendar size={14} />, group: 'info', labelKey: 'recordingTime' },
        { key: 'showFarmerName', label: 'ชื่อเกษตรกร', icon: <User size={14} />, group: 'info' },
        { key: 'showFscCode', label: 'รหัส FSC ของลูกค้า', icon: <Leaf size={14} />, group: 'info', labelKey: 'fscCode' },
        { key: 'showPurchaseDetailsHeader', label: 'หัวรายละเอียดรับซื้อ', icon: <Type size={14} />, group: 'info' },
        
        { key: 'showRawWeight', label: 'น้ำหนักยางดิบ/ขี้ยาง', icon: <Scale size={14} />, group: 'details', labelKey: 'rawWeight' },
        { key: 'showBucketWeight', label: 'น้ำหนักถัง', icon: <Calculator size={14} />, group: 'details', labelKey: 'bucketWeight' },
        { key: 'showNetWeight', label: 'น้ำหนักสุทธิ', icon: <Scale size={14} />, group: 'details', labelKey: 'netWeight' },
        { key: 'showDrc', label: '% DRC', icon: <Percent size={14} />, group: 'details', labelKey: 'drc' },
        { key: 'showDryWeight', label: 'น้ำหนักยางแห้ง', icon: <Scale size={14} />, group: 'details', labelKey: 'dryWeight' },
        
        { key: 'showBasePrice', label: 'ราคากลาง', icon: <DollarSign size={14} />, group: 'pricing', labelKey: 'basePrice' },
        { key: 'showBonusDrc', label: 'โบนัส DRC', icon: <Sparkles size={14} />, group: 'pricing', labelKey: 'bonusDrc' },
        { key: 'showBonusFsc', label: 'โบนัส FSC', icon: <Leaf size={14} />, group: 'pricing', labelKey: 'bonusFsc' },
        { key: 'showBonusMember', label: 'โบนัสสมาชิก', icon: <Users size={14} />, group: 'pricing', labelKey: 'bonusMember' },
        { key: 'showActualPrice', label: 'ราคาจริง (สุทธิ)', icon: <CreditCard size={14} />, group: 'pricing', labelKey: 'actualPrice' },
        
        { key: 'showSplits', label: 'สัดส่วนเกษตรกร/ลูกจ้าง', icon: <Users size={14} />, group: 'splits' },
    ];

    const mockData = {
        id: 'B-RTB2024-0001',
        date: new Date(),
        farmerName: 'ใจเย็น มีสุข',
        fscId: 'FSC-98765-RTB',
        weight: 150.5,
        bucketWeight: 2.0,
        netWeight: 148.5,
        drc: 32.5,
        dryWeight: 48.3,
        basePrice: 50.0,
        bonusDrc: 1.5,
        bonusFsc: 1.0,
        bonusMember: 0.5,
        actualPrice: 53.0,
        total: 2559.9,
        farmerTotal: 1535.9,
        employeeTotal: 1024.0,
        empPct: 40
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Header & Template Selector */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <Receipt className="text-rubber-600" size={24} />
                        Receipt Designer Pro
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">ตั้งค่าแยกตามประเภทสินค้าและแพลตฟอร์ม</p>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {config.templates.map(temp => (
                        <div key={temp.id} className="relative group shrink-0">
                            <button
                                onClick={() => {
                                    setConfig(prev => ({ ...prev, activeTemplateId: temp.id }));
                                    // Auto-sync preview type based on default assignments
                                    if (config.defaultLatexId === temp.id) setPreviewType('latex');
                                    if (config.defaultCupLumpId === temp.id) setPreviewType('cup_lump');
                                }}
                                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border-2 flex items-center gap-2 ${config.activeTemplateId === temp.id ? 'bg-rubber-600 border-rubber-600 text-white shadow-lg shadow-rubber-200' : 'bg-white border-gray-100 text-gray-400 hover:border-rubber-200'}`}
                            >
                                {temp.name}
                                {config.defaultLatexId === temp.id && <Leaf size={12} className="text-green-300" />}
                                {config.defaultCupLumpId === temp.id && <Calculator size={12} className="text-orange-300" />}
                            </button>
                            
                            {/* Template Menu on Hover */}
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 hidden group-hover:flex items-center bg-white shadow-xl rounded-full p-1 border border-gray-100 z-10 transition-all scale-95 hover:scale-100">
                                <button onClick={() => handleSetDefault(temp.id, 'latex')} className="p-1.5 text-green-500 hover:bg-green-50 rounded-full" title="ค่าเริ่มต้นน้ำยาง"><Leaf size={12} /></button>
                                <button onClick={() => handleSetDefault(temp.id, 'cup_lump')} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-full" title="ค่าเริ่มต้นขี้ยาง"><Calculator size={12} /></button>
                                <button onClick={() => handleRenameTemplate(temp.id)} className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-full" title="เปลี่ยนชื่อ"><Edit3 size={12} /></button>
                                <button onClick={() => handleDeleteTemplate(temp.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full" title="ลบ"><Trash2 size={12} /></button>
                            </div>
                        </div>
                    ))}
                    <button onClick={handleAddTemplate} className="p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition-colors"><Plus size={16} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Controls */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Editor Header */}
                        <div className="px-6 py-4 bg-gray-900 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-white">
                                <Edit3 className="text-rubber-400" size={18} />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Editing Template</span>
                                    <h3 className="text-xs font-black uppercase tracking-widest">{activeTemplate.name}</h3>
                                </div>
                            </div>
                            
                            {/* Platform Switcher */}
                            <div className="flex items-center space-x-1 p-1 bg-white/10 rounded-xl">
                                <button 
                                    onClick={() => setActivePlatform('paper')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activePlatform === 'paper' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
                                >
                                    <Printer size={14} /> Paper
                                </button>
                                <button 
                                    onClick={() => setActivePlatform('eslip')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activePlatform === 'eslip' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
                                >
                                    <Smartphone size={14} /> E-Slip
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Text Inputs (Platform-Specific) */}
                            <div className="bg-gray-50/50 p-4 rounded-2xl mb-8 border border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Store className="text-gray-400" size={14} />
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ข้อความสำหรับ {activePlatform === 'paper' ? 'Paper-Slip' : 'E-Slip'}</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ข้อความโปรยหัวบิล (Top Note)</label>
                                        <input 
                                            type="text" 
                                            value={activeSub.topNote || ''}
                                            onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, topNote: e.target.value } })}
                                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-[12px]"
                                            placeholder="ยินดีต้อนรับสู่ร้าน..."
                                        />
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ชื่อบิล ({activePlatform === 'paper' ? 'Paper' : 'E-Slip'})</label>
                                            <input 
                                                type="text" 
                                                value={activeSub.headerTitle}
                                                onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, headerTitle: e.target.value } })}
                                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-[12px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Font Size Controls (Categorized) */}
                            <div className="bg-rubber-50/30 p-5 rounded-2xl mb-8 border border-rubber-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Type className="text-rubber-600" size={16} />
                                        <h4 className="text-[10px] font-black text-rubber-800 uppercase tracking-widest">ปรับแต่งขนาดตัวอักษร อย่างละเอียด</h4>
                                    </div>
                                </div>

                                {/* Category Tabs */}
                                <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                                    {fontSizeCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveFontCategory(cat.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all whitespace-nowrap ${activeFontCategory === cat.id ? 'bg-rubber-600 border-rubber-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-rubber-200'}`}
                                        >
                                            {cat.icon}
                                            <span className="text-[10px] font-black uppercase tracking-wider">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {fontSizeControls[activeFontCategory].map(ctrl => (
                                        <div key={ctrl.key} className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{ctrl.label}</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-rubber-600 bg-white px-2 py-0.5 rounded-full border border-rubber-100">
                                                        {activeSub[ctrl.key] || ctrl.rec}px
                                                    </span>
                                                </div>
                                            </div>
                                            <input 
                                                type="range"
                                                min={ctrl.min}
                                                max={ctrl.max}
                                                step="0.5"
                                                value={activeSub[ctrl.key] || ctrl.rec}
                                                onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, [ctrl.key]: parseFloat(e.target.value) } })}
                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rubber-600"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Toggles — All platform-specific */}
                            <div className="space-y-2">
                                {toggleItems.map((item) => {
                                    const isActive = activeSub[item.key];
                                    
                                    return (
                                        <div 
                                            key={item.key}
                                            onClick={() => handleToggle(item.key)}
                                            className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                                                isActive 
                                                ? 'bg-rubber-50 border-rubber-200 text-rubber-700 shadow-sm' 
                                                : 'bg-white border-gray-50 text-gray-300 hover:border-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-rubber-600 text-white' : 'bg-gray-50 text-gray-300'}`}>
                                                    {item.icon}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>
                                                    {item.labelKey && isActive && (
                                                        <div className="mt-1 flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                                                            <Type size={10} className="text-rubber-400" />
                                                            <input 
                                                                type="text"
                                                                value={activeSub.labels[item.labelKey]}
                                                                onChange={(e) => handleUpdateLabel(item.labelKey, e.target.value)}
                                                                className="bg-white border border-rubber-100 px-2 py-0.5 rounded-md focus:ring-1 focus:ring-rubber-500 text-[11px] font-bold text-rubber-600 w-full"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full relative transition-colors ${isActive ? 'bg-rubber-600' : 'bg-gray-200'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'left-5' : 'left-1'}`}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Text (Platform-Specific) */}
                            <div className="space-y-4 mt-8 pt-6 border-t border-gray-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ข้อความท้ายบิล ({activePlatform === 'paper' ? 'Paper' : 'E-Slip'})</label>
                                    <input 
                                        type="text" 
                                        value={activeSub.footerText || ''}
                                        onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, footerText: e.target.value } })}
                                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ข้อความเพิ่มเติมใต้บิล ({activePlatform === 'paper' ? 'Paper' : 'E-Slip'})</label>
                                    <textarea 
                                        rows={2}
                                        value={activeSub.extraMessage || ''}
                                        onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, extraMessage: e.target.value } })}
                                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-xs resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 bg-rubber-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-rubber-200 hover:bg-rubber-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                        Save All Templates
                    </button>
                </div>

                {/* Right: Preview (Live Digital Twin) */}
                <div className="lg:col-span-5 lg:sticky lg:top-8 bg-white/40 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
                    {/* Preview Toggle (Latex/Cup Lump) - Only for dummy data selection */}
                    <div className="mb-6 flex justify-center">
                        <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-xl">
                            {['latex', 'cup_lump'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setPreviewType(type)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {type === 'latex' ? 'Preview: Latex' : 'Preview: Cup Lump'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activePlatform === 'paper' ? (
                        <div className="mx-auto w-[240px] bg-white shadow-2xl rounded-sm border border-gray-100 p-4 font-sans text-black leading-tight overflow-hidden animate-in slide-in-from-right-4 duration-500" style={{ transform: 'rotate(1deg)' }}>
                            {/* === PAPER PREVIEW: Header === */}
                            {activeSub.topNote && (
                                <div style={{ fontSize: `${activeSub.fontSizeTopNote || 7}px` }} className="text-center italic border-b border-black mb-1 pb-1">{activeSub.topNote}</div>
                            )}
                            <div className="text-center mb-3">
                                <div className="h-8 flex items-center justify-center mb-1">
                                    {(activeSub.showLogo && settings.logoUrl) && (
                                        <img src={settings.logoUrl} alt="Logo" className="h-full object-contain filter grayscale contrast-200" />
                                    )}
                                </div>
                                {activeSub.showStoreName && <h1 style={{ fontSize: `${activeSub.fontSizeStoreName || 12}px` }} className="font-bold">{settings.factoryName}</h1>}
                                {activeSub.showAddress && <p style={{ fontSize: `${activeSub.fontSizeAddress || 7}px` }} className="leading-tight">{settings.address}</p>}
                                {activeSub.showPhone && <p style={{ fontSize: `${activeSub.fontSizePhone || 8}px` }} className="font-bold">โทร: {settings.phone}</p>}
                                {activeSub.showBillType && (
                                    <div style={{ fontSize: `${activeSub.fontSizeHeaderTitle || 10}px` }} className="mt-2 font-bold border border-black inline-block px-3 py-0.5">
                                        {activeSub.headerTitle}
                                    </div>
                                )}
                            </div>

                            {/* === PAPER PREVIEW: Invoice Info === */}
                            <div className="mb-2 font-mono border-b border-black pb-1">
                                {activeSub.showBillId && (
                                    <div className="flex justify-between" style={{ fontSize: `${activeSub.fontSizeBillIdValue || 8}px` }}>
                                        <span style={{ fontSize: `${activeSub.fontSizeBillIdLabel || 7}px` }}>เลขที่:</span>
                                        <span className="font-bold">{mockData.id}</span>
                                    </div>
                                )}
                                {activeSub.showSelectedDate && (
                                    <div className="flex justify-between" style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 8}px` }}>
                                        <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                        <span className="font-bold">{format(addYears(mockData.date, 543), 'dd/MM/yyyy')}</span>
                                    </div>
                                )}
                                {activeSub.showRecordingTime && (
                                    <div className="flex justify-between" style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 8}px` }}>
                                        <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                        <span className="font-bold">{format(addYears(mockData.date, 543), 'dd/MM/yyyy HH:mm')}</span>
                                    </div>
                                )}
                            </div>

                            {/* === PAPER PREVIEW: Farmer === */}
                            {activeSub.showFarmerName && (
                                <div className="mb-2">
                                    <div>
                                        <span style={{ fontSize: `${activeSub.fontSizeFarmerNameLabel || 9}px` }}>ชื่อลูกค้า: </span>
                                        <span style={{ fontSize: `${activeSub.fontSizeFarmerNameValue || 10}px` }} className="font-bold">{mockData.farmerName}</span>
                                    </div>
                                    {(activeSub.showFscCode && mockData.fscId) && (
                                        <div className="text-gray-600 font-mono mt-0.5" style={{ fontSize: `${(activeSub.fontSizeFarmerNameValue || 10) - 2}px` }}>
                                            <span>{(activeSub.labels?.fscCode || 'รหัส FSC')}: </span>
                                            <span className="font-bold">{mockData.fscId}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === PAPER PREVIEW: Details === */}
                            <div className="border-t border-black border-dashed pt-2 space-y-1">
                                {activeSub.showPurchaseDetailsHeader !== false && (
                                    <div className="text-center text-[10px] font-bold border-y border-black py-0.5 mb-2 uppercase">=== รายละเอียดรับซื้อ ===</div>
                                )}
                                {activeSub.showRawWeight && (
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${activeSub.fontSizeRawWeightLabel || 9}px` }}>{activeSub.labels.rawWeight}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeRawWeightValue || 10}px` }} className="font-bold">{mockData.weight.toFixed(1)} กก.</span>
                                    </div>
                                )}
                                {activeSub.showBucketWeight && (
                                    <div className="flex justify-between items-center italic opacity-70">
                                        <span style={{ fontSize: `${activeSub.fontSizeBucketWeightLabel || 8}px` }}>{activeSub.labels.bucketWeight}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeBucketWeightValue || 8}px` }}>-{mockData.bucketWeight.toFixed(1)} กก.</span>
                                    </div>
                                )}
                                {activeSub.showNetWeight && (
                                    <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                                        <span style={{ fontSize: `${activeSub.fontSizeNetWeightLabel || 9}px` }}>{activeSub.labels.netWeight}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeNetWeightValue || 11}px` }} className="font-bold">{mockData.netWeight.toFixed(1)} กก.</span>
                                    </div>
                                )}
                                {activeSub.showDrc && (
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${activeSub.fontSizeDrcLabel || 9}px` }}>{activeSub.labels.drc}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeDrcValue || 10}px` }}>{mockData.drc.toFixed(1)}%</span>
                                    </div>
                                )}
                                {activeSub.showDryWeight && (
                                    <div className="flex justify-between items-center border-b border-black pb-1">
                                        <span style={{ fontSize: `${activeSub.fontSizeDryWeightLabel || 9}px` }}>{activeSub.labels.dryWeight}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeDryWeightValue || 11}px` }} className="font-bold">{mockData.dryWeight.toFixed(1)} กก.</span>
                                    </div>
                                )}

                                {/* === PAPER PREVIEW: Pricing === */}
                                <div className="my-1 border-t border-black border-dotted"></div>
                                {activeSub.showBasePrice && (
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${activeSub.fontSizeBasePriceLabel || 8}px` }}>{activeSub.labels.basePrice}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeBasePriceValue || 10}px` }}>{mockData.basePrice.toFixed(1)}/กก.</span>
                                    </div>
                                )}
                                {activeSub.showBonusDrc && (
                                    <div className="flex justify-between items-center text-black italic">
                                        <span style={{ fontSize: `${activeSub.fontSizeBonusDrcLabel || 8}px` }}>{activeSub.labels.bonusDrc}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeBonusDrcValue || 8}px` }}>+{mockData.bonusDrc.toFixed(1)}</span>
                                    </div>
                                )}
                                {activeSub.showActualPrice && (
                                    <div className="flex justify-between items-center mt-1 border-t border-black pt-1">
                                        <span style={{ fontSize: `${activeSub.fontSizeActualPriceLabel || 10}px` }} className="font-bold">{activeSub.labels.actualPrice}</span>
                                        <span style={{ fontSize: `${activeSub.fontSizeActualPriceValue || 12}px` }} className="font-bold">{mockData.actualPrice.toFixed(1)}/กก.</span>
                                    </div>
                                )}

                                {/* === PAPER PREVIEW: Splits === */}
                                {activeSub.showSplits && (
                                    <div className="pt-2 mt-2 border-t-2 border-black space-y-0.5">
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitLabel || 9}px` }} className="font-bold">{activeSub.labels.farmerSplit} ({100 - mockData.empPct}%)</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitValue || 11}px` }} className="font-bold">฿{Math.floor(mockData.farmerTotal).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center opacity-70">
                                            <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitLabel || 8}px` }}>{activeSub.labels.employeeSplit} ({mockData.empPct}%)</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitValue || 9}px` }}>฿{Math.floor(mockData.employeeTotal).toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* === PAPER PREVIEW: Extra & Footer === */}
                            {activeSub.extraMessage && (
                                <div style={{ fontSize: `${activeSub.fontSizeExtraMessage || 7}px` }} className="mt-4 text-center border border-black p-1 italic line-clamp-2">
                                    {activeSub.extraMessage}
                                </div>
                            )}
                            <div className="border-t-4 border-double border-black py-1 mt-3">
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${activeSub.fontSizeTotalLabel || 9}px` }} className="font-bold uppercase">ยอดรวมสุทธิ</span>
                                    <span style={{ fontSize: `${activeSub.fontSizeTotalValue || 16}px` }} className="font-bold">฿{Math.floor(mockData.total).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="text-center mt-2 border-t border-black pt-1">
                                <p style={{ fontSize: `${activeSub.fontSizeFooterText || 8}px` }} className="font-bold">{activeSub.footerText}</p>
                            </div>
                        </div>
                    ) : (
                        /* ======= E-SLIP PREVIEW ======= */
                        <div className="mx-auto w-[240px] bg-white rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in duration-500">
                            {/* === ESLIP PREVIEW: Header === */}
                            <div className="bg-[#2d5a3f] py-4 px-3 text-center text-white relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                                <div className="h-10 flex items-center justify-center mb-1">
                                    {(activeSub.showLogo && settings.logoUrl) && (
                                        <img src={settings.logoUrl} alt="Logo" className="h-full object-contain" />
                                    )}
                                </div>
                                {activeSub.showStoreName && <h1 style={{ fontSize: `${activeSub.fontSizeStoreName || 14}px` }} className="font-black">{settings.factoryName}</h1>}
                                {(activeSub.showAddress || activeSub.showPhone) && (
                                    <p className="opacity-70 font-medium mb-2">
                                        {activeSub.showAddress && <span style={{ fontSize: `${activeSub.fontSizeAddress || 8}px` }}>{settings.address}</span>}
                                        {activeSub.showPhone && <span style={{ fontSize: `${activeSub.fontSizePhone || 9}px` }} className="ml-1">โทร: {settings.phone}</span>}
                                    </p>
                                )}
                                {activeSub.showBillType && (
                                    <div style={{ fontSize: `${activeSub.fontSizeHeaderTitle || 8}px` }} className="mt-1 font-black bg-white/20 px-4 py-1 rounded-full border border-white/10 uppercase tracking-widest inline-block">
                                        {activeSub.headerTitle}
                                    </div>
                                )}
                                {activeSub.topNote && (
                                    <div style={{ fontSize: `${activeSub.fontSizeTopNote || 7}px` }} className="mt-1 font-black bg-yellow-400 text-black px-2 py-0.5 rounded-full inline-block">{activeSub.topNote}</div>
                                )}
                            </div>

                            <div className="px-3 pt-3 pb-3">
                                {/* === ESLIP PREVIEW: Invoice Info === */}
                                {(activeSub.showBillId || activeSub.showSelectedDate || activeSub.showRecordingTime) && (
                                    <div className="flex flex-col mb-2 font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg gap-0.5">
                                        {activeSub.showBillId && (
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-0.5 mb-0.5">
                                                <span style={{ fontSize: `${activeSub.fontSizeBillIdLabel || 7}px` }}>ID:</span>
                                                <span style={{ fontSize: `${activeSub.fontSizeBillIdValue || 7}px` }} className="text-gray-700">{mockData.id}</span>
                                            </div>
                                        )}
                                        {activeSub.showSelectedDate && (
                                            <div className="flex justify-between items-center">
                                                <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                                <span style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 7}px` }} className="text-gray-700">{format(addYears(mockData.date, 543), 'dd MMM yy')}</span>
                                            </div>
                                        )}
                                        {activeSub.showRecordingTime && (
                                            <div className="flex justify-between items-center">
                                                <span style={{ fontSize: `${activeSub.fontSizeDateTimeLabel || 7}px` }}>{(activeSub.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                                <span style={{ fontSize: `${activeSub.fontSizeDateTimeValue || 7}px` }} className="text-gray-700">{format(addYears(mockData.date, 543), 'dd MMM yy HH:mm')}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* === ESLIP PREVIEW: Farmer === */}
                                {activeSub.showFarmerName && (
                                    <div className="mb-2 pb-2 border-b border-dotted border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p style={{ fontSize: `${activeSub.fontSizeFarmerNameLabel || 6}px` }} className="font-bold text-gray-400 uppercase">ข้อมูลลูกค้า</p>
                                                <h2 style={{ fontSize: `${activeSub.fontSizeFarmerNameValue || 16}px` }} className="font-black text-gray-800 leading-tight">{mockData.farmerName}</h2>
                                            </div>
                                            {(activeSub.showFscCode && mockData.fscId) && (
                                                <div className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-mono text-[9px] font-black flex items-center gap-1 shrink-0 mt-1">
                                                    <Leaf size={10} className="text-amber-600" />
                                                    <span>{mockData.fscId}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* === ESLIP PREVIEW: Details Grid === */}
                                <div className="space-y-1.5 mb-2">
                                    {activeSub.showPurchaseDetailsHeader !== false && (
                                        <p style={{ fontSize: `${(activeSub.fontSizeLabel || 9) - 3}px` }} className="font-black text-gray-400 mb-1 uppercase tracking-widest text-center">=== รายละเอียดรับซื้อ ===</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {activeSub.showRawWeight && (
                                            <div className="p-1.5 bg-gray-50 rounded-lg">
                                                <p style={{ fontSize: `${activeSub.fontSizeRawWeightLabel || 6}px` }} className="font-bold text-gray-400 uppercase">{activeSub.labels.rawWeight}</p>
                                                <p style={{ fontSize: `${activeSub.fontSizeRawWeightValue || 11}px` }} className="font-black text-gray-800">{mockData.weight.toFixed(1)} <span className="text-[6px]">กก.</span></p>
                                            </div>
                                        )}
                                        {activeSub.showDrc && (
                                            <div className="p-1.5 bg-rubber-50 rounded-lg">
                                                <p style={{ fontSize: `${activeSub.fontSizeDrcLabel || 6}px` }} className="font-bold text-rubber-400 uppercase">{activeSub.labels.drc}</p>
                                                <p style={{ fontSize: `${activeSub.fontSizeDrcValue || 11}px` }} className="font-black text-rubber-700">{mockData.drc.toFixed(1)}%</p>
                                            </div>
                                        )}
                                    </div>
                                    {activeSub.showBucketWeight && (
                                        <div className="flex justify-between items-center px-1">
                                            <span style={{ fontSize: `${activeSub.fontSizeBucketWeightLabel || 8}px` }} className="font-bold text-red-400">{activeSub.labels.bucketWeight}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeBucketWeightValue || 8}px` }} className="font-bold text-red-500">-{mockData.bucketWeight.toFixed(1)} กก.</span>
                                        </div>
                                    )}
                                    {activeSub.showNetWeight && (
                                        <div className="flex justify-between items-center px-1 font-bold">
                                            <span style={{ fontSize: `${activeSub.fontSizeNetWeightLabel || 9}px` }} className="text-gray-600">{activeSub.labels.netWeight}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeNetWeightValue || 10}px` }} className="text-gray-900">{mockData.netWeight.toFixed(1)} กก.</span>
                                        </div>
                                    )}
                                    {activeSub.showDryWeight && (
                                        <div className="flex justify-between items-center bg-gray-800 p-1.5 rounded-lg text-white">
                                            <span style={{ fontSize: `${activeSub.fontSizeDryWeightLabel || 8}px` }} className="font-bold uppercase tracking-wider">{activeSub.labels.dryWeight}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeDryWeightValue || 13}px` }} className="font-black tracking-tighter">{mockData.dryWeight.toFixed(1)} <span className="text-[7px] opacity-60">KG.</span></span>
                                        </div>
                                    )}
                                </div>

                                {/* === ESLIP PREVIEW: Pricing === */}
                                <div className="space-y-0.5 mb-2">
                                    {activeSub.showBasePrice && (
                                        <div className="flex justify-between items-center px-1">
                                            <span style={{ fontSize: `${activeSub.fontSizeBasePriceLabel || 8}px` }} className="font-bold text-gray-400">{activeSub.labels.basePrice}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeBasePriceValue || 9}px` }} className="font-bold text-gray-800">฿{mockData.basePrice.toFixed(1)}/กก.</span>
                                        </div>
                                    )}
                                    {activeSub.showBonusDrc && (
                                        <div className="flex justify-between items-center px-1">
                                            <span style={{ fontSize: `${activeSub.fontSizeBonusDrcLabel || 8}px` }} className="font-bold text-gray-400">{activeSub.labels.bonusDrc}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeBonusDrcValue || 8}px` }} className="font-bold text-green-600">+฿{mockData.bonusDrc.toFixed(1)}/กก.</span>
                                        </div>
                                    )}
                                    {activeSub.showBonusFsc && (
                                        <div className="flex justify-between items-center px-1">
                                            <span style={{ fontSize: `${activeSub.fontSizeBonusFscLabel || 8}px` }} className="font-bold text-gray-400">{activeSub.labels.bonusFsc}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeBonusFscValue || 8}px` }} className="font-bold text-amber-600">+฿{mockData.bonusFsc.toFixed(1)}/กก.</span>
                                        </div>
                                    )}
                                    {activeSub.showBonusMember && (
                                        <div className="flex justify-between items-center px-1 py-0.5 bg-rubber-50 rounded">
                                            <span style={{ fontSize: `${activeSub.fontSizeBonusMemberLabel || 8}px` }} className="font-black text-rubber-700">{activeSub.labels.bonusMember}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeBonusMemberValue || 8}px` }} className="font-black text-rubber-700">+฿{mockData.bonusMember.toFixed(1)}/กก.</span>
                                        </div>
                                    )}
                                    {activeSub.showActualPrice && (
                                        <div className="flex justify-between items-center px-1 pt-1 border-t border-dotted border-gray-200">
                                            <span style={{ fontSize: `${activeSub.fontSizeActualPriceLabel || 9}px` }} className="font-black text-gray-800">{activeSub.labels.actualPrice}</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeActualPriceValue || 10}px` }} className="font-black text-gray-900">฿{mockData.actualPrice.toFixed(1)}/กก.</span>
                                        </div>
                                    )}
                                </div>

                                {/* === ESLIP PREVIEW: Splits === */}
                                {activeSub.showSplits && (
                                    <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 space-y-1 mb-2">
                                        <p style={{ fontSize: `${activeSub.fontSizeFarmerSplitLabel - 3 || 6}px` }} className="font-black text-rubber-600 uppercase tracking-widest">การจัดสรรเงิน</p>
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitLabel || 9}px` }} className="font-bold text-orange-400">{activeSub.labels.farmerSplit} ({100 - mockData.empPct}%)</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeFarmerSplitValue || 9}px` }} className="font-black text-[#5ba2d7]">฿{Math.floor(mockData.farmerTotal).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitLabel || 9}px` }} className="font-bold text-purple-400">{activeSub.labels.employeeSplit} ({mockData.empPct}%)</span>
                                            <span style={{ fontSize: `${activeSub.fontSizeEmployeeSplitValue || 9}px` }} className="font-black text-purple-500">฿{Math.floor(mockData.employeeTotal).toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                {/* === ESLIP PREVIEW: Extra === */}
                                {activeSub.extraMessage && (
                                    <div style={{ fontSize: `${activeSub.fontSizeExtraMessage || 7}px` }} className="p-2 bg-gray-50 rounded-xl text-gray-500 italic border border-gray-100 leading-relaxed mb-2">
                                        {activeSub.extraMessage}
                                    </div>
                                )}
                            </div>

                            {/* === ESLIP PREVIEW: Total Footer === */}
                            <div className="bg-[#2d5a3f] p-3 flex justify-between items-center text-white">
                                <span style={{ fontSize: `${activeSub.fontSizeTotalLabel || 10}px` }} className="font-black uppercase tracking-widest">ยอดรวมจ่าย</span>
                                <div className="text-right">
                                    <span style={{ fontSize: `${activeSub.fontSizeTotalValue || 24}px` }} className="font-black leading-none tabular-nums tracking-tighter block">
                                        ฿{Math.floor(mockData.total).toLocaleString()}
                                    </span>
                                    <span style={{ fontSize: `${activeSub.fontSizeFooterText || 7}px` }} className="opacity-60 font-medium">{activeSub.footerText}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-8 text-center px-12">
                        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-rubber-50 rounded-full border border-rubber-100 shadow-sm shadow-rubber-100/30">
                            <Sparkles size={14} className="text-rubber-500 animate-pulse" />
                            <span className="text-[8px] font-bold text-rubber-600 uppercase tracking-[0.2em]">Real-time Digital Twin</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaperSlipSettings;

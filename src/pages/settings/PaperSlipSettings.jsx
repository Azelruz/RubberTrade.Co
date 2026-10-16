import React, { useState, useEffect } from 'react';
import { 
    Receipt, Store, MapPin, Phone, 
    Hash, Calendar, User, Scale, Percent, Calculator, 
    DollarSign, Sparkles, CreditCard, Users, MessageSquare, 
    Type, Image as ImageIcon, Leaf, Plus, Trash2, Edit3
} from 'lucide-react';
import { getSettings, updateSettingsAPI } from '../../services/apiService';
import toast from 'react-hot-toast';

import PaperSlipControls from './paper-slip/PaperSlipControls';
import PaperSlipPreview from './paper-slip/PaperSlipPreview';

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
            // Granular Font Sizes (Thermal Paper default)
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
                        
                        const migrateTemplates = (data) => {
                            const spreadCommonIntoSubs = (template) => {
                                const c = template.common || {};
                                const commonShowFields = {};
                                const commonTextFields = {};
                                ['showLogo','showStoreName','showAddress','showPhone'].forEach(k => { if (k in c) commonShowFields[k] = c[k]; });
                                ['footerText','topNote','extraMessage'].forEach(k => { if (k in c) commonTextFields[k] = c[k]; });
                                
                                const migratePlatform = (p, source) => {
                                    if (!source) return p;
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
                                    common: {}, 
                                    paper: migratePlatform(createNewTemplate('','').paper, { ...commonShowFields, ...commonTextFields, ...(template.paper || {}) }),
                                    eslip: migratePlatform(createNewTemplate('','').eslip, { ...commonShowFields, ...commonTextFields, ...(template.eslip || {}) })
                                };
                            };

                            if (data.templates && data.templates.every(t => t.paper && t.eslip)) {
                                return {
                                    ...data,
                                    templates: data.templates.map(spreadCommonIntoSubs)
                                };
                            }

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
                <PaperSlipControls 
                    activeTemplate={activeTemplate}
                    activePlatform={activePlatform}
                    setActivePlatform={setActivePlatform}
                    activeSub={activeSub}
                    handleUpdateActiveTemplate={handleUpdateActiveTemplate}
                    activeFontCategory={activeFontCategory}
                    setActiveFontCategory={setActiveFontCategory}
                    fontSizeCategories={fontSizeCategories}
                    fontSizeControls={fontSizeControls}
                    toggleItems={toggleItems}
                    handleToggle={handleToggle}
                    handleUpdateLabel={handleUpdateLabel}
                    handleSave={handleSave}
                    saving={saving}
                />

                {/* Right: Preview (Live Digital Twin) */}
                <PaperSlipPreview 
                    activePlatform={activePlatform}
                    previewType={previewType}
                    setPreviewType={setPreviewType}
                    activeSub={activeSub}
                    settings={settings}
                    mockData={mockData}
                />
            </div>
        </div>
    );
};

export default PaperSlipSettings;

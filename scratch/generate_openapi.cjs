const fs = require('fs');
const path = require('path');

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "RubberTrade API Specification",
    version: "1.8.2",
    description: "ระบบบริหารจัดการธุรกิจรับซื้อน้ำยางพารา สัจจะออมทรัพย์ สหกรณ์ และแปลงสวนยางพารา (Cloudflare Pages Functions + D1)",
    contact: {
      name: "RubberTrade Co., Ltd. Technical Support",
      url: "https://rubertrade-padang.pages.dev"
    }
  },
  servers: [
    {
      url: "/api",
      description: "เซิร์ฟเวอร์สาขาปัจจุบัน (Current Branch API)"
    },
    {
      url: "https://rubertrade-padang.pages.dev/api",
      description: "สาขาปาดังเบซาร์ (Padang Besar Branch)"
    },
    {
      url: "https://rubertrade-ache2.pages.dev/api",
      description: "สาขาอาเช่ 2 (Ache 2 Branch)"
    }
  ],
  tags: [
    { name: "Auth & Users", description: "การยืนยันตัวตน สิทธิ์ผู้ใช้งาน และพนักงาน" },
    { name: "Buys (รับซื้อยาง)", description: "การบันทึกรายการรับซื้อน้ำยางสดและขี้ยาง คำนวณ DRC และหักเงินกู้" },
    { name: "Sells (ขายโรงงาน)", description: "บันทึกการส่งยางขายโรงงาน สต็อก และหลักฐานใบส่งของ" },
    { name: "Farmers & Tappers", description: "ทะเบียนเกษตรกร ลูกจ้างกรีดยาง และการค้นหา" },
    { name: "Land Plots (แปลงสวนยาง)", description: "พิกัดแปลงสวนยาง แปลงตามมาตรฐาน กยท. และบันทึกกิจกรรมในสวน" },
    { name: "Cooperatives & Savings", description: "ระบบสมาชิกสหกรณ์ หุ้น สัจจะออมทรัพย์ ฝาก-ถอน และเงินปันผล" },
    { name: "Expenses & Wages", description: "บันทึกรายจ่าย ค่าน้ำมัน ค่าสารเคมี และค่าแรงพนักงาน" },
    { name: "Loans & Advances", description: "ระบบเงินกู้ เบิกล่วงหน้า และการหักชำระหนี้จากบิลรับซื้อ" },
    { name: "Queues & Logistics", description: "ระบบคิวชั่งน้ำหนักอัจฉริยะ จอแสดงผล และคิวบริการ" },
    { name: "Dashboard & Reports", description: "ข้อมูลสถิติ แดชบอร์ดสรุปยอดประจำวัน พยากรณ์ราคา และรายงาน กยท." },
    { name: "Notifications & Settings", description: "การแจ้งเตือนยอดค้างจ่าย การตั้งค่าระบบสาขา และสลิป" },
    { name: "AI Vision Services", description: "บริการ AI อ่านใบเสร็จโรงงานและใบแจ้งยอดค่าใช้จ่าย" },
    { name: "LINE & Messaging", description: "การเชื่อมต่อ LINE LIFF, Webhook และส่งใบเสร็จ e-Receipt" },
    { name: "Super Admin", description: "การบริหารจัดการหลายสาขา ฐานข้อมูล และใบอนุญาต Subscription" }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "ใส่ Supabase JWT Token ใน Authorization header เช่น: `Bearer <token>`"
      }
    },
    schemas: {
      StandardResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "success" },
          message: { type: "string", example: "ดำเนินการสำเร็จ" },
          data: { type: "object" }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "error" },
          message: { type: "string", example: "Unauthorized หรือ ข้อความระบุข้อผิดพลาด" }
        }
      },
      BuyRecord: {
        type: "object",
        properties: {
          id: { type: "string", example: "B-03352026-0042" },
          date: { type: "string", format: "date", example: "2026-10-05" },
          farmerId: { type: "string", example: "F-001" },
          farmerName: { type: "string", example: "สมชาย รักสงบ" },
          rubberType: { type: "string", enum: ["latex", "cup_lump"], example: "latex" },
          weight: { type: "number", example: 120.5 },
          bucketWeight: { type: "number", example: 4.5 },
          netWeight: { type: "number", example: 116.0 },
          drc: { type: "number", example: 34.5 },
          dryRubber: { type: "number", example: 40.02 },
          actualPrice: { type: "number", example: 78.50 },
          total: { type: "number", example: 3141.57 },
          empPct: { type: "number", example: 50.0 },
          empAmount: { type: "number", example: 1570.78 },
          loanDeduction: { type: "number", example: 500.0 },
          netPay: { type: "number", example: 2641.57 },
          note: { type: "string", example: "" }
        },
        required: ["date", "weight", "actualPrice"]
      },
      SellRecord: {
        type: "object",
        properties: {
          id: { type: "string", example: "S-03352026-0015" },
          date: { type: "string", format: "date", example: "2026-10-05" },
          buyerName: { type: "string", example: "บจก. ยางพาราไทยแลนด์" },
          factoryId: { type: "string", example: "FAC-01" },
          truckId: { type: "string", example: "TRUCK-01" },
          rubberType: { type: "string", enum: ["latex", "cup_lump"], example: "latex" },
          weight: { type: "number", example: 4500.0 },
          lossWeight: { type: "number", example: -15.0 },
          drc: { type: "number", example: 34.2 },
          pricePerKg: { type: "number", example: 81.00 },
          total: { type: "number", example: 364500.00 },
          receiptUrl: { type: "string", example: "https://example.com/receipt.jpg" },
          note: { type: "string", example: "" }
        },
        required: ["date", "buyerName", "weight", "pricePerKg"]
      },
      Farmer: {
        type: "object",
        properties: {
          id: { type: "string", example: "F-001" },
          name: { type: "string", example: "สมชาย รักสงบ" },
          nickname: { type: "string", example: "บังชาย" },
          realName: { type: "string", example: "นายสมชาย รักสงบ" },
          idCard: { type: "string", example: "1909800123456" },
          phone: { type: "string", example: "0812345678" },
          address: { type: "string", example: "123 หมู่ 4 ต.ปาดังเบซาร์ อ.สะเดา จ.สงขลา" },
          bankAccount: { type: "string", example: "123-4-56789-0" },
          bankName: { type: "string", example: "ธ.ก.ส." },
          memberType: { type: "string", example: "member" },
          shareBalance: { type: "number", example: 5000 },
          savingsBalance: { type: "number", example: 12500 }
        },
        required: ["name"]
      },
      SavingsAccount: {
        type: "object",
        properties: {
          id: { type: "string", example: "ACC-001" },
          memberId: { type: "string", example: "F-001" },
          memberName: { type: "string", example: "สมชาย รักสงบ" },
          accountNumber: { type: "string", example: "SA-0335-0012" },
          accountType: { type: "string", enum: ["truth_savings", "general"], example: "truth_savings" },
          balance: { type: "number", example: 15400.0 },
          interestRate: { type: "number", example: 2.5 },
          status: { type: "string", example: "active" }
        }
      },
      SavingsTransaction: {
        type: "object",
        properties: {
          id: { type: "string", example: "TX-9901" },
          accountId: { type: "string", example: "ACC-001" },
          type: { type: "string", enum: ["deposit", "withdrawal", "interest"], example: "deposit" },
          amount: { type: "number", example: 1000.0 },
          balanceAfter: { type: "number", example: 16400.0 },
          note: { type: "string", example: "ฝากสัจจะประจำเดือน" },
          created_at: { type: "string", example: "2026-10-05T08:30:00Z" }
        }
      },
      LandPlot: {
        type: "object",
        properties: {
          id: { type: "string", example: "PLOT-001" },
          farmerId: { type: "string", example: "F-001" },
          plotName: { type: "string", example: "แปลงควนหิน" },
          areaRai: { type: "number", example: 15 },
          areaNgan: { type: "number", example: 2 },
          areaSqWa: { type: "number", example: 50 },
          rubberType: { type: "string", example: "RRIM 600" },
          treeAge: { type: "number", example: 12 },
          treeCount: { type: "number", example: 1100 },
          coordinates: { type: "string", example: "6.6612,100.3211" },
          raotRegistered: { type: "boolean", example: true }
        }
      },
      QueueTicket: {
        type: "object",
        properties: {
          id: { type: "string", example: "Q-101" },
          queueNumber: { type: "string", example: "A01" },
          farmerId: { type: "string", example: "F-001" },
          farmerName: { type: "string", example: "สมชาย รักสงบ" },
          station: { type: "string", example: "station_1" },
          status: { type: "string", enum: ["waiting", "weighing", "completed", "cancelled"], example: "waiting" },
          weight: { type: "number", example: 150.0 },
          created_at: { type: "string", example: "2026-10-05T07:15:00Z" }
        }
      }
    }
  },
  security: [
    { BearerAuth: [] }
  ],
  paths: {
    "/login": {
      post: {
        tags: ["Auth & Users"],
        summary: "เข้าสู่ระบบ (Staff / Admin Login)",
        description: "ตรวจสอบชื่อผู้ใช้งานและรหัสผ่านเพื่อเข้าสู่ระบบ",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string", example: "admin" },
                  password: { type: "string", example: "password123" }
                },
                required: ["username", "password"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "เข้าสู่ระบบสำเร็จ คืนข้อมูลผู้ใช้และสิทธิ์",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        username: { type: "string" },
                        role: { type: "string", example: "owner" }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            description: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/staff": {
      get: {
        tags: ["Auth & Users"],
        summary: "ดึงรายชื่อพนักงานทั้งหมดของสาขา",
        responses: {
          "200": {
            description: "รายชื่อพนักงาน",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      role: { type: "string" },
                      phone: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Auth & Users"],
        summary: "เพิ่มหรือแก้ไขข้อมูลพนักงาน",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string", example: "สมบัติ ใจดี" },
                  role: { type: "string", example: "staff" },
                  phone: { type: "string", example: "0899999999" }
                },
                required: ["name", "role"]
              }
            }
          }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/buys": {
      get: {
        tags: ["Buys (รับซื้อยาง)"],
        summary: "ค้นหาและดึงรายการรับซื้อยางพารา",
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" }, description: "วันที่เริ่มต้น (YYYY-MM-DD)" },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" }, description: "วันที่สิ้นสุด (YYYY-MM-DD)" },
          { name: "search", in: "query", schema: { type: "string" }, description: "ค้นหาชื่อเกษตรกร หรือเลขที่บิล" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "หมายเลขหน้าสำหรับ Pagination" },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 50 }, description: "จำนวนรายการต่อหน้า" },
          { name: "farmerStats", in: "query", schema: { type: "boolean" }, description: "ดึงเฉพาะผลรวมน้ำหนักยางแห้งสะสมของเกษตรกร" },
          { name: "all", in: "query", schema: { type: "boolean" }, description: "ดึงข้อมูลทั้งหมดไม่จำกัดเฉพาะวันนี้" }
        ],
        responses: {
          "200": {
            description: "รายการบิลรับซื้อ พร้อมสรุปยอดรวม",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: { type: "array", items: { $ref: "#/components/schemas/BuyRecord" } },
                    pagination: {
                      type: "object",
                      properties: {
                        totalCount: { type: "integer" },
                        totalPages: { type: "integer" },
                        currentPage: { type: "integer" },
                        pageSize: { type: "integer" }
                      }
                    },
                    summary: {
                      type: "object",
                      properties: {
                        totalBills: { type: "integer" },
                        totalAmount: { type: "number" },
                        totalWeight: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Buys (รับซื้อยาง)"],
        summary: "บันทึกรายการรับซื้อยางพารา (เดี่ยว หรือ กลุ่ม)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/BuyRecord" },
                  {
                    type: "object",
                    properties: {
                      action: { type: "string", example: "bulk" },
                      payloads: { type: "array", items: { $ref: "#/components/schemas/BuyRecord" } }
                    }
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } },
          "400": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/sells": {
      get: {
        tags: ["Sells (ขายโรงงาน)"],
        summary: "ดึงรายการบันทึกการส่งยางขายโรงงาน",
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string" } },
          { name: "endDate", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/SellRecord" } }
              }
            }
          }
        }
      },
      post: {
        tags: ["Sells (ขายโรงงาน)"],
        summary: "บันทึกรายการส่งยางขายโรงงาน พร้อมแนบหลักฐาน",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SellRecord" } } }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/sells/scan": {
      post: {
        tags: ["AI Vision Services", "Sells (ขายโรงงาน)"],
        summary: "สแกนบิลใบส่งของโรงงานด้วย AI OCR",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  image: { type: "string", description: "Base64 image string หรือ Image URL" }
                },
                required: ["image"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "ข้อมูลที่ AI ตรวจจับได้ (น้ำหนัก, DRC, ราคา, ชื่อโรงงาน)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    factoryName: { type: "string" },
                    weight: { type: "number" },
                    drc: { type: "number" },
                    pricePerKg: { type: "number" },
                    total: { type: "number" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/farmers": {
      get: {
        tags: ["Farmers & Tappers"],
        summary: "ดึงรายชื่อเกษตรกรชาวสวนยาง",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" }, description: "ค้นหาจากชื่อ ชื่อเล่น หรือเลขบัตร ปชช." },
          { name: "limit", in: "query", schema: { type: "integer", default: 100 } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Farmer" } }
              }
            }
          }
        }
      },
      post: {
        tags: ["Farmers & Tappers"],
        summary: "สร้างหรืออัปเดตข้อมูลเกษตรกร (รองรับชื่อจริงและเลขบัตร ปชช.)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Farmer" } } }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/land_plots": {
      get: {
        tags: ["Land Plots (แปลงสวนยาง)"],
        summary: "ดึงรายการแปลงสวนยางพาราและพิกัดแผนที่",
        parameters: [
          { name: "farmerId", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/LandPlot" } }
              }
            }
          }
        }
      },
      post: {
        tags: ["Land Plots (แปลงสวนยาง)"],
        summary: "บันทึกข้อมูลแปลงสวนยางและพิกัดแปลง",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LandPlot" } } }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/plot_activities": {
      get: {
        tags: ["Land Plots (แปลงสวนยาง)"],
        summary: "ดึงประวัติการดูแลสวน (ใส่ปุ๋ย, กรีดยาง, พ่นยา)",
        parameters: [
          { name: "plotId", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      plotId: { type: "string" },
                      activityType: { type: "string" },
                      date: { type: "string" },
                      cost: { type: "number" },
                      description: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Land Plots (แปลงสวนยาง)"],
        summary: "บันทึกกิจกรรมการดูแลแปลงสวนยาง",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  plotId: { type: "string" },
                  activityType: { type: "string", example: "fertilize" },
                  date: { type: "string", format: "date" },
                  cost: { type: "number", example: 3500 },
                  description: { type: "string" }
                },
                required: ["plotId", "activityType", "date"]
              }
            }
          }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/savings-accounts": {
      get: {
        tags: ["Cooperatives & Savings"],
        summary: "ดึงรายการบัญชีเงินฝากสัจจะออมทรัพย์ของสมาชิก",
        parameters: [
          { name: "memberId", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/SavingsAccount" } }
              }
            }
          }
        }
      },
      post: {
        tags: ["Cooperatives & Savings"],
        summary: "เปิดบัญชีเงินฝากสัจจะออมทรัพย์ใหม่",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SavingsAccount" } } }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/savings-transactions": {
      get: {
        tags: ["Cooperatives & Savings"],
        summary: "ดึงรายการเคลื่อนไหวบัญชีเงินฝาก (Statement)",
        parameters: [
          { name: "accountId", in: "query", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/SavingsTransaction" } }
              }
            }
          }
        }
      },
      post: {
        tags: ["Cooperatives & Savings"],
        summary: "ทำรายการฝากเงิน หรือ ถอนเงินสัจจะออมทรัพย์",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  accountId: { type: "string" },
                  type: { type: "string", enum: ["deposit", "withdrawal"] },
                  amount: { type: "number", minimum: 1 },
                  note: { type: "string" }
                },
                required: ["accountId", "type", "amount"]
              }
            }
          }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } },
          "400": { description: "ยอดเงินไม่พอสำหรับการถอน หรือข้อมูลไม่ถูกต้อง" }
        }
      }
    },
    "/dividends/calculate": {
      post: {
        tags: ["Cooperatives & Savings"],
        summary: "คำนวณเงินปันผลตามหุ้นและเฉลี่ยคืนตามยอดขายยาง",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  periodId: { type: "string" },
                  dividendRate: { type: "number", example: 5.0, description: "อัตราปันผลตามหุ้น (%)" },
                  patronageRefundPerKg: { type: "number", example: 0.50, description: "เงินเฉลี่ยคืนบาทต่อกิโลกรัม" }
                },
                required: ["periodId", "dividendRate"]
              }
            }
          }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/expenses": {
      get: {
        tags: ["Expenses & Wages"],
        summary: "ดึงรายการค่าใช้จ่ายของสาขา พร้อม Pagination & ตัวกรองเดือน",
        parameters: [
          { name: "month", in: "query", schema: { type: "string" }, description: "เดือนที่ต้องการกรอง (YYYY-MM)" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 50 } },
          { name: "category", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: { type: "array", items: { type: "object" } },
                    pagination: { type: "object" }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Expenses & Wages"],
        summary: "บันทึกรายการค่าใช้จ่าย",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  category: { type: "string", example: "สารเคมี/แอมโมเนีย" },
                  amount: { type: "number", example: 2500 },
                  description: { type: "string" },
                  receiptUrl: { type: "string" }
                },
                required: ["date", "category", "amount"]
              }
            }
          }
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } }
        }
      }
    },
    "/wages": {
      get: {
        tags: ["Expenses & Wages"],
        summary: "ดึงรายการบันทึกค่าแรงพนักงาน",
        parameters: [
          { name: "month", in: "query", schema: { type: "string" } },
          { name: "employeeId", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "รายการค่าแรง" } }
      },
      post: {
        tags: ["Expenses & Wages"],
        summary: "บันทึกการจ่ายค่าแรงพนักงาน",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  employeeId: { type: "string" },
                  amount: { type: "number" },
                  note: { type: "string" }
                },
                required: ["date", "employeeId", "amount"]
              }
            }
          }
        },
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/loans": {
      get: {
        tags: ["Loans & Advances"],
        summary: "ดึงรายการเงินกู้และเงินเบิกล่วงหน้าของเกษตรกร",
        parameters: [
          { name: "farmerId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "paid"] } }
        ],
        responses: { "200": { description: "รายการสัญญาเงินกู้" } }
      },
      post: {
        tags: ["Loans & Advances"],
        summary: "สร้างสัญญาเงินกู้หรือบันทึกการเบิกเงินล่วงหน้า",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  farmerId: { type: "string" },
                  amount: { type: "number", example: 10000 },
                  interestRate: { type: "number", example: 1.0 },
                  date: { type: "string", format: "date" },
                  note: { type: "string" }
                },
                required: ["farmerId", "amount", "date"]
              }
            }
          }
        },
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/queue": {
      get: {
        tags: ["Queues & Logistics"],
        summary: "ดึงรายการคิวชั่งน้ำหนักยางปัจจุบัน",
        parameters: [
          { name: "station", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/QueueTicket" } }
              }
            }
          }
        }
      },
      post: {
        tags: ["Queues & Logistics"],
        summary: "กดบัตรคิวชั่งน้ำยางใหม่",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/QueueTicket" } } }
        },
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      },
      put: {
        tags: ["Queues & Logistics"],
        summary: "อัปเดตสถานะคิว (เรียกคิว, กำลังชั่ง, เสร็จสิ้น)",
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/queue/public": {
      get: {
        tags: ["Queues & Logistics"],
        summary: "จอแสดงผลคิวสาธารณะ (Smart Queue Display Screen)",
        security: [],
        responses: { "200": { description: "ข้อมูลคิวปัจจุบันสำหรับจอแสดงผลทีวี" } }
      }
    },
    "/dashboard": {
      get: {
        tags: ["Dashboard & Reports"],
        summary: "ดึงสรุปตัวเลขสถิติภาพรวมประจำวันและสต็อกคงเหลือ",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    todayBuysWeight: { type: "number" },
                    todayBuysAmount: { type: "number" },
                    stockWeight: { type: "number" },
                    recentBuys: { type: "array", items: { $ref: "#/components/schemas/BuyRecord" } }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/forecast": {
      get: {
        tags: ["Dashboard & Reports"],
        summary: "พยากรณ์แนวโน้มราคาน้ำยางพาราล่วงหน้า",
        responses: { "200": { description: "ข้อมูลแนวโน้มราคาน้ำยางล่วงหน้า 7 วัน" } }
      }
    },
    "/notifications": {
      get: {
        tags: ["Notifications & Settings"],
        summary: "ดึงรายการแจ้งเตือนในระบบ (ยอดค้างชำระ, สลิปรอตรวจ, เงินกู้)",
        parameters: [
          { name: "isRead", in: "query", schema: { type: "boolean" } }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          title: { type: "string" },
                          message: { type: "string" },
                          type: { type: "string" },
                          isRead: { type: "boolean" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        tags: ["Notifications & Settings"],
        summary: "ทำเครื่องหมายว่าอ่านแล้ว (Mark as read)",
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/settings": {
      get: {
        tags: ["Notifications & Settings"],
        summary: "ดึงการตั้งค่าของสาขา (ชื่อร้าน, อัตราทด, หัวกระดาษสลิป)",
        responses: { "200": { description: "Object การตั้งค่าของสาขา" } }
      },
      post: {
        tags: ["Notifications & Settings"],
        summary: "บันทึกการตั้งค่าสาขา",
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/upload": {
      post: {
        tags: ["AI Vision Services", "Notifications & Settings"],
        summary: "อัปโหลดรูปภาพหลักฐานหรือสลิปไปยัง Cloud Storage",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    url: { type: "string", example: "https://storage.rubbertrade.com/receipts/img-123.jpg" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/send-line-receipt": {
      post: {
        tags: ["LINE & Messaging"],
        summary: "ส่งสลิป e-Receipt เข้า LINE ของเกษตรกรอัตโนมัติ",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  billId: { type: "string", example: "B-03352026-0042" },
                  farmerId: { type: "string", example: "F-001" }
                },
                required: ["billId", "farmerId"]
              }
            }
          }
        },
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/broadcast-price": {
      post: {
        tags: ["LINE & Messaging"],
        summary: "บรอดแคสต์แจ้งราคายางประจำวันไปยังสมาชิกผ่าน LINE Official Account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  latexPrice: { type: "number", example: 78.50 },
                  cupLumpPrice: { type: "number", example: 32.00 },
                  message: { type: "string" }
                },
                required: ["latexPrice"]
              }
            }
          }
        },
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/admin/branches": {
      get: {
        tags: ["Super Admin"],
        summary: "ดึงรายชื่อสาขาทั้งหมดในเครือข่าย RubberTrade",
        responses: { "200": { description: "รายการสาขาและสถานะ D1 Database" } }
      },
      post: {
        tags: ["Super Admin"],
        summary: "สร้างหรือลงทะเบียนสาขาใหม่",
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/admin/database": {
      post: {
        tags: ["Super Admin"],
        summary: "รันคำสั่ง Migration หรือ SQL ข้าม D1 สาขา (Super Admin Only)",
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } } }
      }
    },
    "/backup": {
      get: {
        tags: ["Super Admin", "Notifications & Settings"],
        summary: "สร้างและดาวน์โหลดไฟล์สำรองข้อมูล Snapshot ของฐานข้อมูล D1",
        responses: { "200": { description: "ไฟล์ JSON Backup ของตารางทั้งหมด" } }
      }
    }
  }
};

const targetDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(path.join(targetDir, 'openapi.json'), JSON.stringify(openapi, null, 2), 'utf-8');
console.log('✅ Generated public/openapi.json successfully');

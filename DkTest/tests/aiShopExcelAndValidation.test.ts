import { describe, expect, it } from "vitest";
import {
  autoGuessColumnMapping,
  buildExcelImportPreview,
  parseFlexibleDateToIso,
  parseNullablePriceVnd,
} from "../src/services/aiShop/excelHelper";
import { buildSeedServiceRecords } from "../src/services/aiShop/initialCatalog";
import {
  createOrderSchema,
  createPaymentSchema,
  updateOrderSchema,
} from "../server/services/aiShopService";
import type { AiCustomer, AiOrder } from "../src/types/aiShop";

const NOW = "2026-11-22T05:00:00.000Z";

describe("AI Shop Excel Import & Server Validation", () => {
  it("parses dd/mm/yyyy, yyyy-mm-dd, and Excel serial dates accurately", () => {
    expect(parseFlexibleDateToIso("22/11/2026")).toBe("2026-11-22");
    expect(parseFlexibleDateToIso("2026-01-31")).toBe("2026-01-31");
    expect(parseFlexibleDateToIso("31/02/2026")).toBe("");
    // 46023 = 2026-01-01 in Excel serial date
    expect(parseFlexibleDateToIso(46023)).toBe("2026-01-01");
  });

  it("parses integer VND and shorthand like 185k, keeping empty prices as null", () => {
    expect(parseNullablePriceVnd("")).toBeNull();
    expect(parseNullablePriceVnd("   ")).toBeNull();
    expect(parseNullablePriceVnd("185k")).toBe(185000);
    expect(parseNullablePriceVnd("15.000đ")).toBe(15000);
    expect(parseNullablePriceVnd(25000)).toBe(25000);
  });

  it("deduplicates existing customers and skips duplicate orders on re-import", () => {
    const services = buildSeedServiceRecords(NOW);
    const existingCustomers: AiCustomer[] = [
      {
        id: "cust_1",
        customerCode: "KH0001",
        fullName: "Trần Bình",
        phoneZalo: "0909111222",
        email: "binh@gmail.com",
        note: "",
        status: "active",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];

    const headers = [
      "Tên khách hàng",
      "SĐT / Zalo",
      "Dịch vụ",
      "Tài khoản / Slot",
      "Ngày mua",
      "Giá kỳ đầu",
      "Giá kỳ sau",
      "Đã thu",
    ];
    const mapping = autoGuessColumnMapping(headers);

    const rows = [
      {
        "Tên khách hàng": "Trần Bình",
        "SĐT / Zalo": "0909111222",
        "Dịch vụ": "Gemini Pro slot lỏm",
        "Tài khoản / Slot": "gem01@gmail.com",
        "Ngày mua": "15/11/2026",
        "Giá kỳ đầu": "15k",
        "Giá kỳ sau": "5k",
        "Đã thu": "15000",
      },
      // Exact duplicate row inside same sheet
      {
        "Tên khách hàng": "Trần Bình",
        "SĐT / Zalo": "0909111222",
        "Dịch vụ": "Gemini Pro slot lỏm",
        "Tài khoản / Slot": "gem01@gmail.com",
        "Ngày mua": "15/11/2026",
        "Giá kỳ đầu": "15k",
        "Giá kỳ sau": "5k",
        "Đã thu": "15000",
      },
      // Row missing price for custom service -> MUST flag error, never fabricate price
      {
        "Tên khách hàng": "Lê Hoa",
        "SĐT / Zalo": "0988777666",
        "Dịch vụ": "Gói khác (báo giá riêng)",
        "Tài khoản / Slot": "hoa@gmail.com",
        "Ngày mua": "16/11/2026",
        "Giá kỳ đầu": "",
        "Giá kỳ sau": "",
        "Đã thu": "",
      },
    ];

    const preview1 = buildExcelImportPreview(rows, mapping, existingCustomers, services, []);
    expect(preview1[0].errors).toEqual([]);
    expect(preview1[0].existingCustomerId).toBe("cust_1");
    expect(preview1[0].isDuplicateOrder).toBe(false);
    expect(preview1[0].firstCyclePriceVnd).toBe(15000);
    expect(preview1[0].recurringPriceVnd).toBe(5000);

    // Second identical row in same import is detected as duplicate
    expect(preview1[1].isDuplicateOrder).toBe(true);

    // Third row has no price -> error (never fabricated!)
    expect(preview1[2].errors.some((e) => e.includes("giá kỳ đầu"))).toBe(true);

    // Re-importing after row 0 already exists in orders skips it cleanly
    const existingOrders: AiOrder[] = [
      {
        id: "ord_1",
        orderCode: "DH-1",
        customerId: "cust_1",
        customerCodeSnapshot: "KH0001",
        serviceId: "svc_gemini_pro_slot_lom",
        serviceNameSnapshot: "Gemini Pro slot lỏm",
        serviceConditionsSnapshot: "",
        accountSlot: "gem01@gmail.com",
        quantity: 1,
        startDate: "2026-11-15",
        stopDate: null,
        billingType: "monthly",
        firstCyclePriceVnd: 15000,
        recurringPriceVnd: 5000,
        durationValue: 1,
        durationUnit: "months",
        note: "",
        source: "excel_import",
        fulfillmentStatus: "delivered",
        importRowKey: preview1[0].importRowKey,
        createdByUid: "admin",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const preview2 = buildExcelImportPreview(
      [rows[0]],
      mapping,
      existingCustomers,
      services,
      existingOrders
    );
    expect(preview2[0].isDuplicateOrder).toBe(true);
  });

  it("enforces strict integer VND and valid YYYY-MM-DD dates in server Zod schemas", () => {
    expect(() =>
      createOrderSchema.parse({
        customerId: "c1",
        serviceId: "s1",
        quantity: 1,
        startDate: "2026-02-30", // invalid date
        billingType: "one_time",
        firstCyclePriceVnd: 50000,
      })
    ).toThrow();

    expect(() =>
      createPaymentSchema.parse({
        orderId: "o1",
        paidDate: "2026-11-22",
        amountVnd: 15000.5, // non-integer VND rejected
        method: "bank_transfer",
      })
    ).toThrow();

    expect(() =>
      createPaymentSchema.parse({
        orderId: "o1",
        paidDate: "2026-11-22",
        amountVnd: 0, // must be > 0
        method: "cash",
      })
    ).toThrow();

    const okUpdate = updateOrderSchema.parse({
      serviceId: "svc_new",
      confirmServiceChange: true,
      firstCyclePriceVnd: 25000,
    });
    expect(okUpdate.confirmServiceChange).toBe(true);
  });
});

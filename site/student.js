(function initStudentInsuranceDemo(global) {
  "use strict";

  const STORAGE_KEY = "student-insurance-demo-v1";
  const SESSION_KEY = "student-insurance-demo-role-v1";
  const PROFILE_KEY = "student-insurance-demo-profile-v1";
  const BUSINESS_DATE = "2026-10-25";
  const ROLES = ["student-parent", "insurer", "regulator", "school"];
  const ROLE_LABELS = {
    "student-parent": "學生／家長",
    insurer: "保險公司",
    regulator: "政府監管",
    school: "學校",
  };
  const ROLE_DESCRIPTIONS = {
    "student-parent": "查看醫保政策、比較多家公司的自願學平險並提交演示申請。",
    insurer: "建立自家學平險商品、管理演示核保與理賠隊列；不能核保自家商品。",
    regulator: "處理商品演示審核並查看跨區聚合報表；不查看學生個資。",
    school: "查看本校合成聚合報表與一般保障指引，不查看個人申請或醫療資料。",
  };
  const REGIONS = [
    { id: "SYN-REGION-A", name: "合成地區A", policyVersion: "合成指引版本 A-2026" },
    { id: "SYN-REGION-B", name: "合成地區B", policyVersion: "合成指引版本 B-2026" },
    { id: "SYN-REGION-C", name: "合成地區C", policyVersion: "合成指引版本 C-2026" },
  ];
  const YEARS = ["2026-2027", "2025-2026"];
  const INSURER_SEED = [
    { id: "SYN-INSURER-A", label: "演示保險機構A" },
    { id: "SYN-INSURER-B", label: "演示保險機構B" },
    { id: "SYN-INSURER-C", label: "演示保險機構C" },
  ];
  const INSURERS = INSURER_SEED.map(row => row.id);
  const SCHOOL_SEED = ["SYN-SCHOOL-A", "SYN-SCHOOL-B", "SYN-SCHOOL-C", "SYN-SCHOOL-D"];
  const COVERAGE_TYPES = ["意外傷害", "意外醫療", "疾病住院"];
  const PRODUCT_STATES = ["draft", "pending-review", "returned", "approved", "rejected", "published", "withdrawn"];
  const STATE_LABELS = {
    draft: "演示草稿",
    "pending-review": "待演示審核",
    returned: "演示退回修改",
    approved: "已通過演示審核（非真實批准）",
    rejected: "演示審核拒絕",
    published: "已演示發布",
    withdrawn: "已撤出演示發布",
  };
  const LEGACY_PRODUCT_IDS = { "STU-ACC-01": "SYN-PROD-101", "STU-ACC-02": "SYN-PROD-102" };
  const LEGACY_INSURER_IDS = {
    "合成保險機構甲": "SYN-INSURER-A", "合成保險機構乙": "SYN-INSURER-B",
    "演示保險機構甲": "SYN-INSURER-A", "演示保險機構乙": "SYN-INSURER-B",
  };
  const LEGACY_PRODUCT_SEED = [
    {
      id: "STU-ACC-01", insurer: "演示保險機構甲", name: "學生意外補充示例方案",
      version: "合成條款 V1（待核實）", benefit: "意外傷害、意外醫療（合成責任示例；不表示疾病住院保障）",
      limit: "示例額度 20,000 元", term: "示例期間：按演示學年列示，非實際保障期",
      exclusions: "以合成條款摘要為例；實際責任、免責及理賠條件須查核正式條款",
      source: "無真實銷售來源；演示產品，不代表可投保", published: true,
    },
    {
      id: "STU-ACC-02", insurer: "演示保險機構乙", name: "學生綜合補充示例方案",
      version: "合成條款 V2（待核實）", benefit: "意外傷害、意外醫療及疾病住院（合成條款示例）",
      limit: "示例額度 50,000 元", term: "示例期間：按演示學年列示，非實際保障期",
      exclusions: "以合成條款摘要為例；不構成承保、除外或賠付判斷",
      source: "無真實銷售來源；演示產品，不代表可投保", published: true,
    },
  ];
  function migrateLegacyProduct(row) {
    const insurer = LEGACY_INSURER_IDS[row?.insurer];
    const seed = LEGACY_PRODUCT_SEED.find(item =>
      item.id === row?.id && LEGACY_INSURER_IDS[item.insurer] === insurer);
    if (!seed || !insurer) return null;
    const { limit, ...legacyFields } = seed;
    const { limit: savedLegacyLimit, ...savedFields } = row;
    const state = row.published ? "published" : "withdrawn";
    return {
      ...legacyFields,
      ...savedFields,
      id: LEGACY_PRODUCT_IDS[row.id],
      legacyId: row.id,
      insurer,
      limitAmount: seed.id === "STU-ACC-01" ? 20000 : 50000,
      limitUnit: "元/人",
      feeAmount: seed.id === "STU-ACC-01" ? 68 : 128,
      feeUnit: "元/人/演示學年",
      coverageTypes: seed.id === "STU-ACC-01" ? ["意外傷害", "意外醫療"] : [...COVERAGE_TYPES],
      versionNumber: 1,
      status: state,
      published: state === "published",
      reviewNote: "舊存檔狀態僅映射為合成演示目錄狀態，不代表真實審批。",
      reviewHistory: [{ status: state, date: BUSINESS_DATE, note: "舊存檔相容遷移；合成狀態，非真實審批。" }],
      revisionOf: null,
    };
  }
  function makeProduct(fields) {
    const status = fields.status || "draft";
    return {
      ...fields,
      source: fields.source || "合成條款來源 SYN-SOURCE-01；無真實銷售來源",
      versionNumber: fields.versionNumber || 1,
      limitUnit: fields.limitUnit || "元/人",
      feeUnit: fields.feeUnit || "元/人/演示學年",
      coverageTypes: fields.coverageTypes || [],
      status,
      published: status === "published",
      reviewNote: fields.reviewNote || "",
      reviewHistory: fields.reviewHistory || [{
        status, date: BUSINESS_DATE, note: "固定合成演示狀態；不代表真實監管審批。",
      }],
      revisionOf: fields.revisionOf || null,
    };
  }
  function makeSeedProduct(row) {
    const fields = { ...migrateLegacyProduct(row) };
    delete fields.legacyId;
    return makeProduct({
      ...fields,
      id: { "STU-ACC-01": "SYN-PROD-001", "STU-ACC-02": "SYN-PROD-002" }[row.id],
      reviewHistory: undefined,
    });
  }
  const PRODUCT_SEED = [
    makeSeedProduct(LEGACY_PRODUCT_SEED[0]),
    makeSeedProduct(LEGACY_PRODUCT_SEED[1]),
    makeProduct({
      id: "SYN-PROD-003", insurer: "SYN-INSURER-A", name: "意外保障示例方案A-2",
      benefit: "責任類別示例：意外傷害、意外醫療；完整責任以合成條款摘要為準。",
      limitAmount: 12000, feeAmount: 55, term: "2026-2027 合成演示學年（非實際保障期）",
      exclusions: "合成除外責任摘要；不構成承保、除外或賠付判斷。",
      version: "合成條款示例 A-2", coverageTypes: ["意外傷害", "意外醫療"], status: "draft",
      source: "SYN-SOURCE-A2；無真實銷售來源。",
    }),
    makeProduct({
      id: "SYN-PROD-004", insurer: "SYN-INSURER-B", name: "綜合責任示例方案B-2",
      benefit: "責任類別示例：意外傷害、意外醫療、疾病住院；僅為合成摘要。",
      limitAmount: 36000, feeAmount: 116, term: "2026-2027 合成演示學年（非實際保障期）",
      exclusions: "合成除外責任摘要；不構成承保、除外或賠付判斷。",
      version: "合成條款示例 B-2", coverageTypes: [...COVERAGE_TYPES], status: "pending-review",
      source: "SYN-SOURCE-B2；無真實銷售來源。",
    }),
    makeProduct({
      id: "SYN-PROD-005", insurer: "SYN-INSURER-C", name: "意外補充示例方案C-1",
      benefit: "責任類別示例：意外傷害；僅為合成摘要。",
      limitAmount: 9000, feeAmount: 42, term: "2026-2027 合成演示學年（非實際保障期）",
      exclusions: "合成除外責任摘要；不構成承保、除外或賠付判斷。",
      version: "合成條款示例 C-1", coverageTypes: ["意外傷害"], status: "withdrawn",
      source: "SYN-SOURCE-C1；無真實銷售來源。",
    }),
    makeProduct({
      id: "SYN-PROD-006", insurer: "SYN-INSURER-C", name: "意外補充示例方案C-2",
      benefit: "責任類別示例：意外傷害、意外醫療；僅為合成摘要。",
      limitAmount: 15000, feeAmount: 64, term: "2026-2027 合成演示學年（非實際保障期）",
      exclusions: "合成除外責任摘要；不構成承保、除外或賠付判斷。",
      version: "合成條款示例 C-2", versionNumber: 2, coverageTypes: ["意外傷害", "意外醫療"],
      status: "published", revisionOf: "SYN-PROD-005",
      source: "SYN-SOURCE-C2；無真實銷售來源。",
    }),
    makeProduct({
      id: "SYN-PROD-007", insurer: "SYN-INSURER-A", name: "疾病住院補充示例方案A-3",
      benefit: "責任類別示例：疾病住院；僅為合成摘要。",
      limitAmount: 22000, feeAmount: 87, term: "2026-2027 合成演示學年（非實際保障期）",
      exclusions: "合成除外責任摘要；不構成承保、除外或賠付判斷。",
      version: "合成條款示例 A-3", coverageTypes: ["疾病住院"], status: "returned",
      reviewNote: "合成退回原因：來源版本欄位待補。",
      source: "SYN-SOURCE-A3；無真實銷售來源。",
    }),
    makeProduct({
      id: "SYN-PROD-008", insurer: "SYN-INSURER-B", name: "意外補充示例方案B-3",
      benefit: "責任類別示例：意外傷害、意外醫療；僅為合成摘要。",
      limitAmount: 18000, feeAmount: 73, term: "2026-2027 合成演示學年（非實際保障期）",
      exclusions: "合成除外責任摘要；不構成承保、除外或賠付判斷。",
      version: "合成條款示例 B-3", coverageTypes: ["意外傷害", "意外醫療"], status: "rejected",
      reviewNote: "合成拒絕原因：條款版本標記不完整。",
      source: "SYN-SOURCE-B3；無真實銷售來源。",
    }),
    makeProduct({
      id: "SYN-PROD-009", insurer: "SYN-INSURER-C", name: "醫療補充示例方案C-3",
      benefit: "責任類別示例：意外醫療、疾病住院；僅為合成摘要。",
      limitAmount: 28000, feeAmount: 102, term: "2026-2027 合成演示學年（非實際保障期）",
      exclusions: "合成除外責任摘要；不構成承保、除外或賠付判斷。",
      version: "合成條款示例 C-3", coverageTypes: ["意外醫療", "疾病住院"], status: "approved",
      reviewNote: "合成审核通过，可发布；不代表真实监管批准。",
      source: "SYN-SOURCE-C3；無真實銷售來源。",
    }),
  ];
  const REPORT_MONTHS = [
    "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
    "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
  ];
  const AGE_BANDS = ["未滿14歲（合成測試分組）", "14-17歲（合成測試分組）", "18+（合成測試分組）"];
  const LEGACY_MINOR_AGE_BAND = "未滿18歲（舊版合成分組）";
  const LEGACY_ADULT_AGE_BANDS = ["18歲以上", AGE_BANDS[2]];
  const APPLICATION_STATES = [
    "pending-underwriting", "supplement-requested", "resubmitted",
    "approved-awaiting-payment", "rejected", "paid-effective", "legacy-existing",
  ];
  const CLAIM_STATES = [
    "submitted", "reviewing", "supplement-requested", "resubmitted",
    "approved", "partial-approved", "rejected", "paid", "closed",
  ];
  const APP_SUPPLEMENT_ITEMS = [
    { id: "SYN-MATERIAL-APP-01", label: "材料項1" },
    { id: "SYN-MATERIAL-APP-02", label: "材料項2" },
  ];
  const CLAIM_SUPPLEMENT_ITEMS = [
    { id: "SYN-MATERIAL-CLAIM-01", label: "材料項1" },
    { id: "SYN-MATERIAL-CLAIM-02", label: "材料項2" },
  ];
  const SYNTHETIC_DATA_NOTICE = "合成演示，不可作經營、參保、監管或承保結論";
  const UNDERWRITING_REASONS = ["合成演示核保通過", "合成演示核保未通過"];
  const PRODUCT_REVIEW_REASONS = [
    "合成審核通過：欄位示例完整",
    "合成退回：請補齊條款來源版本",
    "合成拒絕：示例資料未滿足演示規則",
  ];
  const CLAIM_DECISION_REASONS = [
    "合成演示結論：依示例條款記錄",
    "合成演示結論：部分金額示例",
    "合成演示結論：示例責任不匹配",
  ];
  const PROFILE_SEED = [
    { id: "SYN-STU-0001", displayName: "演示學生A-001", ageBand: AGE_BANDS[2], schoolId: "SYN-SCHOOL-A", cohortId: "SYN-COHORT-01", regionId: "SYN-REGION-A", guardianId: null },
    { id: "SYN-STU-0002", displayName: "演示學生A-002", ageBand: AGE_BANDS[0], schoolId: "SYN-SCHOOL-A", cohortId: "SYN-COHORT-02", regionId: "SYN-REGION-A", guardianId: "SYN-GUARDIAN-0001" },
    { id: "SYN-STU-0003", displayName: "演示學生B-001", ageBand: AGE_BANDS[1], schoolId: "SYN-SCHOOL-B", cohortId: "SYN-COHORT-03", regionId: "SYN-REGION-B", guardianId: "SYN-GUARDIAN-0002" },
    { id: "SYN-STU-0004", displayName: "演示學生C-001", ageBand: AGE_BANDS[2], schoolId: "SYN-SCHOOL-C", cohortId: "SYN-COHORT-04", regionId: "SYN-REGION-C", guardianId: null },
    { id: "SYN-STU-0005", displayName: "演示學生D-001", ageBand: AGE_BANDS[1], schoolId: "SYN-SCHOOL-D", cohortId: "SYN-COHORT-05", regionId: "SYN-REGION-B", guardianId: "SYN-GUARDIAN-0003" },
    { id: "SYN-STU-0006", displayName: "演示學生B-002", ageBand: AGE_BANDS[0], schoolId: "SYN-SCHOOL-B", cohortId: "SYN-COHORT-06", regionId: "SYN-REGION-B", guardianId: "SYN-GUARDIAN-0004" },
  ];
  const GUARDIAN_SEED = [
    { id: "SYN-GUARDIAN-0001", studentId: "SYN-STU-0002", active: true, relationshipCode: "合成代理關係A" },
    { id: "SYN-GUARDIAN-0002", studentId: "SYN-STU-0003", active: true, relationshipCode: "合成代理關係B" },
    { id: "SYN-GUARDIAN-0003", studentId: "SYN-STU-0005", active: true, relationshipCode: "合成代理關係C" },
    { id: "SYN-GUARDIAN-0004", studentId: "SYN-STU-0006", active: true, relationshipCode: "合成代理關係D" },
  ];
  const GOVERNMENT_REPORT_FIXTURE = {
    policyGuide: REGIONS.flatMap(region => YEARS.map((schoolYear, yearIndex) => ({
      regionId: region.id, schoolYear,
      version: `${region.policyVersion}${yearIndex ? "（歷史合成版本）" : ""}`,
      status: "合成政策指引占位；待當地權威來源確認",
    }))),
    monthly: [
      [18, 11, 7, 4, 2], [22, 14, 8, 5, 3], [27, 16, 11, 6, 3],
      [24, 15, 9, 5, 4], [31, 19, 12, 7, 4], [35, 21, 14, 8, 5],
      [42, 25, 17, 10, 6], [39, 24, 15, 9, 6], [47, 29, 18, 12, 7],
      [51, 31, 20, 13, 8], [58, 35, 23, 15, 9], [64, 39, 25, 17, 10],
    ].map(([applications, underwritten, policies, claims, closedClaims], index) => ({
      month: REPORT_MONTHS[index], schoolYear: index < 3 ? YEARS[1] : YEARS[0],
      applications, underwritten, policies, claims, closedClaims,
    })),
    geography: [
      { regionId: "SYN-REGION-A", guideViews: 462, productViews: 318, applications: 47, policies: 21, claims: 18 },
      { regionId: "SYN-REGION-B", guideViews: 337, productViews: 246, applications: 33, policies: 15, claims: 13 },
      { regionId: "SYN-REGION-C", guideViews: 281, productViews: 194, applications: 26, policies: 12, claims: 11 },
    ],
    companies: INSURER_SEED.map((company, index) => ({
      insurerId: company.id,
      productVersions: [6, 5, 7][index],
      published: [3, 2, 2][index],
      pendingReview: [1, 2, 1][index],
      applications: [58, 47, 39][index],
      underwriting: [41, 32, 25][index],
      policies: [26, 19, 16][index],
      claims: [21, 17, 14][index],
    })),
    lifecycle: [
      { state: "pending-underwriting", applications: 3 },
      { state: "supplement-requested", applications: 2 },
      { state: "resubmitted", applications: 2 },
      { state: "approved-awaiting-payment", applications: 2 },
      { state: "rejected", applications: 2 },
      { state: "paid-effective", applications: 3 },
    ],
    claimLifecycle: [
      { state: "submitted", claims: 8 }, { state: "reviewing", claims: 7 },
      { state: "supplement-requested", claims: 5 }, { state: "resubmitted", claims: 4 },
      { state: "approved", claims: 9 }, { state: "partial-approved", claims: 6 },
      { state: "rejected", claims: 5 }, { state: "paid", claims: 12 }, { state: "closed", claims: 21 },
    ],
  };
  const SCHOOL_REPORT_FIXTURE = {
    schoolId: "SYN-SCHOOL-A",
    sampleThreshold: 5,
    monthly: [
      [48, 34, 19, 41], [53, 38, 22, 45], [59, 43, 26, 49], [56, 40, 24, 47],
      [64, 46, 28, 54], [72, 51, 34, 61], [81, 58, 39, 68], [77, 55, 37, 64],
      [86, 62, 43, 73], [91, 67, 47, 79], [98, 71, 51, 85], [104, 76, 56, 92],
    ].map(([policyViews, intentions, productReads, noticeReads], index) => ({
      month: REPORT_MONTHS[index], schoolYear: index < 3 ? YEARS[1] : YEARS[0],
      policyViews, intentions, productReads, noticeReads,
    })),
    notices: [
      { id: "SYN-NOTICE-01", name: "學生醫保政策查核提示", status: "演示完成", audience: 312, reached: 298, read: 236 },
      { id: "SYN-NOTICE-02", name: "學平險自願選購說明", status: "演示進行中", audience: 312, reached: 287, read: 194 },
      { id: "SYN-NOTICE-03", name: "新學年保障資訊提醒", status: "演示待開始", audience: 312, reached: 0, read: 0 },
      { id: "SYN-NOTICE-04", name: "保障條款核對提示", status: "演示完成", audience: 312, reached: 301, read: 252 },
    ],
    cohorts: [
      { id: "SYN-COHORT-01", policyViews: 31, intentions: 25, productReads: 16, noticeReads: 29 },
      { id: "SYN-COHORT-02", policyViews: 28, intentions: 22, productReads: 14, noticeReads: 26 },
      { id: "SYN-COHORT-03", policyViews: 34, intentions: 27, productReads: 19, noticeReads: 32 },
      { id: "SYN-COHORT-04", policyViews: 29, intentions: 23, productReads: 15, noticeReads: 27 },
      { id: "SYN-COHORT-05", policyViews: 38, intentions: 30, productReads: 21, noticeReads: 35 },
      { id: "SYN-COHORT-06", policyViews: 32, intentions: 26, productReads: 17, noticeReads: 30 },
    ],
  };
  const MENUS = {
    "student-parent": [
      ["home", "保障 Marketplace", "總"], ["guide", "學生醫保政策", "醫"],
      ["products", "學平險 Marketplace", "險"],
    ],
    insurer: [["home", "商品與業務流程", "品"]],
    regulator: [["home", "審核與整體報表", "政"]],
    school: [["home", "本校合成報表", "校"]],
  };
  const PAGE_LABELS = Object.fromEntries(Object.values(MENUS).flat().map(([id, label]) => [id, label]));
  const WALKTHROUGH = [
    {
      role: "student-parent", page: "login", selector: '.role-card[data-role-card="student-parent"]',
      title: "進入學生／家長入口", text: "在首頁選「學生／家長」。此角色可查看醫保指引及自願學平險，不是真實身份登入。", done: "已進入學生工作台",
    },
    {
      role: "student-parent", page: "guide", selector: '[data-context-select]',
      title: "查看學生醫保政策", text: "選擇合成地區與學年，核對政策指引提示；實際資格、辦理與待遇須向所在地官方查證。", done: "已看到合成政策入口",
    },
    {
      role: "student-parent", page: "products", selector: '[data-compare-product]',
      title: "瀏覽自願學平險", text: "比較多家演示公司的責任、限額與費用示例、除外、期限及來源；提交申請不等於承保。", done: "已查看可選商品",
    },
    {
      role: "insurer", page: "home", selector: "#product-workflow",
      title: "商品上架與核保隊列", text: "保險公司先保存完整草稿並提交合成審核；通過後才能發布。指定的另一演示公司處理核保，發布公司不得核保自己的商品。", done: "已看到商品與核保生命周期",
    },
    {
      role: "regulator", page: "home", selector: "#product-review-queue",
      title: "監管角色審核商品", text: "只對待審合成商品選通過、退回或拒絕及固定原因；這不是實際監管批准。", done: "已看到待審隊列與聚合報表",
    },
    {
      role: "student-parent", page: "products", selector: "#claim-flow",
      title: "模擬繳費、保單與理賠", text: "核保通過後仍需明確確認模擬繳費才生成演示保單；只有演示保單可報案。理賠可補充、形成合成結論、模擬支付並結案。", done: "已了解各狀態彼此分開",
    },
    {
      role: "school", page: "home", selector: "#school-info",
      title: "學校查看本校匯總", text: "學校只看固定合成的本校政策閱讀、意向、資訊閱讀和通知統計，沒有個人保單或理賠明細。", done: "已看到本校聚合與隱私邊界",
    },
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function insurerLabel(id) { return INSURER_SEED.find(row => row.id === id)?.label || id; }
  function schoolLabel(id) { return id.replace("SYN-SCHOOL-", "演示學校"); }
  function nextId(rows, prefix) {
    const largest = rows.reduce((max, row) => {
      const suffix = row.id.slice(prefix.length);
      const number = Number(suffix.replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    return `${prefix}${String(largest + 1).padStart(4, "0")}`;
  }
  function nextInsurer(ownerId) {
    const index = INSURERS.indexOf(ownerId);
    return INSURERS[(index + 1) % INSURERS.length];
  }
  function productSnapshot(row) {
    return {
      id: row.id, insurer: row.insurer, name: row.name, benefit: row.benefit,
      limitAmount: row.limitAmount, limitUnit: row.limitUnit, feeAmount: row.feeAmount,
      feeUnit: row.feeUnit, term: row.term, exclusions: row.exclusions,
      version: row.version, versionNumber: row.versionNumber, source: row.source,
      coverageTypes: [...row.coverageTypes], revisionOf: row.revisionOf,
    };
  }
  function makeSeedApplications() {
    const rows = [
      ["SYN-APP-0001", "SYN-STU-0002", "SYN-PROD-001", "pending-underwriting", 0],
      ["SYN-APP-0002", "SYN-STU-0004", "SYN-PROD-002", "supplement-requested", 1],
      ["SYN-APP-0003", "SYN-STU-0004", "SYN-PROD-006", "resubmitted", 2],
      ["SYN-APP-0004", "SYN-STU-0004", "SYN-PROD-001", "approved-awaiting-payment", 3],
      ["SYN-APP-0005", "SYN-STU-0001", "SYN-PROD-002", "rejected", 4],
      ["SYN-APP-0006", "SYN-STU-0001", "SYN-PROD-001", "paid-effective", 5],
      ["SYN-APP-0007", "SYN-STU-0003", "SYN-PROD-002", "paid-effective", 6],
      ["SYN-APP-0008", "SYN-STU-0005", "SYN-PROD-006", "pending-underwriting", 7],
      ["SYN-APP-0009", "SYN-STU-0006", "SYN-PROD-001", "supplement-requested", 8],
      ["SYN-APP-0010", "SYN-STU-0005", "SYN-PROD-002", "resubmitted", 9],
      ["SYN-APP-0011", "SYN-STU-0002", "SYN-PROD-002", "approved-awaiting-payment", 10],
      ["SYN-APP-0012", "SYN-STU-0006", "SYN-PROD-006", "rejected", 11],
    ];
    return rows.map(([id, profileId, productId, status, monthIndex]) => {
      const plan = PRODUCT_SEED.find(row => row.id === productId);
      const profile = PROFILE_SEED.find(row => row.id === profileId);
      const supplements = status === "supplement-requested" || status === "resubmitted"
        ? [APP_SUPPLEMENT_ITEMS[monthIndex % APP_SUPPLEMENT_ITEMS.length].id] : [];
      return {
        id, profileId, productId, productSnapshot: productSnapshot(plan), productVersion: plan.version,
        assignedUnderwriterId: nextInsurer(plan.insurer), status, consent: true,
        createdMonth: REPORT_MONTHS[monthIndex], regionId: profile.regionId,
        schoolYear: monthIndex < 3 ? YEARS[1] : YEARS[0], source: "固定合成演示案例",
        requestedSupplementIds: supplements,
        submittedSupplementIds: status === "resubmitted" ? [...supplements] : [],
        underwritingDecision: status === "rejected"
          ? { code: "rejected", note: UNDERWRITING_REASONS[1], month: REPORT_MONTHS[monthIndex] }
          : status === "approved-awaiting-payment" || status === "paid-effective"
            ? { code: "approved", note: UNDERWRITING_REASONS[0], month: REPORT_MONTHS[monthIndex] } : null,
        payment: null, policyId: null,
      };
    });
  }
  function makeSeedPolicies(applications) {
    return applications.filter(row => row.status === "paid-effective").map((app, index) => {
      const paymentId = `SYN-PAY-${String(index + 1).padStart(4, "0")}`;
      const policyId = `SYN-POL-${String(index + 1).padStart(4, "0")}`;
      const policy = {
        id: policyId, applicationId: app.id, profileId: app.profileId, productId: app.productId,
        insurer: app.productSnapshot.insurer, productSnapshot: clone(app.productSnapshot),
        status: "demo-effective", effectiveDemo: true,
        payment: { id: paymentId, status: "paid-demo", amount: app.productSnapshot.feeAmount, month: app.createdMonth },
        createdMonth: app.createdMonth,
      };
      app.payment = clone(policy.payment);
      app.policyId = policyId;
      return policy;
    });
  }
  function makeSeedClaims(policies) {
    const policyA = policies[0], policyB = policies[1];
    const rows = [
      ["SYN-CLAIM-0001", policyA.id, "意外傷害", "2025-11", 680, "submitted"],
      ["SYN-CLAIM-0002", policyA.id, "意外醫療", "2025-12", 920, "reviewing"],
      ["SYN-CLAIM-0003", policyA.id, "疾病住院條款示例", "2026-01", 1460, "supplement-requested"],
      ["SYN-CLAIM-0004", policyA.id, "意外傷害", "2026-02", 530, "resubmitted"],
      ["SYN-CLAIM-0005", policyB.id, "意外醫療", "2026-03", 1180, "approved"],
      ["SYN-CLAIM-0006", policyB.id, "疾病住院條款示例", "2026-04", 2040, "partial-approved"],
      ["SYN-CLAIM-0007", policyB.id, "意外傷害", "2026-05", 740, "rejected"],
      ["SYN-CLAIM-0008", policyA.id, "意外醫療", "2026-06", 990, "paid"],
      ["SYN-CLAIM-0009", policyB.id, "意外傷害", "2026-07", 560, "closed"],
    ];
    return rows.map(([id, policyId, category, eventMonth, claimedAmount, status], index) => {
      const policy = policies.find(row => row.id === policyId);
      const decided = ["approved", "partial-approved", "rejected", "paid", "closed"].includes(status);
      const decision = !decided ? null : {
        code: status === "paid" || status === "closed" ? "approved" : status,
        amount: status === "partial-approved" ? Math.floor(claimedAmount / 2)
          : status === "rejected" ? 0 : claimedAmount,
        reason: status === "partial-approved" ? CLAIM_DECISION_REASONS[1]
          : status === "rejected" ? CLAIM_DECISION_REASONS[2] : CLAIM_DECISION_REASONS[0],
        month: eventMonth,
      };
      const needsMaterials = status === "supplement-requested" || status === "resubmitted";
      const materials = needsMaterials ? [{
        id: CLAIM_SUPPLEMENT_ITEMS[index % CLAIM_SUPPLEMENT_ITEMS.length].id,
        status: status === "resubmitted" ? "已勾選演示補充（未上傳文件）" : "待演示補充",
      }] : [{ id: "SYN-MATERIAL-CLAIM-01", status: "清單占位（無上傳文件）" }];
      const payment = status === "paid" || (status === "closed" && decision?.amount > 0)
        ? { id: `SYN-CLM-PAY-${String(index + 1).padStart(4, "0")}`, status: "paid-demo", amount: decision.amount, month: eventMonth }
        : null;
      return {
        id, policyId, applicationId: policy.applicationId, profileId: policy.profileId,
        productId: policy.productId, insurer: policy.insurer, category, eventMonth,
        claimedAmount, materials, requestedSupplementIds: needsMaterials
          ? [materials[0].id] : [],
        status, decision, payment, closedMonth: status === "closed" ? eventMonth : null,
      };
    });
  }
  function createSeed() {
    const applications = makeSeedApplications();
    const policies = makeSeedPolicies(applications);
    return {
      schemaVersion: 3,
      meta: { synthetic: true, businessDate: BUSINESS_DATE, scenario: "student-insurance-demo" },
      context: { regionId: "SYN-REGION-A", schoolYear: YEARS[0] },
      profiles: clone(PROFILE_SEED),
      guardians: clone(GUARDIAN_SEED),
      products: clone(PRODUCT_SEED),
      applications,
      policies,
      claims: makeSeedClaims(policies),
      samplePolicies: [],
      legacyHistory: { policies: [], claims: [] },
      policyPresentation: { status: "合成政策指引占位；待當地權威來源確認", source: "未接入真實主管機關資料" },
      schoolBriefing: { reviewed: false, source: "僅固定合成示例；未實際發送" },
    };
  }
  function hasPersonalStyleInput(value) {
    return typeof value === "string" && (
      /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(value) ||
      /(?:\+?86[-\s]?)?1[3-9]\d{9}/.test(value) ||
      /\d{17}[\dXx]/.test(value) ||
      /(身份證|身份证|手機號|手机号|電話號碼|联系电话|家庭住址|病歷|病历|診斷|诊断|出生日期)/.test(value)
    );
  }
  function validateProduct(row) {
    if (!row || typeof row !== "object" || typeof row.name !== "string" ||
        typeof row.benefit !== "string" || typeof row.term !== "string" ||
        typeof row.exclusions !== "string" || typeof row.version !== "string" ||
        typeof row.source !== "string" || !Array.isArray(row.coverageTypes) ||
        !row.coverageTypes.every(value => COVERAGE_TYPES.includes(value))) return false;
    if (row.id && !/^SYN-PROD-\d{3,}$/.test(row.id)) return false;
    if (row.legacyId !== undefined && LEGACY_PRODUCT_IDS[row.legacyId] !== row.id) return false;
    if (!INSURERS.includes(row.insurer) || !PRODUCT_STATES.includes(row.status) ||
        row.published !== (row.status === "published") ||
        !Number.isInteger(row.versionNumber) || row.versionNumber < 1) return false;
    if (row.status !== "draft" &&
        (!row.name.trim() || !row.benefit.trim() || !row.term.trim() || !row.exclusions.trim() ||
          !row.version.trim() || !row.source.trim() || !row.coverageTypes.length ||
          !Number.isInteger(row.limitAmount) || row.limitAmount <= 0 ||
          !Number.isInteger(row.feeAmount) || row.feeAmount < 0 ||
          row.limitUnit !== "元/人" || row.feeUnit !== "元/人/演示學年")) return false;
    return ![row.name, row.benefit, row.term, row.exclusions, row.version, row.source].some(hasPersonalStyleInput);
  }
  function validate(db) {
    const errors = [];
    if (!db || typeof db !== "object" || db.schemaVersion !== 3 || !db.meta ||
        db.meta.synthetic !== true || db.meta.businessDate !== BUSINESS_DATE ||
        db.meta.scenario !== "student-insurance-demo") return ["資料版本或演示標記無效"];
    if (!db.context || !REGIONS.some(row => row.id === db.context.regionId) ||
        !YEARS.includes(db.context.schoolYear)) errors.push("地區或學年無效");
    const collections = ["profiles", "guardians", "products", "applications", "policies", "claims", "samplePolicies"];
    if (collections.some(key => !Array.isArray(db[key]))) return ["資料清單格式無效"];
    const uniqueIds = rows => rows.every(row => row && typeof row === "object" &&
      typeof row.id === "string" && row.id.startsWith("SYN-")) &&
      new Set(rows.map(row => row.id)).size === rows.length;
    const profiles = db.profiles, guardians = db.guardians, products = db.products;
    if (!uniqueIds(profiles) || profiles.some(row =>
      !row || typeof row !== "object" || !/^SYN-STU-(?:\d{4}|LEGACY-\d{3})$/.test(row.id) ||
      !/^(?:演示學生[A-D]-\d{3}|演示學生舊版-\d{3})$/.test(row.displayName) ||
      !(AGE_BANDS.includes(row.ageBand) || row.ageBand === LEGACY_MINOR_AGE_BAND) ||
      !SCHOOL_SEED.includes(row.schoolId) ||
      !/^SYN-COHORT-\d{2}$/.test(row.cohortId) || !REGIONS.some(region => region.id === row.regionId) ||
      !(row.guardianId === null || /^SYN-GUARDIAN-\d{4}$/.test(row.guardianId)))) errors.push("學生合成測試標記無效");
    if (!uniqueIds(guardians) || guardians.some(row =>
      !row || typeof row !== "object" || !/^SYN-GUARDIAN-\d{4}$/.test(row.id) || typeof row.active !== "boolean" ||
      !profiles.some(profile => profile.id === row.studentId && profile.guardianId === row.id &&
        profile.ageBand !== AGE_BANDS[2]) || typeof row.relationshipCode !== "string")) errors.push("合成代理關係無效");
    if (profiles.some(row => row?.guardianId !== null &&
        !guardians.some(guardian => guardian?.id === row?.guardianId && guardian?.studentId === row?.id))) errors.push("代理關係與合成學生不匹配");
    if (!uniqueIds(products) || products.some(row => !validateProduct(row))) errors.push("演示商品目錄或版本無效");
    for (const row of products) {
      if (!row || typeof row !== "object") continue;
      if (row.revisionOf && !products.some(previous => previous.id === row.revisionOf &&
          previous.insurer === row.insurer && previous.versionNumber < row.versionNumber)) errors.push("商品版本關係無效");
    }
    if (!uniqueIds(db.applications) || db.applications.some(app => {
      if (!app || typeof app !== "object") return true;
      const plan = products.find(row => row?.id === app.productId);
      const legacy = app.status === "legacy-existing";
      return !/^SYN-APP-[A-Z0-9-]+$/.test(app.id) ||
        !profiles.some(profile => profile.id === app.profileId) || !plan ||
        !APPLICATION_STATES.includes(app.status) || !INSURERS.includes(app.assignedUnderwriterId) ||
        (!legacy && app.assignedUnderwriterId === plan.insurer) ||
        !REPORT_MONTHS.includes(app.createdMonth) || !REGIONS.some(region => region.id === app.regionId) ||
        !YEARS.includes(app.schoolYear) || !app.productSnapshot ||
        JSON.stringify(app.productSnapshot) !== JSON.stringify(productSnapshot(plan)) &&
          !products.some(candidate => candidate.id === app.productId &&
            JSON.stringify(productSnapshot(candidate)) === JSON.stringify(app.productSnapshot)) ||
        (!legacy && app.consent !== true) ||
        (legacy && (typeof app.legacyStatus !== "string" ||
          (app.legacyId !== undefined &&
            (typeof app.legacyId !== "string" || !app.legacyId.startsWith("SYN-APP-"))))) ||
        !Array.isArray(app.requestedSupplementIds) || !Array.isArray(app.submittedSupplementIds);
    })) errors.push("申請或核保紀錄包含無效狀態、版本或參照");
    if (!uniqueIds(db.policies) || db.policies.some(policy => {
      if (!policy || typeof policy !== "object") return true;
      const app = db.applications.find(row => row?.id === policy.applicationId);
      return !/^SYN-POL-\d{4}$/.test(policy.id) || !app || policy.profileId !== app.profileId ||
        policy.productId !== app.productId || policy.insurer !== app.productSnapshot.insurer ||
        !policy.productSnapshot || JSON.stringify(policy.productSnapshot) !== JSON.stringify(app.productSnapshot) ||
        policy.status !== "demo-effective" || policy.effectiveDemo !== true ||
        !policy.payment || policy.payment.status !== "paid-demo" ||
        (app.status === "paid-effective" && app.policyId !== policy.id);
    })) errors.push("演示保單必須關聯核保完成及模擬繳費");
    if (db.applications.some(app => app?.status === "paid-effective" &&
        !db.policies.some(policy => policy.id === app.policyId && policy.applicationId === app.id))) errors.push("已繳費申請缺少演示保單");
    if (!uniqueIds(db.claims) || db.claims.some(claim => {
      if (!claim || typeof claim !== "object" || typeof claim.category !== "string") return true;
      const policy = db.policies.find(row => row?.id === claim.policyId);
      return !/^SYN-CLAIM-\d{4}$/.test(claim.id) || !policy ||
        claim.profileId !== policy.profileId || claim.productId !== policy.productId ||
        claim.insurer !== policy.insurer || !COVERAGE_TYPES.includes(claim.category.replace("條款示例", "")) ||
        !REPORT_MONTHS.includes(claim.eventMonth) || !Number.isInteger(claim.claimedAmount) ||
        claim.claimedAmount <= 0 || !CLAIM_STATES.includes(claim.status) ||
        !Array.isArray(claim.materials) || !Array.isArray(claim.requestedSupplementIds) ||
        (["approved", "partial-approved", "rejected", "paid", "closed"].includes(claim.status) && !claim.decision) ||
        (["paid", "closed"].includes(claim.status) && claim.decision?.amount > 0 && !claim.payment);
    })) errors.push("演示理賠紀錄狀態或有效保單參照無效");
    if (!uniqueIds(db.samplePolicies) || db.samplePolicies.some(row =>
      !row || typeof row !== "object" || row.status !== "legacy-not-effective" || row.effectiveDemo !== false ||
      (row.legacyId !== undefined &&
        (typeof row.legacyId !== "string" || !row.legacyId.startsWith("SYN-POL-"))) ||
      (row.legacyApplicationId !== undefined &&
        (typeof row.legacyApplicationId !== "string" || !row.legacyApplicationId.startsWith("SYN-APP-"))) ||
      !db.applications.some(app => app?.id === row.applicationId && app.status === "legacy-existing"))) errors.push("舊版樣例保單不得表示為有效保障");
    if (!db.policyPresentation || typeof db.policyPresentation.status !== "string" ||
        typeof db.policyPresentation.source !== "string" ||
        !db.schoolBriefing || typeof db.schoolBriefing.reviewed !== "boolean" ||
        db.schoolBriefing.source !== "僅固定合成示例；未實際發送") errors.push("政策或學校通知資料無效");
    if (db.legacyHistory !== undefined &&
        (!db.legacyHistory || !Array.isArray(db.legacyHistory.policies) ||
          !Array.isArray(db.legacyHistory.claims) ||
          [...db.legacyHistory.policies, ...db.legacyHistory.claims].some(row =>
            !row || typeof row.id !== "string" || !row.id.startsWith("SYN-") ||
            (row.legacyId !== undefined &&
              (typeof row.legacyId !== "string" || !row.legacyId.startsWith("SYN-"))) ||
            typeof row.status !== "string") ||
          [...db.legacyHistory.policies, ...db.legacyHistory.claims].some(row =>
            row.profileId !== null && row.profileId !== undefined &&
            !db.profiles.some(profile => profile.id === row.profileId)))
      ) errors.push("舊版演示歷史格式無效");
    return errors;
  }
  function diagnoseSave(raw) {
    let db;
    try {
      db = JSON.parse(raw);
    } catch {
      return {
        readableJson: false, schemaVersion: null, syntheticMarker: null,
        businessDateMatches: false, scenarioMatches: false, migrationValid: false,
        validationReason: "JSON 格式無法讀取",
      };
    }
    if (!db || typeof db !== "object" || Array.isArray(db)) {
      return {
        readableJson: true, schemaVersion: null, syntheticMarker: null,
        businessDateMatches: false, scenarioMatches: false, migrationValid: false,
        validationReason: "存檔根節點不是資料物件",
      };
    }
    let migrated;
    try {
      migrated = migrate(db);
    } catch {
      migrated = db;
    }
    const errors = validate(migrated);
    return {
      readableJson: true,
      schemaVersion: Number.isInteger(db.schemaVersion) ? db.schemaVersion : null,
      syntheticMarker: db.meta?.synthetic === true,
      businessDateMatches: db.meta?.businessDate === BUSINESS_DATE,
      scenarioMatches: db.meta?.scenario === "student-insurance-demo",
      scenarioMissing: db.meta?.scenario === undefined,
      migrationValid: errors.length === 0,
      validationReason: errors[0] || "",
    };
  }
  function migrate(db) {
    if (db?.schemaVersion === 3) {
      if (db.meta?.synthetic !== true ||
          ![undefined, "student-insurance-demo"].includes(db.meta?.scenario)) return db;
      const currentMarkers = clone(db);
      currentMarkers.meta = {
        ...currentMarkers.meta,
        businessDate: BUSINESS_DATE,
        scenario: "student-insurance-demo",
      };
      return validate(currentMarkers).length ? db : currentMarkers;
    }
    if (![1, 2].includes(db?.schemaVersion) || db.meta?.synthetic !== true ||
        (db.meta.scenario && db.meta.scenario !== "student-insurance-demo") ||
        !Array.isArray(db.profiles) || !db.profiles.length ||
        !Array.isArray(db.guardians) || !Array.isArray(db.applications) ||
        (db.samplePolicies !== undefined && !Array.isArray(db.samplePolicies)) ||
        (db.policies !== undefined && !Array.isArray(db.policies)) ||
        (db.claims !== undefined && !Array.isArray(db.claims)) ||
        db.profiles.some(profile => !profile || !(
          ["SYN-STU-ADULT", "SYN-STU-MINOR"].includes(profile.id) ||
          /^SYN-STU-\d{4}$/.test(profile.id)
        ) || !["未滿18歲", "18歲以上", LEGACY_MINOR_AGE_BAND, ...AGE_BANDS].includes(profile.ageBand)) ||
        db.guardians.some(guardian => !guardian || !/^SYN-GUARDIAN-(?:\d{2}|\d{4})$/.test(guardian.id)) ||
        db.profiles.some(profile => !LEGACY_ADULT_AGE_BANDS.includes(profile.ageBand) &&
          (!profile.guardianId || !db.guardians.some(guardian =>
            guardian.id === profile.guardianId && guardian.studentId === profile.id &&
            typeof guardian.active === "boolean"))) ||
        db.applications.some(app => !app || typeof app.id !== "string" ||
          !app.id.startsWith("SYN-APP-") || !db.profiles.some(profile => profile.id === app.profileId) ||
          !(LEGACY_PRODUCT_IDS[app.productId] || PRODUCT_SEED.some(row => row.id === app.productId)) ||
          !["已送出演示申請", "演示處理完成（非承保）", "pending-underwriting",
            "supplement-requested", "resubmitted", "approved-awaiting-payment",
            "rejected", "paid-effective", "legacy-existing"].includes(app.status)) ||
        (db.samplePolicies || []).some(policy => !policy || typeof policy.id !== "string" ||
          !policy.id.startsWith("SYN-POL-") ||
          !db.applications.some(app => app.id === policy.applicationId)) ||
        (db.policies || []).some(policy => !policy || typeof policy.id !== "string" ||
          !policy.id.startsWith("SYN-POL-") || typeof policy.status !== "string") ||
        (db.claims || []).some(claim => !claim || typeof claim.id !== "string" ||
          !claim.id.startsWith("SYN-CLAIM-") || typeof claim.status !== "string" ||
          !db.profiles.some(profile => profile.id === claim.profileId))) return db;
    if (Array.isArray(db.products) && db.products.some(row =>
      !migrateLegacyProduct(row) && !PRODUCT_SEED.some(seed => seed.id === row?.id && seed.insurer === row?.insurer))) return db;
    const next = createSeed();
    const regionMap = { "SYN-R1": "SYN-REGION-A", "SYN-R2": "SYN-REGION-B", "SYN-R3": "SYN-REGION-C" };
    next.context = {
      regionId: REGIONS.some(row => row.id === db.context?.regionId)
        ? db.context.regionId : regionMap[db.context?.regionId] || "SYN-REGION-A",
      schoolYear: YEARS.includes(db.context?.schoolYear) ? db.context.schoolYear : YEARS[0],
    };
    if (Array.isArray(db.products)) {
      for (const oldProduct of db.products) {
        const migrated = migrateLegacyProduct(oldProduct);
        const currentId = migrated?.id || oldProduct.id;
        const index = next.products.findIndex(row => row.id === currentId);
        if (migrated) {
          // Keep the historical contract separate from current seed products and their snapshots.
          if (index >= 0) return db;
          next.products.push(makeProduct(migrated));
        } else {
          if (index < 0) return db;
          const previous = next.products[index];
          const state = oldProduct.published === true || oldProduct.status === "published"
            ? "published" : "withdrawn";
          next.products[index] = makeProduct({
            ...previous, status: state, published: state === "published",
            reviewNote: "舊存檔發布狀態已保留為演示目錄狀態；非真實批准。",
            reviewHistory: [{ status: state, date: BUSINESS_DATE, note: "舊存檔相容遷移。" }],
          });
        }
      }
    }
    const profileMap = new Map();
    let guardianOrdinal = next.guardians.reduce((max, row) =>
      Math.max(max, Number(/^SYN-GUARDIAN-(\d+)$/.exec(row.id)?.[1]) || 0), 0);
    db.profiles.forEach((profile, index) => {
      if (profile.id === "SYN-STU-ADULT" || LEGACY_ADULT_AGE_BANDS.includes(profile.ageBand)) {
        profileMap.set(profile.id, PROFILE_SEED[0].id);
        return;
      }
      const base = PROFILE_SEED[index % (PROFILE_SEED.length - 1) + 1];
      const oldGuardian = db.guardians.find(row =>
        row.id === profile.guardianId && row.studentId === profile.id);
      if (!oldGuardian) return;
      let guardianId;
      do {
        guardianOrdinal += 1;
        guardianId = `SYN-GUARDIAN-${String(guardianOrdinal).padStart(4, "0")}`;
      } while (next.guardians.some(row => row.id === guardianId));
      const profileId = `SYN-STU-LEGACY-${String(index + 1).padStart(3, "0")}`;
      next.profiles.push({
        ...base,
        id: profileId,
        displayName: `演示學生舊版-${String(index + 1).padStart(3, "0")}`,
        ageBand: profile.ageBand === "未滿18歲" ? LEGACY_MINOR_AGE_BAND : profile.ageBand,
        guardianId,
      });
      next.guardians.push({
        id: guardianId, studentId: profileId, active: oldGuardian.active,
        relationshipCode: "舊版合成代理關係",
      });
      profileMap.set(profile.id, profileId);
    });
    const appMap = new Map();
    const legacyApplications = db.applications.map((oldApp, index) => {
      const currentProductId = LEGACY_PRODUCT_IDS[oldApp.productId] || oldApp.productId;
      const plan = next.products.find(row => row.id === currentProductId);
      const profileId = profileMap.get(oldApp.profileId);
      if (!plan || !profileId) return null;
      const id = `SYN-APP-LEGACY-${String(index + 1).padStart(4, "0")}`;
      appMap.set(oldApp.id, id);
      const profile = next.profiles.find(row => row.id === profileId);
      const oldStatus = String(oldApp.legacyStatus || oldApp.status || "舊版演示紀錄");
      return {
        id, legacyId: oldApp.id, profileId, productId: plan.id, productSnapshot: productSnapshot(plan),
        productVersion: plan.version, assignedUnderwriterId: nextInsurer(plan.insurer),
        status: "legacy-existing", legacyStatus: oldStatus,
        consent: null, createdMonth: "2026-10", regionId: profile.regionId,
        schoolYear: next.context.schoolYear, source: "舊版本機演示紀錄（僅保留，不計入核保）",
        requestedSupplementIds: [], submittedSupplementIds: [], underwritingDecision: null,
        payment: null, policyId: null,
      };
    });
    if (legacyApplications.some(row => !row)) return db;
    next.applications.push(...legacyApplications);
    next.samplePolicies = (db.samplePolicies || []).map((oldPolicy, index) => ({
      id: oldPolicy.id,
      legacyId: oldPolicy.id,
      legacyApplicationId: oldPolicy.applicationId,
      applicationId: appMap.get(oldPolicy.applicationId),
      status: "legacy-not-effective", effectiveDemo: false,
      legacyStatus: String(oldPolicy.status || "舊版樣例保單"),
    })).filter(row => row.applicationId);
    next.legacyHistory = {
      policies: (db.policies || []).map((row, index) => ({
        id: `SYN-POL-LEGACY-${String(index + 1).padStart(4, "0")}`,
        legacyId: row.id,
        profileId: profileMap.get(row.profileId ||
          db.applications.find(app => app.id === row.applicationId)?.profileId) || null,
        status: String(row.legacyStatus || row.status || "舊版保單紀錄（未驗證）"),
      })),
      claims: (db.claims || []).map((row, index) => ({
        id: `SYN-CLAIM-LEGACY-${String(index + 1).padStart(4, "0")}`,
        legacyId: row.id,
        profileId: profileMap.get(row.profileId),
        status: String(row.legacyStatus || row.status || "舊版理賠紀錄（未驗證）"),
      })),
    };
    next.schoolBriefing.reviewed = db.schoolBriefing?.reviewed === true;
    return next;
  }
  function canManageProfile(db, profileId) {
    const profile = db.profiles.find(row => row.id === profileId);
    if (!profile) return false;
    if (profile.ageBand === AGE_BANDS[2]) return true;
    return db.guardians.some(row => row.id === profile.guardianId &&
      row.studentId === profile.id && row.active);
  }
  function actionInsurer(role, payload) {
    return role === "insurer" && INSURERS.includes(payload.insurer) ? payload.insurer : null;
  }
  function appendProductHistory(product, status, note) {
    product.status = status;
    product.published = status === "published";
    product.reviewNote = note;
    product.reviewHistory.push({ status, date: BUSINESS_DATE, note });
  }
  function run(db, role, action, payload = {}) {
    const errors = validate(db);
    if (errors.length) return { ok: false, message: errors[0] };
    if (!ROLES.includes(role)) return { ok: false, message: "演示身分無效" };
    const next = clone(db);
    const fail = message => ({ ok: false, message });
    const finish = message => {
      const validation = validate(next);
      return validation.length ? fail(validation[0]) : { ok: true, db: next, message };
    };
    const insurer = actionInsurer(role, payload);
    const app = next.applications.find(row => row.id === payload.applicationId);
    const plan = app ? next.products.find(row => row.id === app.productId) : null;
    const claim = next.claims.find(row => row.id === payload.claimId);
    const policy = claim
      ? next.policies.find(row => row.id === claim.policyId)
      : next.policies.find(row => row.id === payload.policyId);
    const claimOwner = claim ? claim.insurer : policy?.insurer;
    const appAccessible = row => row && row.status !== "legacy-existing" &&
      row.profileId === payload.profileId && canManageProfile(next, row.profileId);
    const claimAccessible = row => row && row.profileId === payload.profileId &&
      canManageProfile(next, row.profileId);
    const assignedInsurer = row => insurer && row?.assignedUnderwriterId === insurer &&
      row.productSnapshot.insurer !== insurer;
    const ownsClaim = row => insurer && row?.insurer === insurer;
    const requireNoSensitiveText = value => typeof value === "string" &&
      value.trim().length > 0 && value.trim().length <= 180 && !hasPersonalStyleInput(value);

    if (action === "setContext") {
      if (role !== "student-parent") return fail("此演示身分不可修改地區／學年");
      if (!REGIONS.some(row => row.id === payload.regionId) || !YEARS.includes(payload.schoolYear)) return fail("請選擇有效的合成地區與學年");
      next.context = { regionId: payload.regionId, schoolYear: payload.schoolYear };
    } else if (action === "createProductDraft") {
      if (!insurer) return fail("僅保險公司角色可建立演示商品草稿");
      const id = nextId(next.products, "SYN-PROD-");
      next.products.push(makeProduct({
        id, insurer, name: "", benefit: "", limitAmount: null, limitUnit: "元/人",
        feeAmount: null, feeUnit: "元/人/演示學年", term: "", exclusions: "",
        version: "合成條款草稿 V1", versionNumber: 1, source: `SYN-SOURCE-${id}; 無真實銷售來源`,
        coverageTypes: [], status: "draft", reviewHistory: [{ status: "draft", date: BUSINESS_DATE, note: "新建合成演示草稿。" }],
      }));
      return finish(`已建立自家演示草稿 ${id}`);
    } else if (action === "saveProductDraft") {
      if (!insurer) return fail("僅保險公司角色可編輯演示商品");
      const item = next.products.find(row => row.id === payload.productId);
      if (!item || item.insurer !== insurer) return fail("不能編輯其他公司的演示商品");
      if (!["draft", "returned"].includes(item.status)) return fail("已送審或已審商品不可原地修改；請建立新版本草稿");
      const fields = payload.fields || {};
      const textFields = ["name", "benefit", "term", "exclusions", "version", "source"];
      if (textFields.some(key => !requireNoSensitiveText(fields[key])) ||
          !Number.isInteger(fields.limitAmount) || fields.limitAmount <= 0 ||
          !Number.isInteger(fields.feeAmount) || fields.feeAmount < 0 ||
          !Array.isArray(fields.coverageTypes) || !fields.coverageTypes.length ||
          !fields.coverageTypes.every(value => COVERAGE_TYPES.includes(value))) return fail("商品必填欄位不完整或含不支援內容；請只填合成條款資料");
      Object.assign(item, {
        name: fields.name.trim(), benefit: fields.benefit.trim(),
        limitAmount: fields.limitAmount, limitUnit: "元/人",
        feeAmount: fields.feeAmount, feeUnit: "元/人/演示學年",
        term: fields.term.trim(), exclusions: fields.exclusions.trim(),
        version: fields.version.trim(), source: fields.source.trim(),
        coverageTypes: [...new Set(fields.coverageTypes)],
      });
      return finish("演示商品草稿已保存；尚未提交審核或發布");
    } else if (action === "submitProductForReview") {
      if (!insurer) return fail("僅保險公司角色可提交商品演示審核");
      const item = next.products.find(row => row.id === payload.productId);
      if (!item || item.insurer !== insurer) return fail("不能提交其他公司的演示商品");
      if (!["draft", "returned"].includes(item.status) || !validateProduct({ ...item, status: "approved", published: false })) return fail("商品欄位不完整或狀態不允許送審");
      appendProductHistory(item, "pending-review", "已提交合成演示監管審查；非真實批准流程。");
      return finish("已送交合成演示審核；學生 Marketplace 尚不可見");
    } else if (action === "reviewProduct") {
      if (role !== "regulator") return fail("僅政府監管演示角色可審核商品");
      const item = next.products.find(row => row.id === payload.productId);
      const decisions = { approve: "approved", return: "returned", reject: "rejected" };
      if (!item || item.status !== "pending-review" || !decisions[payload.decision]) return fail("商品不在待審狀態或審核動作無效");
      if (!PRODUCT_REVIEW_REASONS.includes(payload.reason)) return fail("請選擇合成審核原因");
      appendProductHistory(item, decisions[payload.decision], payload.reason);
      return finish(`商品演示審核狀態：${STATE_LABELS[item.status]}；不代表真實批准`);
    } else if (action === "publishProduct") {
      if (!insurer) return fail("僅保險公司角色可發布自家商品");
      const item = next.products.find(row => row.id === payload.productId);
      if (!item || item.insurer !== insurer) return fail("不能發布其他公司的演示商品");
      if (item.status !== "approved") return fail("只有已通過合成演示審核的商品才可發布");
      if (item.revisionOf) {
        const prior = next.products.find(row => row.id === item.revisionOf);
        if (prior?.status === "published") appendProductHistory(prior, "withdrawn", "新版本演示商品發布，舊版本退出展示；歷史記錄保留。");
      }
      appendProductHistory(item, "published", "公司已演示發布；非真實銷售或保障。");
      return finish("演示商品已發布至學生 Marketplace");
    } else if (action === "withdrawProduct") {
      if (!insurer) return fail("僅保險公司角色可撤回自家商品");
      const item = next.products.find(row => row.id === payload.productId);
      if (!item || item.insurer !== insurer) return fail("不能撤回其他公司的演示商品");
      if (item.status !== "published") return fail("只有在架演示商品可撤回");
      appendProductHistory(item, "withdrawn", "公司已撤回演示展示；已存在的申請版本不變。");
      return finish("演示商品已撤回；既有版本與申請記錄保留");
    } else if (action === "createProductRevision") {
      if (!insurer) return fail("僅保險公司角色可建立商品新版本");
      const item = next.products.find(row => row.id === payload.productId);
      if (!item || item.insurer !== insurer) return fail("不能複製其他公司的商品");
      if (!["approved", "published", "withdrawn", "rejected"].includes(item.status)) return fail("此狀態不能建立新版本");
      const revision = makeProduct({
        ...productSnapshot(item), id: nextId(next.products, "SYN-PROD-"),
        versionNumber: item.versionNumber + 1,
        version: `${item.version}・合成版本${item.versionNumber + 1}`,
        status: "draft", published: false, revisionOf: item.id,
        reviewNote: "", reviewHistory: [{ status: "draft", date: BUSINESS_DATE, note: "基於舊版複製的新合成草稿；舊版本不可變。" }],
      });
      next.products.push(revision);
      return finish(`已建立新版本草稿 ${revision.id}；原版本保留`);
    } else if (action === "submitApplication") {
      if (role !== "student-parent") return fail("此演示身分不可提交學生申請");
      const profile = next.profiles.find(row => row.id === payload.profileId);
      const item = next.products.find(row => row.id === payload.productId);
      if (!profile || !canManageProfile(next, profile.id)) return fail("成年學生須由本人選擇；未成年學生須有有效的合成代理關係");
      if (!item || item.status !== "published" || !item.published) return fail("只能對已通過審核並發布的合成學平險提交演示申請");
      if (payload.agreed !== true) return fail("請先確認此為非真實投保的合成演示申請");
      if (next.applications.some(row => row.profileId === profile.id && row.productId === item.id &&
          row.status !== "legacy-existing" && row.status !== "rejected")) return fail("此身份已有該版本的進行中申請或演示保單");
      const createdMonth = BUSINESS_DATE.slice(0, 7);
      next.applications.push({
        id: nextId(next.applications, "SYN-APP-"), profileId: profile.id,
        productId: item.id, productSnapshot: productSnapshot(item), productVersion: item.version,
        assignedUnderwriterId: nextInsurer(item.insurer), status: "pending-underwriting",
        consent: true, createdMonth, regionId: profile.regionId,
        schoolYear: next.context.schoolYear, source: "本機合成演示申請",
        requestedSupplementIds: [], submittedSupplementIds: [],
        underwritingDecision: null, payment: null, policyId: null,
      });
      return finish("已提交合成演示申請，進入模擬核保隊列；提交不等於承保");
    } else if (action === "requestUnderwritingSupplement") {
      if (!app || !assignedInsurer(app) || role !== "insurer") {
        if (role === "insurer" && insurer && app && plan?.insurer === insurer) return fail("商品發布公司不能核保自己的演示申請；此案例由另一合成公司受理");
        return fail("此演示公司不是指定核保方");
      }
      if (!["pending-underwriting", "resubmitted"].includes(app.status) ||
          !Array.isArray(payload.itemIds) || !payload.itemIds.length ||
          !payload.itemIds.every(id => APP_SUPPLEMENT_ITEMS.some(item => item.id === id))) return fail("申請狀態或補充清單無效");
      app.status = "supplement-requested";
      app.requestedSupplementIds = [...new Set(payload.itemIds)];
      app.submittedSupplementIds = [];
      app.underwritingDecision = { code: "supplement-requested", note: "合成演示補充清單；無文件上傳", month: BUSINESS_DATE.slice(0, 7) };
      return finish("已要求合成演示補充；不代表真實核保決定");
    } else if (action === "resubmitApplication") {
      if (role !== "student-parent" || !appAccessible(app)) return fail("僅該合成身份本人或有效演示代理可補交");
      if (app.status !== "supplement-requested" ||
          !Array.isArray(payload.itemIds) ||
          app.requestedSupplementIds.some(id => !payload.itemIds.includes(id)) ||
          payload.itemIds.some(id => !APP_SUPPLEMENT_ITEMS.some(item => item.id === id))) return fail("請按清單勾選全部演示補充項；不接受文件上傳");
      app.submittedSupplementIds = [...new Set(payload.itemIds)];
      app.status = "resubmitted";
      app.underwritingDecision = { code: "resubmitted", note: "已勾選合成補充清單；沒有上傳文件", month: BUSINESS_DATE.slice(0, 7) };
      return finish("已重新提交合成補充清單，等待指定演示公司處理");
    } else if (action === "decideUnderwriting") {
      if (!app || role !== "insurer" || !assignedInsurer(app)) {
        if (role === "insurer" && insurer && app && plan?.insurer === insurer) return fail("商品發布公司不能核保自己的演示申請；此案例由另一合成公司受理");
        return fail("此演示公司不是指定核保方");
      }
      if (!["pending-underwriting", "resubmitted"].includes(app.status) ||
          !["approve", "reject"].includes(payload.decision) ||
          !UNDERWRITING_REASONS.includes(payload.reason)) return fail("核保狀態或演示結論無效");
      app.status = payload.decision === "approve" ? "approved-awaiting-payment" : "rejected";
      app.underwritingDecision = {
        code: payload.decision === "approve" ? "approved" : "rejected",
        note: payload.reason, month: BUSINESS_DATE.slice(0, 7),
      };
      app.requestedSupplementIds = [];
      return finish("已記錄合成演示核保結果；不代表真實承保");
    } else if (action === "payApplication") {
      if (role !== "student-parent" || !appAccessible(app)) return fail("僅該合成身份本人或有效演示代理可確認模擬繳費");
      if (app.status !== "approved-awaiting-payment" || payload.confirmed !== true) return fail("需先核保演示通過並明確確認模擬繳費");
      if (next.policies.some(row => row.applicationId === app.id)) return fail("此申請已有演示保單，不能重複繳費");
      const paymentId = nextId(next.policies.map(row => ({ id: row.payment?.id || "" })), "SYN-PAY-");
      const policyId = nextId(next.policies, "SYN-POL-");
      const payment = { id: paymentId, status: "paid-demo", amount: app.productSnapshot.feeAmount, month: BUSINESS_DATE.slice(0, 7) };
      const newPolicy = {
        id: policyId, applicationId: app.id, profileId: app.profileId, productId: app.productId,
        insurer: app.productSnapshot.insurer, productSnapshot: clone(app.productSnapshot),
        status: "demo-effective", effectiveDemo: true, payment, createdMonth: BUSINESS_DATE.slice(0, 7),
      };
      app.status = "paid-effective";
      app.payment = clone(payment);
      app.policyId = policyId;
      next.policies.push(newPolicy);
      return finish("模擬繳費完成並建立本機演示保單；不是實際支付或生效保障");
    } else if (action === "revokeGuardian") {
      if (role !== "student-parent") return fail("僅學生／家長角色可撤銷演示代理關係");
      const guardian = next.guardians.find(row => row.id === payload.guardianId && row.active);
      if (!guardian) return fail("合成代理關係不存在或已撤銷");
      guardian.active = false;
      return finish("已撤銷合成代理存取；歷史申請、演示保單與理賠紀錄保留");
    } else if (action === "submitClaim") {
      if (role !== "student-parent" || !policy || policy.profileId !== payload.profileId ||
          !canManageProfile(next, payload.profileId)) return fail("僅該合成身份本人或有效演示代理可報案");
      if (policy.status !== "demo-effective" || policy.effectiveDemo !== true) return fail("只有模擬繳費後的演示有效保單可建立演示理賠");
      if (!COVERAGE_TYPES.includes(payload.category) || !REPORT_MONTHS.includes(payload.eventMonth) ||
          !Number.isInteger(payload.claimedAmount) || payload.claimedAmount <= 0) return fail("事故月份、抽象責任類別或合成金額無效");
      next.claims.push({
        id: nextId(next.claims, "SYN-CLAIM-"), policyId: policy.id,
        applicationId: policy.applicationId, profileId: policy.profileId,
        productId: policy.productId, insurer: policy.insurer, category: payload.category,
        eventMonth: payload.eventMonth, claimedAmount: payload.claimedAmount,
        materials: [{ id: "SYN-MATERIAL-CLAIM-01", status: "清單占位（無上傳文件）" }],
        requestedSupplementIds: [], status: "submitted", decision: null, payment: null, closedMonth: null,
      });
      return finish("已建立合成演示報案；不代表正式理賠申請或責任認定");
    } else if (action === "startClaimReview") {
      if (role !== "insurer" || !claim || !ownsClaim(claim)) return fail("僅承保公司演示角色可查看並處理自家理賠案例");
      if (!["submitted", "resubmitted"].includes(claim.status)) return fail("理賠狀態不允許開始審查");
      claim.status = "reviewing";
      return finish("已進入合成理賠審查狀態；不是真實核賠");
    } else if (action === "requestClaimSupplement") {
      if (role !== "insurer" || !claim || !ownsClaim(claim)) return fail("僅承保公司演示角色可要求自家案例補充");
      if (claim.status !== "reviewing" || !Array.isArray(payload.itemIds) ||
          !payload.itemIds.length || !payload.itemIds.every(id => CLAIM_SUPPLEMENT_ITEMS.some(item => item.id === id))) return fail("理賠狀態或演示補充清單無效");
      claim.status = "supplement-requested";
      claim.requestedSupplementIds = [...new Set(payload.itemIds)];
      claim.materials = claim.requestedSupplementIds.map(id => ({ id, status: "待演示補充（無上傳文件）" }));
      return finish("已要求合成演示補充清單；不接收醫療或身份文件");
    } else if (action === "resubmitClaim") {
      if (role !== "student-parent" || !claim || !claimAccessible(claim)) return fail("僅該合成身份本人或有效演示代理可補交");
      if (claim.status !== "supplement-requested" || !Array.isArray(payload.itemIds) ||
          claim.requestedSupplementIds.some(id => !payload.itemIds.includes(id)) ||
          payload.itemIds.some(id => !CLAIM_SUPPLEMENT_ITEMS.some(item => item.id === id))) return fail("請勾選全部演示補充清單；不接受上傳文件或描述");
      claim.materials = claim.requestedSupplementIds.map(id => ({ id, status: "已勾選演示補充（未上傳文件）" }));
      claim.status = "resubmitted";
      return finish("已重新提交演示補充清單，等待承保公司角色審查");
    } else if (action === "decideClaim") {
      if (role !== "insurer" || !claim || !ownsClaim(claim)) return fail("僅承保公司演示角色可記錄自家理賠結論");
      if (claim.status !== "reviewing" ||
          !["approve", "partial", "reject"].includes(payload.decision) ||
          !CLAIM_DECISION_REASONS.includes(payload.reason) ||
          !Number.isInteger(payload.amount) || payload.amount < 0 || payload.amount > claim.claimedAmount ||
          (payload.decision === "reject" && payload.amount !== 0) ||
          (payload.decision === "approve" && payload.amount <= 0) ||
          (payload.decision === "partial" && (payload.amount <= 0 || payload.amount >= claim.claimedAmount))) return fail("演示理賠結論、說明或合成金額無效");
      const code = payload.decision === "approve" ? "approved"
        : payload.decision === "partial" ? "partial-approved" : "rejected";
      claim.status = code;
      claim.decision = { code, amount: payload.amount, reason: payload.reason, month: BUSINESS_DATE.slice(0, 7) };
      claim.requestedSupplementIds = [];
      return finish("已記錄合成演示理賠結論；不構成真實責任或賠付判斷");
    } else if (action === "payClaim") {
      if (role !== "insurer" || !claim || !ownsClaim(claim)) return fail("僅承保公司演示角色可執行模擬賠款");
      if (!["approved", "partial-approved"].includes(claim.status) ||
          !claim.decision || claim.decision.amount <= 0 || payload.confirmed !== true || claim.payment) return fail("僅通過的合成演示結論可模擬支付，且不得重複");
      claim.payment = {
        id: nextId(next.claims.map(row => ({ id: row.payment?.id || "" })), "SYN-CLM-PAY-"),
        status: "paid-demo", amount: claim.decision.amount, month: BUSINESS_DATE.slice(0, 7),
      };
      claim.status = "paid";
      return finish("合成演示支付已記錄；不是實際保險賠款");
    } else if (action === "closeClaim") {
      if (role !== "insurer" || !claim || !ownsClaim(claim)) return fail("僅承保公司演示角色可結案自家案例");
      if (!["paid", "rejected"].includes(claim.status)) return fail("僅模擬支付完成或演示拒絕的案例可結案");
      claim.status = "closed";
      claim.closedMonth = BUSINESS_DATE.slice(0, 7);
      return finish("演示案例已結案；歷史狀態保留");
    } else {
      return fail("不支援此操作");
    }
    return finish("已更新本機合成演示資料");
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }
  function product(db, id) { return db.products.find(row => row.id === id); }
  function appProduct(db, app) { return app.productSnapshot || product(db, app.productId); }
  function appProfile(db, app) { return db.profiles.find(row => row.id === app.profileId); }
  function policyForApplication(db, applicationId) { return db.policies.find(row => row.applicationId === applicationId); }
  function applicationStatusLabel(status) {
    return ({
      "pending-underwriting": "待演示核保", "supplement-requested": "待勾選演示補充",
      resubmitted: "已重新提交演示清單", "approved-awaiting-payment": "演示核保通過・待模擬繳費",
      rejected: "演示核保拒絕", "paid-effective": "模擬繳費完成・演示保單建立",
      "legacy-existing": "舊版申請歷史（未進入核保）",
    })[status] || status;
  }
  function claimStatusLabel(status) {
    return ({
      submitted: "待演示受理", reviewing: "演示審查中",
      "supplement-requested": "待勾選演示補充", resubmitted: "已重新提交演示清單",
      approved: "演示通過・待模擬支付", "partial-approved": "演示部分通過・待模擬支付",
      rejected: "演示拒絕", paid: "模擬支付完成・待結案", closed: "演示已結案",
    })[status] || status;
  }
  function checkboxList(items, attribute, selected = []) {
    return items.map(item => `<label class="checkline"><input type="checkbox" ${attribute}="${esc(item.id)}" ${selected.includes(item.id) ? "checked" : ""}>${esc(item.label)}</label>`).join("");
  }
  function applicationCard(db, app, mode, insurer) {
    const snapshot = appProduct(db, app);
    const profile = appProfile(db, app);
    const policy = policyForApplication(db, app.id);
    const syntheticPerson = profile ? `${esc(profile.displayName)}・${esc(profile.ageBand)}` : "合成學生標記";
    let actions = "";
    if (mode === "student" && app.status === "supplement-requested") {
      actions = `${checkboxList(APP_SUPPLEMENT_ITEMS.filter(item => app.requestedSupplementIds.includes(item.id)), "data-app-supplement", app.submittedSupplementIds)}<button class="button" data-action="resubmit-application" data-id="${esc(app.id)}">重新提交勾選清單</button>`;
    } else if (mode === "student" && app.status === "approved-awaiting-payment") {
      actions = `<p class="callout">演示核保通過不等於繳費或保單成立；費用示例：${snapshot.feeAmount} 演示元。</p><button class="button" data-action="pay-application" data-id="${esc(app.id)}">確認模擬繳費並建立演示保單</button>`;
    } else if (mode === "underwriting" && ["pending-underwriting", "resubmitted"].includes(app.status)) {
      actions = `<fieldset class="action-fieldset"><legend>演示核保操作</legend>${checkboxList(APP_SUPPLEMENT_ITEMS, "data-app-supplement", [])}<button class="button secondary" data-action="request-application-supplement" data-id="${esc(app.id)}">要求勾選補充清單</button><button class="button" data-action="approve-application" data-id="${esc(app.id)}">演示核保通過</button><button class="button danger" data-action="reject-application" data-id="${esc(app.id)}">演示核保拒絕</button></fieldset>`;
    }
    return `<article class="workflow-card" data-application="${esc(app.id)}"><div class="workflow-card-heading"><div><span class="tag">${esc(applicationStatusLabel(app.status))}</span><h3>${esc(app.id)}｜${esc(snapshot.name)}</h3></div><span class="muted">${esc(app.createdMonth)}</span></div>
      <p class="muted">${mode === "underwriting" ? `${syntheticPerson}・` : ""}${esc(insurerLabel(snapshot.insurer))}・條款 ${esc(app.productVersion || snapshot.version)}</p>
      ${app.status === "legacy-existing" ? `<p class="status-strip">舊版狀態已保留：${esc(app.legacyStatus)}</p>` : ""}
      <p>${esc(snapshot.benefit)}</p>${app.underwritingDecision?.note ? `<p class="muted">演示狀態說明：${esc(app.underwritingDecision.note)}</p>` : ""}
      ${policy ? `<p class="status-strip">演示保單 ${esc(policy.id)}｜模擬繳費 ${esc(policy.payment.status)}｜不是實際生效保障</p>` : ""}
      ${actions ? `<div class="workflow-actions">${actions}</div>` : ""}</article>`;
  }
  function claimCard(db, claim, mode, insurer) {
    const policy = db.policies.find(row => row.id === claim.policyId);
    const profile = appProfile(db, db.applications.find(row => row.id === claim.applicationId) || {});
    const syntheticPerson = profile ? `${esc(profile.displayName)}・` : "";
    let actions = "";
    if (mode === "student" && claim.status === "supplement-requested") {
      actions = `${checkboxList(CLAIM_SUPPLEMENT_ITEMS.filter(item => claim.requestedSupplementIds.includes(item.id)), "data-claim-supplement", claim.materials.filter(row => row.status.startsWith("已勾選")).map(row => row.id))}<button class="button" data-action="resubmit-claim" data-id="${esc(claim.id)}">重新提交演示清單</button>`;
    } else if (mode === "insurer" && ["submitted", "resubmitted"].includes(claim.status)) {
      actions = `<button class="button" data-action="start-claim-review" data-id="${esc(claim.id)}">受理並開始演示審查</button>`;
    } else if (mode === "insurer" && claim.status === "reviewing") {
      actions = `<fieldset class="action-fieldset"><legend>演示理賠審查</legend>${checkboxList(CLAIM_SUPPLEMENT_ITEMS, "data-claim-supplement", [])}<button class="button secondary" data-action="request-claim-supplement" data-id="${esc(claim.id)}">要求補充清單</button>
        <label class="field">演示結論金額<input data-claim-amount="${esc(claim.id)}" type="number" min="0" max="${claim.claimedAmount}" step="1" value="${claim.claimedAmount}"></label>
        <button class="button" data-action="approve-claim" data-id="${esc(claim.id)}">演示通過</button><button class="button secondary" data-action="partial-claim" data-id="${esc(claim.id)}">演示部分通過</button><button class="button danger" data-action="reject-claim" data-id="${esc(claim.id)}">演示拒絕</button></fieldset>`;
    } else if (mode === "insurer" && ["approved", "partial-approved"].includes(claim.status)) {
      actions = `<p class="callout">僅為合成演示結論；不是法律責任或真實賠付。</p><button class="button" data-action="pay-claim" data-id="${esc(claim.id)}">確認模擬理賠支付</button>`;
    } else if (mode === "insurer" && ["paid", "rejected"].includes(claim.status)) {
      actions = `<button class="button secondary" data-action="close-claim" data-id="${esc(claim.id)}">結束此演示案例</button>`;
    }
    return `<article class="workflow-card" data-claim="${esc(claim.id)}"><div class="workflow-card-heading"><div><span class="tag">${esc(claimStatusLabel(claim.status))}</span><h3>${esc(claim.id)}｜${esc(claim.category)}</h3></div><span class="muted">${esc(claim.eventMonth)}</span></div>
      <p class="muted">${mode === "insurer" ? syntheticPerson : ""}演示保單 ${esc(claim.policyId)}｜${esc(policy?.productSnapshot?.version || "")}</p>
      <p>申請示例金額 ${claim.claimedAmount} 演示元；材料為「材料項」清單占位，未上傳文件。</p>
      ${claim.decision ? `<p class="status-strip">${esc(claim.decision.reason)}｜演示結論 ${claim.decision.amount} 演示元</p>` : ""}
      ${actions ? `<div class="workflow-actions">${actions}</div>` : ""}</article>`;
  }
  function availableProfiles(db) {
    return db.profiles.filter(row => canManageProfile(db, row.id));
  }
  function roleCards() {
    return `<main class="login-page">
      <header class="public-header"><a class="brand" href="#/login"><span class="brand-mark">學</span><span><strong>學生保障服務平台</strong><small>Student &amp; Family Demo</small></span></a><div class="top-actions"><button class="button secondary" type="button" data-action="open-guide">操作說明書</button><span class="demo-chip">獨立入口・離線演示</span></div></header>
      <section class="login-hero"><div><span class="eyebrow">STUDENT &amp; FAMILY PROTECTION</span><h1>學生保障資訊與家庭選擇<br>清楚分工、角色協作</h1><p>學生保障以<strong>城鄉居民基本醫療保險（學生醫保）</strong>為基礎，再由家庭自願了解保險公司提供的商業學平險補充；依地區政策查核並按正式條款判斷。</p><div class="callout">醫保打底，學平險補充。學平險並非全國統一強制購買；已有相近保障時，請核對條款與保障重疊，不由本平台判定是否重複或如何賠付。</div></div><aside><strong>合成資料聲明</strong><p>學生、地區、政策與商品都是合成示例。此原型不查驗實際參保，不提供真實報價、承保、理賠或支付。</p><p>固定演示日期：${BUSINESS_DATE}</p></aside></section>
      <section class="login-section"><div class="section-title"><div><span class="eyebrow">ROLE-BASED WORKSPACES</span><h2>選擇演示角色</h2><p>四種角色進入各自工作台；學生／家長共用一個入口。角色限制只用於演示，不是真實認證。</p></div><button class="button secondary" data-action="reset" type="button">重置學生端資料</button></div><div class="login-grid">${ROLES.map(role => `<article class="login-card role-card" data-role-card="${role}"><div class="role-mark">${ROLE_LABELS[role].slice(0, 1)}</div><div><span class="eyebrow">${esc(ROLE_LABELS[role])}</span><h2>${esc(ROLE_LABELS[role])}工作台</h2><p>${esc(ROLE_DESCRIPTIONS[role])}</p></div><a class="button" href="#/${role}/${MENUS[role][0][0]}" data-role="${role}">以此角色進入</a></article>`).join("")}</div>
      <footer class="public-footer">學生基本醫保 ≠ 自願學平險 ≠ 學校責任險 · 純前端合成示例</footer>
    </main>`;
  }
  function renderComparison(products) {
    return products.length
      ? `<h3>已選比較（${products.length} 款）</h3><div class="comparison-grid">${products.map(row => `<article class="comparison-product"><h4>${esc(insurerLabel(row.insurer))}｜${esc(row.name)}</h4><dl><div><dt>責任</dt><dd>${esc(row.benefit)}</dd></div><div><dt>示例限額</dt><dd>${row.limitAmount} ${esc(row.limitUnit)}</dd></div><div><dt>費用示例</dt><dd>${row.feeAmount} ${esc(row.feeUnit)}</dd></div><div><dt>除外</dt><dd>${esc(row.exclusions)}</dd></div><div><dt>條款／期間／來源</dt><dd>${esc(row.version)}｜${esc(row.term)}｜${esc(row.source)}</dd></div></dl></article>`).join("")}</div>`
      : "<p>選擇商品加入比較，可按公司、責任、費用示例、期限與條款來源並列查看。</p>";
  }
  function marketplacePage(db, profileId, compareProductIds = []) {
    const profiles = availableProfiles(db);
    const products = db.products.filter(row => row.status === "published" && row.published);
    const records = db.applications.filter(row => row.profileId === profileId);
    const policies = db.policies.filter(row => row.profileId === profileId);
    const claims = db.claims.filter(row => row.profileId === profileId);
    const legacyPolicies = (db.legacyHistory?.policies || []).filter(row => row.profileId === profileId);
    const legacyClaims = (db.legacyHistory?.claims || []).filter(row => row.profileId === profileId);
    const compared = products.filter(row => compareProductIds.includes(row.id));
    const profile = db.profiles.find(row => row.id === profileId);
    const guardian = db.guardians.find(row => row.id === profile?.guardianId && row.active);
    const monthOptions = REPORT_MONTHS.map(month => `<option value="${month}">${month}</option>`).join("");
    return `<div class="page-heading"><div><span class="eyebrow">VOLUNTARY MARKETPLACE</span><h1>學平險 Marketplace</h1><p>學平險是自願商業補充；商品僅在通過合成審核並發布後可見。責任與來源均為合成示例。</p></div></div>
      <section class="panel"><h2>選擇合成身份</h2><label class="field">演示身份<select data-profile-select>${profiles.map(row => `<option value="${esc(row.id)}" ${row.id === profileId ? "selected" : ""}>${esc(row.displayName)}・${esc(row.ageBand)}</option>`).join("")}</select></label><p class="muted">成年學生選本人測試標記；未成年僅用可撤銷代理標記。關係未經真實核驗。</p>${guardian ? `<button class="button secondary" data-action="revoke" data-id="${esc(guardian.id)}">撤銷此演示代理</button>` : ""}</section>
      <section class="panel"><h2>已發布的合成商品</h2><p>意外傷害、意外醫療及部分產品的疾病住院責任依條款而異；可能重疊時只提示核查，不判定重複或賠付。</p>
        <label class="checkline"><input type="checkbox" data-demo-confirm>我了解此操作只建立合成申請，不是實際投保、承保、繳費或保障生效；不輸入真實資料。</label>
        <div class="product-list">${products.length ? products.map(row => `<article class="market-product" data-product="${esc(row.id)}">
          <div class="product-company"><span class="field-label">保險公司</span><strong>${esc(insurerLabel(row.insurer))}</strong><span class="product-name">${esc(row.name)}</span></div>
          <div class="product-coverage"><span class="field-label">責任類別／摘要</span><strong>${esc(row.coverageTypes.join("、"))}</strong><small>${esc(row.benefit)}</small></div>
          <div class="product-terms"><span class="field-label">限額與費用示例</span><strong>${row.limitAmount} ${esc(row.limitUnit)}</strong><small>${row.feeAmount} ${esc(row.feeUnit)}｜非報價</small></div>
          <div class="product-source"><span class="field-label">條款、期限與來源</span><strong>${esc(row.version)}（第${row.versionNumber}版）</strong><small>${esc(row.term)}｜${esc(row.source)}</small></div>
          <div class="product-actions"><label class="compare-toggle"><input type="checkbox" data-compare-product="${esc(row.id)}" ${compareProductIds.includes(row.id) ? "checked" : ""}>加入比較</label><button class="button" data-action="apply" data-id="${esc(row.id)}">選此商品建立演示申請</button></div>
          <details class="product-mobile-details"><summary>查看責任、除外與條款來源</summary><p>${esc(row.benefit)}</p><p>除外摘要：${esc(row.exclusions)}</p><p>${esc(row.version)}｜${esc(row.term)}</p><p>${esc(row.source)}</p></details>
        </article>`).join("") : `<div class="empty">目前沒有已發布的合成商品。</div>`}</div>
        <div class="compare-results" data-compare-results aria-live="polite">${renderComparison(compared)}</div>
      </section>
      <section class="panel"><h2>我的演示申請與核保狀態</h2>${records.length ? records.map(app => applicationCard(db, app, "student")).join("") : "<p>此合成身份目前沒有演示申請。</p>"}<p class="muted">申請不等於承保；核保通過仍須模擬繳費後才建立「演示保單」。</p></section>
      <section class="panel"><h2>我的演示保單</h2>${policies.length ? policies.map(row => `<article class="workflow-card"><span class="tag">模擬繳費完成・演示有效（非真實保障）</span><h3>${esc(row.id)}｜${esc(row.productSnapshot.name)}</h3><p>${esc(insurerLabel(row.insurer))}｜條款 ${esc(row.productSnapshot.version)}｜費用示例 ${row.payment.amount} 演示元</p><p>${esc(row.productSnapshot.benefit)}</p><p class="muted">存檔狀態來源：本機演示；不是實際支付或生效保單。</p></article>`).join("") : "<p>尚無演示保單；需先完成模擬核保與模擬繳費。</p>"}${legacyPolicies.length ? `<div class="workflow-card"><h3>舊版保單歷史（只讀）</h3>${legacyPolicies.map(row => `<p>${esc(row.id)}｜${esc(row.status)}（保留原狀態，不表示有效保障）</p>`).join("")}</div>` : ""}</section>
      <section class="panel" id="claim-flow"><h2>學平險演示理賠</h2><p>只為已模擬繳費的演示保單提供流程操作；事故使用抽象類別與月份，材料僅為清單勾選，不可上傳文件。</p>
        ${policies.length ? `<form class="workflow-form" data-claim-form><label class="field">演示保單<select name="policyId" required>${policies.map(row => `<option value="${esc(row.id)}">${esc(row.id)}｜${esc(row.productSnapshot.name)}</option>`).join("")}</select></label><label class="field">抽象責任類別<select name="category">${COVERAGE_TYPES.map(value => `<option>${esc(value)}</option>`).join("")}</select></label><label class="field">合成事故月份<select name="eventMonth">${monthOptions}</select></label><label class="field">聲稱金額（演示元）<input name="claimedAmount" type="number" min="1" max="1000000" step="1" value="500" required></label><button class="button" type="button" data-action="submit-claim">建立演示報案</button><p class="muted">不填事故敘事、診斷或個人資料；此流程不是正式理賠申請。</p></form>` : "<p>只有演示保單存在時，才可進入模擬理賠流程。</p>"}
        ${claims.length ? claims.map(row => claimCard(db, row, "student")).join("") : "<p>此合成身份尚無演示理賠記錄。</p>"}
        ${legacyClaims.length ? `<div class="workflow-card"><h3>舊版理賠歷史（只讀）</h3>${legacyClaims.map(row => `<p>${esc(row.id)}｜${esc(row.status)}（保留原狀態，不代表有效理賠）</p>`).join("")}</div>` : ""}</section>`;
  }
  function productEditor(row) {
    const editable = ["draft", "returned"].includes(row.status);
    const fields = editable ? `<form class="product-editor" data-product-editor="${esc(row.id)}">
      <label class="field">商品名稱<input name="name" maxlength="60" value="${esc(row.name)}" required></label>
      <label class="field">責任摘要<input name="benefit" maxlength="180" value="${esc(row.benefit)}" required></label>
      <div class="field-row"><label class="field">限額示例（元/人）<input name="limitAmount" type="number" min="1" step="1" value="${esc(row.limitAmount ?? "")}" required></label><label class="field">費用示例（元/人/學年）<input name="feeAmount" type="number" min="0" step="1" value="${esc(row.feeAmount ?? "")}" required></label></div>
      <label class="field">演示期限<input name="term" maxlength="80" value="${esc(row.term)}" required></label>
      <label class="field">除外責任摘要<input name="exclusions" maxlength="180" value="${esc(row.exclusions)}" required></label>
      <label class="field">條款版本<input name="version" maxlength="60" value="${esc(row.version)}" required></label>
      <label class="field">來源／版本依據<input name="source" maxlength="100" value="${esc(row.source)}" required></label>
      <fieldset class="action-fieldset"><legend>責任類別</legend>${COVERAGE_TYPES.map(value => `<label class="checkline"><input type="checkbox" data-coverage-type value="${esc(value)}" ${row.coverageTypes.includes(value) ? "checked" : ""}>${esc(value)}</label>`).join("")}</fieldset>
      <button class="button secondary" type="button" data-action="save-product" data-id="${esc(row.id)}">保存演示草稿</button></form>` : "";
    let actions = "";
    if (row.status === "draft" || row.status === "returned") actions = `<button class="button" data-action="submit-product" data-id="${esc(row.id)}">提交演示審核</button>`;
    if (row.status === "approved") actions = `<button class="button" data-action="publish-product" data-id="${esc(row.id)}">演示發布</button>`;
    if (row.status === "published") actions = `<button class="button secondary" data-action="withdraw-product" data-id="${esc(row.id)}">撤回演示商品</button>`;
    if (["approved", "published", "withdrawn", "rejected"].includes(row.status)) actions += ` <button class="button secondary" data-action="create-revision" data-id="${esc(row.id)}">建立新版本草稿</button>`;
    return `<article class="workflow-card product-admin" data-product-admin="${esc(row.id)}"><div class="workflow-card-heading"><div><span class="tag">${esc(STATE_LABELS[row.status])}</span><h3>${esc(row.id)}｜${esc(row.name || "未命名草稿")}</h3></div><span>${esc(row.version)} · v${row.versionNumber}</span></div>
      <p>${esc(row.benefit || "請填寫責任摘要")}｜限額示例 ${esc(row.limitAmount ?? "未填")} 元/人｜費用示例 ${esc(row.feeAmount ?? "未填")} 元/人/學年</p>
      <p>除外：${esc(row.exclusions || "未填")}｜期限：${esc(row.term || "未填")}</p><p>來源：${esc(row.source)}</p>
      ${row.reviewNote ? `<p class="status-strip">${esc(row.reviewNote)}</p>` : ""}${fields}<div class="workflow-actions">${actions}</div></article>`;
  }
  function insurerPage(db, insurer) {
    const ownProducts = db.products.filter(row => row.insurer === insurer);
    const underwriting = db.applications.filter(row => row.assignedUnderwriterId === insurer && row.status !== "legacy-existing");
    const conflicts = db.applications.filter(row => row.productSnapshot.insurer === insurer &&
      ["pending-underwriting", "resubmitted"].includes(row.status));
    const claims = db.claims.filter(row => row.insurer === insurer);
    return `<div class="page-heading"><div><h1>保險公司演示工作台</h1><p>草稿→合成審核→自願學平險上架；承保公司不能核保自己的商品。此處不是實際保險銷售或交易。</p></div></div>
      <section class="panel"><label class="field">演示公司<select data-insurer-select>${INSURER_SEED.map(row => `<option value="${row.id}" ${row.id === insurer ? "selected" : ""}>${esc(row.label)}</option>`).join("")}</select></label><p class="muted">${esc(SYNTHETIC_DATA_NOTICE)}。角色選擇僅供本機演示，並非身份驗證。</p><button class="button" data-action="create-product">建立學平險商品草稿</button></section>
      <section class="panel" id="product-workflow"><h2>自家商品／完整上架流程</h2><p>必填責任、限額／費用示例、期限、除外、條款版本、來源；保存後預覽，再提交合成監管審查。</p><div class="workflow-list">${ownProducts.map(productEditor).join("")}</div></section>
      <section class="panel" id="underwriting-queue"><h2>指定核保隊列</h2><p>顯示無意義合成標記與寬泛年齡組，不含真實身份資料。操作只改本機演示狀態。</p>${underwriting.length ? underwriting.map(row => applicationCard(db, row, "underwriting", insurer)).join("") : "<p>目前沒有指定給此演示公司的申請。</p>"}</section>
      <section class="panel"><h2>利益衝突保護</h2><p>此公司發布的商品不可由同一演示公司核保；下面的嘗試按鈕應被業務層拒絕。</p>${conflicts.map(row => `<article class="workflow-card"><span class="tag">應由其他演示公司處理</span><h3>${esc(row.id)}</h3><button class="button secondary" data-action="attempt-conflict-underwriting" data-id="${esc(row.id)}">嘗試由商品公司核保（應拒絕）</button></article>`).join("") || "<p>無衝突案件。</p>"}</section>
      <section class="panel"><h2>自家商品演示理賠隊列</h2><p>只處理本公司商品下的演示保單與抽象案例；不涉及醫保報銷或真實病歷。</p>${claims.length ? claims.map(row => claimCard(db, row, "insurer", insurer)).join("") : "<p>目前沒有本公司演示理賠案例。</p>"}</section>`;
  }
  function monthlyReportRows(filters) {
    const regionWeights = [0.42, 0.33, 0.25], insurerWeights = [0.4, 0.34, 0.26];
    return GOVERNMENT_REPORT_FIXTURE.monthly.flatMap(row => REGIONS.flatMap((region, regionIndex) =>
      INSURER_SEED.map((company, companyIndex) => {
        const weight = regionWeights[regionIndex] * insurerWeights[companyIndex];
        return {
          ...row, regionId: region.id, insurerId: company.id,
          applications: Math.round(row.applications * weight),
          underwritten: Math.round(row.underwritten * weight),
          policies: Math.round(row.policies * weight),
          claims: Math.round(row.claims * weight),
          closedClaims: Math.round(row.closedClaims * weight),
        };
      }))).filter(row =>
        (filters.regionId === "all" || row.regionId === filters.regionId) &&
        (filters.insurerId === "all" || row.insurerId === filters.insurerId) &&
        (filters.schoolYear === "all" || row.schoolYear === filters.schoolYear) &&
        (filters.month === "all" || row.month === filters.month));
  }
  function reportScope(row, filters, db) {
    const app = row.applicationId ? db.applications.find(item => item.id === row.applicationId) : row;
    const owner = row.productSnapshot?.insurer || row.insurer || row.product?.insurer;
    const month = row.eventMonth || row.createdMonth || app?.createdMonth;
    return (filters.regionId === "all" || app?.regionId === filters.regionId) &&
      (filters.schoolYear === "all" || app?.schoolYear === filters.schoolYear) &&
      (filters.month === "all" || month === filters.month) &&
      (filters.insurerId === "all" || owner === filters.insurerId);
  }
  function governmentPage(db, filters) {
    const apps = db.applications.filter(row => row.status !== "legacy-existing" && reportScope(row, filters, db));
    const policies = db.policies.filter(row => {
      const app = db.applications.find(item => item.id === row.applicationId);
      return app && reportScope(app, filters, db);
    });
    const claims = db.claims.filter(row => reportScope(row, filters, db));
    const products = db.products.filter(row => filters.insurerId === "all" || row.insurer === filters.insurerId);
    const guideRows = GOVERNMENT_REPORT_FIXTURE.policyGuide.filter(row =>
      (filters.regionId === "all" || row.regionId === filters.regionId) &&
      (filters.schoolYear === "all" || row.schoolYear === filters.schoolYear));
    const monthly = monthlyReportRows(filters);
    const monthTotals = REPORT_MONTHS.map(month => {
      const rows = monthly.filter(row => row.month === month);
      if (!rows.length) return null;
      return {
        month,
        applications: rows.reduce((sum, row) => sum + row.applications, 0),
        policies: rows.reduce((sum, row) => sum + row.policies, 0),
        claims: rows.reduce((sum, row) => sum + row.claims, 0),
      };
    }).filter(Boolean);
    const states = APPLICATION_STATES.filter(state => state !== "legacy-existing").map(state => ({
      state, count: apps.filter(row => row.status === state).length,
    }));
    const claimStates = CLAIM_STATES.map(state => ({ state, count: claims.filter(row => row.status === state).length }));
    const companyRows = INSURER_SEED.filter(row => filters.insurerId === "all" || row.id === filters.insurerId).map(company => {
      const companyProducts = products.filter(row => row.insurer === company.id);
      const companyApps = apps.filter(row => row.productSnapshot.insurer === company.id);
      const companyPolicies = policies.filter(row => row.insurer === company.id);
      const companyClaims = claims.filter(row => row.insurer === company.id);
      return {
        label: company.label,
        total: companyProducts.length,
        drafts: companyProducts.filter(row => row.status === "draft").length,
        awaitingReview: companyProducts.filter(row => row.status === "pending-review").length,
        returned: companyProducts.filter(row => row.status === "returned").length,
        approved: companyProducts.filter(row => row.status === "approved").length,
        rejected: companyProducts.filter(row => row.status === "rejected").length,
        published: companyProducts.filter(row => row.status === "published").length,
        withdrawn: companyProducts.filter(row => row.status === "withdrawn").length,
        coverageTypes: COVERAGE_TYPES.map(type =>
          `${type} ${companyProducts.filter(row => row.coverageTypes.includes(type)).length}`).join("、"),
        applications: companyApps.length, policies: companyPolicies.length, claims: companyClaims.length,
      };
    });
    const geoRows = GOVERNMENT_REPORT_FIXTURE.geography.filter(row =>
      filters.regionId === "all" || row.regionId === filters.regionId);
    const reviewQueue = products.filter(row => row.status === "pending-review");
    const maxTrend = Math.max(1, ...monthTotals.map(row => row.applications));
    return `<div class="page-heading"><div><span class="eyebrow">AGGREGATE OVERSIGHT</span><h1>政策、商品與整體流程報表</h1><p>${SYNTHETIC_DATA_NOTICE}；只顯示聚合數，不顯示學生、申請、保單或理賠個體行。</p></div></div>
      <section class="panel" id="product-review-queue"><h2>待審學平險商品（演示）</h2><p>審核只處理合成商品资料，不是正式监管批准、产品备案或销售许可。</p>${reviewQueue.length ? reviewQueue.map(row => `<article class="workflow-card"><span class="tag">${esc(STATE_LABELS[row.status])}</span><h3>${esc(row.id)}｜${esc(insurerLabel(row.insurer))}｜${esc(row.name)}</h3><p>${esc(row.benefit)}｜限額／費用示例 ${row.limitAmount}/${row.feeAmount} 演示元</p><p>期限：${esc(row.term)}｜條款：${esc(row.version)}｜來源：${esc(row.source)}</p><p>除外摘要：${esc(row.exclusions)}</p><div class="workflow-actions"><button class="button" data-action="review-product" data-id="${esc(row.id)}" data-decision="approve" data-reason="${esc(PRODUCT_REVIEW_REASONS[0])}">演示通過</button><button class="button secondary" data-action="review-product" data-id="${esc(row.id)}" data-decision="return" data-reason="${esc(PRODUCT_REVIEW_REASONS[1])}">演示退回修改</button><button class="button danger" data-action="review-product" data-id="${esc(row.id)}" data-decision="reject" data-reason="${esc(PRODUCT_REVIEW_REASONS[2])}">演示拒絕</button></div></article>`).join("") : "<p>目前沒有待審合成商品。</p>"}</section>
      <section class="panel" id="management-summary"><h2>報表篩選</h2><div class="report-filters">
        <label class="field">合成地區<select data-report-filter="regionId"><option value="all">全部合成地區</option>${REGIONS.map(row => `<option value="${row.id}" ${filters.regionId === row.id ? "selected" : ""}>${esc(row.name)}</option>`).join("")}</select></label>
        <label class="field">演示學年<select data-report-filter="schoolYear"><option value="all">全部演示學年</option>${YEARS.map(row => `<option value="${row}" ${filters.schoolYear === row ? "selected" : ""}>${row}</option>`).join("")}</select></label>
        <label class="field">月份<select data-report-filter="month"><option value="all">全部月份</option>${REPORT_MONTHS.map(row => `<option value="${row}" ${filters.month === row ? "selected" : ""}>${row}</option>`).join("")}</select></label>
        <label class="field">公司<select data-report-filter="insurerId"><option value="all">全部演示公司</option>${INSURER_SEED.map(row => `<option value="${row.id}" ${filters.insurerId === row.id ? "selected" : ""}>${esc(row.label)}</option>`).join("")}</select></label>
      </div></section>
      <div class="metrics"><article class="metric"><span>樣本申請／核保</span><strong>${apps.length}</strong></article><article class="metric"><span>模擬繳費演示保單</span><strong>${policies.length}</strong></article><article class="metric"><span>學平險演示理賠案例</span><strong>${claims.length}</strong></article><article class="metric"><span>商品版本</span><strong>${products.length}</strong></article></div>
      <section class="panel"><h2>醫保政策指引展示狀態</h2><p class="muted">只呈示合成地區的政策入口版本；沒有官方參保或報銷核驗。</p><div class="table-wrap"><table><thead><tr><th>地區</th><th>學年</th><th>指引版本</th><th>來源狀態</th></tr></thead><tbody>${guideRows.map(row => `<tr><td>${esc(REGIONS.find(region => region.id === row.regionId).name)}</td><td>${esc(row.schoolYear)}</td><td>${esc(row.version)}</td><td>${esc(row.status)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><h2>12個月合成業務趨勢</h2><div class="bar-chart">${monthTotals.map(row => `<div class="bar-row"><span>${row.month}</span><div class="bar-track"><i style="width:${Math.max(3, Math.round(row.applications / maxTrend * 100))}%"></i></div><strong>申請 ${row.applications}｜保單 ${row.policies}｜理賠 ${row.claims}</strong></div>`).join("")}</div><p class="muted">趨勢由固定月度合成陣列依所選維度確定性彙總，不代表實際市場量。</p></section>
      <section class="panel"><h2>公司／商品生命周期聚合</h2><div class="table-wrap"><table><thead><tr><th>演示公司</th><th>版本數</th><th>責任類型商品數</th><th>草稿</th><th>待審</th><th>退回</th><th>已通過待發布</th><th>拒絕</th><th>已發布</th><th>已撤回</th><th>申請</th><th>演示保單</th><th>理賠</th></tr></thead><tbody>${companyRows.map(row => `<tr><td>${esc(row.label)}</td><td>${row.total}</td><td>${esc(row.coverageTypes)}</td><td>${row.drafts}</td><td>${row.awaitingReview}</td><td>${row.returned}</td><td>${row.approved}</td><td>${row.rejected}</td><td>${row.published}</td><td>${row.withdrawn}</td><td>${row.applications}</td><td>${row.policies}</td><td>${row.claims}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><h2>投保／核保狀態聚合</h2><div class="state-grid">${states.map(row => `<div><span>${esc(applicationStatusLabel(row.state))}</span><strong>${row.count}</strong></div>`).join("")}</div></section>
      <section class="panel"><h2>理賠狀態聚合</h2><div class="state-grid">${claimStates.map(row => `<div><span>${esc(claimStatusLabel(row.state))}</span><strong>${row.count}</strong></div>`).join("")}</div></section>
      <section class="panel"><h2>地區分布（固定聚合示例）</h2><div class="table-wrap"><table><thead><tr><th>地區</th><th>政策指引展示</th><th>商品瀏覽</th><th>申請意向</th><th>演示保單</th><th>理賠案例</th></tr></thead><tbody>${geoRows.map(row => `<tr><td>${esc(REGIONS.find(region => region.id === row.regionId).name)}</td><td>${row.guideViews}</td><td>${row.productViews}</td><td>${row.applications}</td><td>${row.policies}</td><td>${row.claims}</td></tr>`).join("")}</tbody></table></div></section>`;
  }
  function schoolPage() {
    const fixture = SCHOOL_REPORT_FIXTURE;
    const total = fixture.monthly.reduce((acc, row) => ({
      policyViews: acc.policyViews + row.policyViews,
      intentions: acc.intentions + row.intentions,
      productReads: acc.productReads + row.productReads,
      noticeReads: acc.noticeReads + row.noticeReads,
    }), { policyViews: 0, intentions: 0, productReads: 0, noticeReads: 0 });
    const cohorts = fixture.cohorts.filter(row =>
      row.policyViews >= fixture.sampleThreshold && row.intentions >= fixture.sampleThreshold &&
      row.productReads >= fixture.sampleThreshold && row.noticeReads >= fixture.sampleThreshold);
    return `<div class="page-heading"><div><span class="eyebrow">SCHOOL AGGREGATES</span><h1>本校學生保障合成報表</h1><p>${SYNTHETIC_DATA_NOTICE}；固定範例只對應 ${esc(schoolLabel(fixture.schoolId))}，不顯示學生名單、投保或理賠個案。</p></div></div>
      <div class="metrics"><article class="metric"><span>醫保政策閱讀累計</span><strong>${total.policyViews}</strong></article><article class="metric"><span>家庭意向合計</span><strong>${total.intentions}</strong></article><article class="metric"><span>學平險資訊閱讀</span><strong>${total.productReads}</strong></article><article class="metric"><span>通知閱讀合計</span><strong>${total.noticeReads}</strong></article></div>
      <section class="panel"><h2>12個月本校聚合趨勢</h2><div class="table-wrap"><table><thead><tr><th>月份</th><th>醫保政策閱讀</th><th>家庭意向</th><th>學平險資訊閱讀</th><th>通知閱讀</th></tr></thead><tbody>${fixture.monthly.map(row => `<tr><td>${row.month}</td><td>${row.policyViews}</td><td>${row.intentions}</td><td>${row.productReads}</td><td>${row.noticeReads}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><h2>通知覆蓋與狀態（合成）</h2><div class="table-wrap"><table><thead><tr><th>通知</th><th>狀態</th><th>模擬覆蓋</th><th>閱讀合計</th></tr></thead><tbody>${fixture.notices.map(row => `<tr><td>${esc(row.name)}</td><td>${esc(row.status)}</td><td>${row.reached}/${row.audience}</td><td>${row.read}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><h2>合成分組匯總</h2><p class="muted">小於 ${fixture.sampleThreshold} 的分組將抑制；不列個體行。</p><div class="table-wrap"><table><thead><tr><th>合成分組</th><th>政策閱讀</th><th>家庭意向</th><th>學平險閱讀</th><th>通知閱讀</th></tr></thead><tbody>${cohorts.map(row => `<tr><td>${esc(row.id.replace("SYN-COHORT-", "合成分組"))}</td><td>${row.policyViews}</td><td>${row.intentions}</td><td>${row.productReads}</td><td>${row.noticeReads}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel" id="school-info"><h2>一般保障資訊</h2><p>學生醫保按當地資格、辦理和適用期向官方渠道查核；學平險是自願商業補充，須由家庭自行閱讀正式條款。</p><p>學校端僅示範本校聚合統計，不可查看學生個人保單、申請或醫療資料；校方責任險由另一平台管理。</p></section>`;
  }
  function pageContent(db, role, page, profileId, insurer, compareProductIds, reportFilters) {
    const published = db.products.filter(row => row.status === "published");
    if (role === "student-parent" && page === "home") {
      return `<div class="page-heading"><div><span class="eyebrow">STUDENT PROTECTION MARKETPLACE</span><h1>學生保障 Marketplace</h1><p>醫保打底，學平險自願補充。選擇下方兩類保障查看。</p></div></div>
        <div class="grid"><section class="panel"><h2>城鄉居民基本醫療保險（學生醫保）</h2><p>依地區／學年查看政策、資格及官方辦理提示；不是保險公司商品，不做官方參保或報銷核驗。</p><button class="button" data-nav="guide">查看醫保政策</button></section>
        <section class="panel"><h2>商業學平險 Marketplace</h2><p>多家保險公司上架自願商品；目前 ${published.length} 個已發布合成商品。家庭可比較條款與來源。</p><button class="button" data-nav="products">比較學平險</button></section></div>
        <div class="callout">不宣稱全國統一強制。保障可能重疊時只提示核查，不判斷責任或賠付。學校責任險屬另一平台。</div>`;
    }
    if (role === "student-parent" && page === "guide") {
      const region = REGIONS.find(row => row.id === db.context.regionId);
      const fixture = GOVERNMENT_REPORT_FIXTURE.policyGuide.find(row => row.regionId === db.context.regionId && row.schoolYear === db.context.schoolYear);
      return `<div class="page-heading"><div><h1>城鄉居民基本醫療保險（學生醫保）</h1><p>基礎保障政策入口，不是商業商品或參保狀態查詢。</p></div></div><section class="panel"><h2>選擇地區與學年</h2><div class="field-row"><label class="field">合成地區<select data-context-select>${REGIONS.map(row => `<option value="${esc(row.id)}" ${row.id === db.context.regionId ? "selected" : ""}>${esc(row.name)}</option>`).join("")}</select></label><label class="field">學年<select data-year-select>${YEARS.map(row => `<option ${row === db.context.schoolYear ? "selected" : ""}>${esc(row)}</option>`).join("")}</select></label></div><p>${esc(region.policyVersion)}｜${esc(fixture.status)}</p><p>請向所在地醫保官方渠道核實資格、辦理方式、適用期及疾病就醫／住院待遇；本原型沒有真實辦理連結或官方查詢功能。</p></section>`;
    }
    if (role === "student-parent" && page === "products") return marketplacePage(db, profileId, compareProductIds);
    if (role === "insurer") return insurerPage(db, insurer);
    if (role === "regulator") return governmentPage(db, reportFilters);
    if (role === "school") return schoolPage();
    return `<div class="empty">找不到此頁面。</div>`;
  }
  function renderWorkspaceBase(db, role, page, profileId, insurer, compareProductIds, reportFilters) {
    const menu = MENUS[role];
    const title = PAGE_LABELS[page] || "工作台";
    const nav = menu.map(([id, label, symbol]) => `<button class="nav-item" type="button" data-nav="${esc(id)}" aria-current="${id === page ? "page" : "false"}"><span class="nav-icon">${esc(symbol)}</span><span>${esc(label)}</span></button>`).join("");
    const profile = db.profiles.find(row => row.id === profileId && canManageProfile(db, row.id));
    const principal = role === "student-parent" ? profile?.displayName || "學生／家長" : ROLE_LABELS[role];
    return `<div class="app-shell"><aside class="sidebar"><a class="brand sidebar-brand" href="#/${role}/${menu[0][0]}"><span class="brand-mark">學</span><span><strong>學生保障服務</strong><small>獨立演示工作台</small></span></a><div class="side-label">${esc(ROLE_LABELS[role])}功能</div><nav>${nav}</nav><div class="sidebar-note">${SYNTHETIC_DATA_NOTICE}</div></aside><main class="main-area"><header class="topbar"><div><span class="breadcrumb">${esc(ROLE_LABELS[role])} / ${esc(title)}</span><strong>${esc(principal)}</strong></div><div class="top-actions"><button class="button secondary" type="button" data-action="open-guide">操作說明書</button><span class="business-date">演示日 ${BUSINESS_DATE}</span><a class="button secondary" href="#/login">切換角色</a></div></header><div class="page-content" id="page-content">${pageContent(db, role, page, profileId, insurer, compareProductIds, reportFilters)}<section class="synthetic-note"><strong>合成演示</strong><span>${SYNTHETIC_DATA_NOTICE}；不代表官方政策、真實產品、承保或有效保障。請勿輸入真實身份、醫療、學籍或支付資料。</span></section></div></main></div>`;
  }
  function renderWorkspace(db, role, page, profileId, insurer = PRODUCT_SEED[0].insurer, compareProductIds = [], reportFilters = { regionId: "all", schoolYear: "all", month: "all", insurerId: "all" }) {
    return renderWorkspaceBase(db, role, page, profileId, insurer, compareProductIds, reportFilters);
  }
  function parseRoute() {
    const parts = global.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!parts.length || parts[0] === "login") return { role: null, page: "login" };
    if (!ROLES.includes(parts[0])) return { role: null, page: "login" };
    const role = parts[0];
    const page = MENUS[role].some(row => row[0] === parts[1]) ? parts[1] : MENUS[role][0][0];
    return { role, page };
  }
  function init() {
    const root = document.querySelector("#app"), errorBox = document.querySelector("#app-error");
    const recoveryBox = document.querySelector("#student-storage-recovery");
    const exportBackup = document.querySelector("#export-student-storage");
    const exportDiagnostics = document.querySelector("#export-student-diagnostics");
    const diagnosticsView = document.querySelector("#student-storage-diagnostics");
    const recoveryStatus = document.querySelector("#student-recovery-status");
    const recoveryFile = document.querySelector("#import-student-backup");
    const restoreButton = document.querySelector("#restore-student-backup");
    const backupConfirmation = document.querySelector("#confirm-student-backup");
    const guide = document.querySelector("#student-guide");
    const guideBody = document.querySelector("#guide-body");
    const guideProgress = document.querySelector("#guide-progress");
    const guideRole = document.querySelector("#guide-role");
    const guideHeading = document.querySelector("#guide-heading");
    const guideText = document.querySelector("#guide-text");
    const guideDone = document.querySelector("#guide-done");
    const guideIndex = { value: Number(global.sessionStorage.getItem("student-guide-step")) || 0 };
    const guideScroll = new Map();
    const guideLayout = { rect: null, maximized: false };
    let guideDrag = null;
    let db;
    let currentRole = null, page = "login";
    let profileId = global.sessionStorage.getItem(PROFILE_KEY) || "SYN-STU-0001";
    let insurer = INSURERS[0];
    let compareProductIds = [];
    let reportFilters = { regionId: "all", schoolYear: "all", month: "all", insurerId: "all" };
    let guideOpen = false;
    let guideReturnFocus = null;
    let recoverySourceRaw = null;
    let recoveryDiagnostic = null;
    let recoveryCandidate = null;
    document.querySelector("#guide-step-select").innerHTML = WALKTHROUGH
      .map((step, index) => `<option value="${index}">${index + 1}. ${esc(step.title)}</option>`).join("");

    function showError(message) {
      errorBox.hidden = false;
      errorBox.textContent = message;
    }
    function showStorageRecovery(message) {
      showError(message);
      recoveryBox.hidden = false;
      document.querySelectorAll('[data-action="reset"]').forEach(button => { button.hidden = true; });
      recoverySourceRaw = global.localStorage.getItem(STORAGE_KEY);
      recoveryDiagnostic = diagnoseSave(recoverySourceRaw || "");
      const diagnosis = recoveryDiagnostic;
      diagnosticsView.textContent = [
        `存檔結構診斷（不含業務內容）：JSON ${diagnosis.readableJson ? "可讀" : "無法解析"}`,
        `schemaVersion ${diagnosis.schemaVersion ?? "未識別"}`,
        `合成標記 ${diagnosis.syntheticMarker === null ? "無法判讀" : diagnosis.syntheticMarker ? "符合" : "不符"}`,
        `演示日期 ${diagnosis.businessDateMatches ? "符合" : "不符／缺少"}`,
        `scenario ${diagnosis.scenarioMatches ? "符合" : diagnosis.scenarioMissing ? "缺少" : "不符"}`,
        `遷移後驗證 ${diagnosis.migrationValid ? "通過" : `未通過：${diagnosis.validationReason}`}`,
      ].join("；");
      recoveryStatus.textContent = "尚未恢復任何檔案。下載原始備份後，可選擇其他已匯出的 JSON 存檔進行本機驗證。";
    }
    function downloadText(contents, filename, type) {
      const blob = new Blob([contents], { type });
      const url = global.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      global.setTimeout(() => global.URL.revokeObjectURL(url), 0);
    }
    function downloadOriginalSave() {
      const original = global.localStorage.getItem(STORAGE_KEY);
      if (original === null) return showError("找不到學生端存檔；沒有資料被更改。");
      downloadText(original, `student-demo-local-storage-backup-${BUSINESS_DATE}.json`,
        "application/json;charset=utf-8");
    }
    function downloadSafeDiagnostics() {
      if (!recoveryDiagnostic) return;
      downloadText(JSON.stringify({
        product: "student-insurance-demo",
        storageKey: STORAGE_KEY,
        ...recoveryDiagnostic,
      }, null, 2), `student-demo-recovery-diagnostics-${BUSINESS_DATE}.json`,
      "application/json;charset=utf-8");
    }
    function validateRecoveryFile(file) {
      recoveryCandidate = null;
      restoreButton.disabled = true;
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        recoveryStatus.textContent = "備份超過 5 MiB，已拒絕讀取；原存檔未變更。";
        return;
      }
      file.text().then(text => {
        let candidate;
        try {
          candidate = migrate(JSON.parse(text));
        } catch {
          recoveryStatus.textContent = "此檔案不是可解析的演示存檔；原存檔未變更。";
          return;
        }
        const errors = validate(candidate);
        if (errors.length) {
          const diagnosis = diagnoseSave(text);
          recoveryStatus.textContent =
            `檔案未通過安全驗證（schemaVersion ${diagnosis.schemaVersion ?? "未識別"}；${errors[0]}）；原存檔未變更。請保留備份及脫敏診斷檔，交由專案維護者私下確認。`;
          return;
        }
        const normalized = JSON.stringify(candidate);
        recoveryCandidate = { data: candidate, serialized: normalized, migrated: normalized !== text };
        restoreButton.disabled = !backupConfirmation.checked;
        const count = ["applications", "policies", "claims"].map(key =>
          `${key} ${candidate[key].length}`).join("、");
        recoveryStatus.textContent =
          `檔案驗證通過；${count}。${recoveryCandidate.migrated ? "將先轉換為目前 schema 再恢復。" : "可恢復目前版本存檔。"}請先下載並確認原始備份。`;
      }).catch(() => {
        recoveryStatus.textContent = "讀取備份失敗；原存檔未變更。";
      });
    }
    function restoreValidatedBackup() {
      if (!backupConfirmation.checked || !recoveryCandidate || recoverySourceRaw === null) {
        recoveryStatus.textContent = "請先下載原始備份、勾選確認並選擇通過驗證的檔案。";
        return;
      }
      if (global.localStorage.getItem(STORAGE_KEY) !== recoverySourceRaw) {
        recoveryStatus.textContent = "目前瀏覽器存檔已改變，為避免覆蓋其他分頁的更新，恢復已取消；請重新載入後再檢查。";
        return;
      }
      const errors = validate(recoveryCandidate.data);
      if (errors.length) {
        recoveryCandidate = null;
        restoreButton.disabled = true;
        recoveryStatus.textContent = `恢復前二次驗證失敗（${errors[0]}）；原存檔未變更。`;
        return;
      }
      try {
        global.localStorage.setItem(STORAGE_KEY, recoveryCandidate.serialized);
      } catch {
        recoveryStatus.textContent = "瀏覽器未能保存恢復結果；原存檔未變更。請先保留原始備份與診斷檔。";
        return;
      }
      global.location.reload();
    }
    function draw() {
      if (currentRole === "student-parent" && !canManageProfile(db, profileId)) profileId = "SYN-STU-0001";
      root.innerHTML = currentRole ? renderWorkspace(db, currentRole, page, profileId, insurer, compareProductIds, reportFilters) : roleCards();
      syncGuideEntry();
    }
    function applyRoute() {
      const route = parseRoute();
      currentRole = route.role;
      page = route.page;
      if (currentRole === "student-parent" && !canManageProfile(db, profileId)) profileId = "SYN-STU-0001";
      global.sessionStorage.setItem(SESSION_KEY, currentRole || "");
      draw();
      if (guideOpen) updateGuide();
    }
    function persist(next) {
      const errors = validate(next);
      if (errors.length) throw new Error(errors[0]);
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      db = next;
      draw();
      if (guideOpen) updateGuide();
    }
    function execute(action, payload) {
      const result = run(db, currentRole, action, payload);
      if (!result.ok) {
        showError(result.message);
        return false;
      }
      errorBox.hidden = true;
      persist(result.db);
      return true;
    }
    function guideStep() { return WALKTHROUGH[Math.max(0, Math.min(guideIndex.value, WALKTHROUGH.length - 1))]; }
    function syncGuideEntry() {
      const entry = root.querySelector('[data-action="open-guide"]');
      if (entry) entry.hidden = guideOpen || !document.querySelector("#guide-launcher").hidden;
    }
    function updateGuide() {
      const index = Math.max(0, Math.min(guideIndex.value, WALKTHROUGH.length - 1));
      guideIndex.value = index;
      global.sessionStorage.setItem("student-guide-step", String(index));
      const step = guideStep();
      guideRole.textContent = `本步角色：${ROLE_LABELS[step.role]}`;
      guideHeading.textContent = step.title;
      guideText.textContent = step.text;
      guideDone.textContent = step.done;
      guideProgress.textContent = `第 ${index + 1} / ${WALKTHROUGH.length} 步`;
      document.querySelector("#guide-launcher-step").textContent = `第 ${index + 1}/${WALKTHROUGH.length} 步`;
      document.querySelector("#guide-step-select").value = String(index);
      document.querySelector('[data-action="guide-previous"]').disabled = index === 0;
      document.querySelector('[data-action="guide-next"]').disabled = index === WALKTHROUGH.length - 1;
      const saved = guideScroll.get(index) || 0;
      guideBody.scrollTop = saved;
    }
    function setGuideOpen(open) {
      guideOpen = open;
      guide.hidden = !open;
      document.body.classList.toggle("guide-open", open);
      document.querySelector("#guide-launcher").hidden = open;
      document.querySelector("#guide-launcher").setAttribute("aria-expanded", String(open));
      syncGuideEntry();
      applyGuideLayout();
      if (open) updateGuide();
      else {
        guideScroll.set(guideIndex.value, guideBody.scrollTop);
        guideBody.scrollTop = 0;
        positionPointer();
      }
    }
    function constrainGuideRect(rect) {
      const minWidth = Math.min(360, global.innerWidth);
      const minHeight = Math.min(520, global.innerHeight);
      const width = Math.min(global.innerWidth, Math.max(minWidth, rect.width));
      const height = Math.min(global.innerHeight, Math.max(minHeight, rect.height));
      return {
        left: Math.max(0, Math.min(rect.left, global.innerWidth - width)),
        top: Math.max(0, Math.min(rect.top, global.innerHeight - height)),
        width, height,
      };
    }
    function applyGuideLayout() {
      const maximize = document.querySelector('[data-action="guide-maximize"]');
      const small = isCompactViewport();
      const label = guideLayout.maximized
        ? "還原操作說明書（返回放大前尺寸與位置）"
        : "最大化操作說明書";
      maximize.setAttribute("aria-label", label);
      if (small) {
        const mobileLabel = guideLayout.maximized ? "退出全螢幕閱讀" : "全螢幕閱讀";
        maximize.setAttribute("aria-label", mobileLabel);
        maximize.setAttribute("title", mobileLabel);
      } else maximize.setAttribute("title", label);
      maximize.setAttribute("aria-pressed", String(guideLayout.maximized));
      maximize.textContent = guideLayout.maximized ? "▣" : "□";
      guide.classList.toggle("guide-mobile-fullscreen", small && guideLayout.maximized);
      if (small && guideLayout.maximized && guideOpen) guide.setAttribute("aria-modal", "true");
      else guide.removeAttribute("aria-modal");
      if (small || (!guideLayout.rect && !guideLayout.maximized)) {
        for (const property of ["left", "top", "right", "bottom", "width", "height"]) {
          guide.style.removeProperty(property);
        }
      } else {
        const rect = guideLayout.maximized
          ? { left: 8, top: 8, width: global.innerWidth - 16, height: global.innerHeight - 16 }
          : (guideLayout.rect = constrainGuideRect(guideLayout.rect));
        guide.style.right = "auto";
        guide.style.bottom = "auto";
        for (const [property, value] of Object.entries(rect)) guide.style[property] = `${value}px`;
      }
    }
    function startGuideDrag(event) {
      const handle = event.target.closest("[data-guide-resize]");
      const header = event.target.closest("#guide-titlebar");
      if ((!handle && !header) || event.target.closest("button") || event.button !== 0 ||
          isCompactViewport()) return;
      event.preventDefault();
      const rect = guide.getBoundingClientRect();
      guideLayout.maximized = false;
      guideLayout.rect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      guideDrag = {
        pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        edge: handle?.dataset.guideResize || "", rect: { ...guideLayout.rect },
        target: handle || header,
      };
      guideDrag.target.setPointerCapture(event.pointerId);
      applyGuideLayout();
    }
    function moveGuideDrag(event) {
      if (!guideDrag || guideDrag.pointerId !== event.pointerId) return;
      const { rect, edge } = guideDrag;
      const dx = event.clientX - guideDrag.x, dy = event.clientY - guideDrag.y;
      const minWidth = Math.min(360, global.innerWidth);
      const minHeight = Math.min(520, global.innerHeight);
      const next = { ...rect };
      if (!edge) {
        next.left += dx;
        next.top += dy;
      } else {
        if (edge.includes("e")) next.width = Math.min(global.innerWidth - rect.left, Math.max(minWidth, rect.width + dx));
        if (edge.includes("s")) next.height = Math.min(global.innerHeight - rect.top, Math.max(minHeight, rect.height + dy));
        if (edge.includes("w")) {
          next.left = Math.max(0, Math.min(rect.left + dx, rect.left + rect.width - minWidth));
          next.width = rect.left + rect.width - next.left;
        }
        if (edge.includes("n")) {
          next.top = Math.max(0, Math.min(rect.top + dy, rect.top + rect.height - minHeight));
          next.height = rect.top + rect.height - next.top;
        }
      }
      guideLayout.rect = constrainGuideRect(next);
      applyGuideLayout();
    }
    function endGuideDrag(event) {
      if (!guideDrag || guideDrag.pointerId !== event.pointerId) return;
      if (guideDrag.target.hasPointerCapture(event.pointerId)) guideDrag.target.releasePointerCapture(event.pointerId);
      guideDrag = null;
    }
    function positionPointer() {
      const pointer = document.querySelector("#guide-pointer");
      const target = document.querySelector(".guide-highlight");
      if (!target || guideOpen) { pointer.hidden = true; return; }
      const rect = target.getBoundingClientRect();
      pointer.hidden = rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth;
      if (pointer.hidden) return;
      pointer.textContent = rect.top > 48 ? "↓ 請看這裡" : "↑ 請看這裡";
      pointer.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 120))}px`;
      pointer.style.top = `${rect.top > 48 ? rect.top - 34 : Math.min(rect.bottom + 5, innerHeight - 34)}px`;
    }
    function locateTarget(scroll) {
      document.querySelectorAll(".guide-highlight").forEach(node => node.classList.remove("guide-highlight"));
      const step = guideStep();
      const target = document.querySelector(step.selector);
      const status = document.querySelector("#guide-location");
      if (!target) {
        status.textContent = "目前找不到此功能入口；請確認角色及前置步驟。說明書不會替你執行業務操作。";
        return;
      }
      target.classList.add("guide-highlight");
      status.textContent = "已定位功能入口；箭頭只提示，不會代替點擊或提交。";
      if (scroll) {
        setGuideOpen(false);
        target.scrollIntoView({ block: "center", inline: "nearest" });
      }
      positionPointer();
    }
    function navigateGuide() {
      const step = guideStep();
      if (step.page === "login") {
        global.history.replaceState(null, "", "#/login");
        currentRole = null;
        page = "login";
        draw();
        locateTarget(false);
        return;
      }
      if (currentRole !== step.role) {
        global.history.replaceState(null, "", "#/login");
        currentRole = null;
        page = "login";
        draw();
        document.querySelector("#guide-location").textContent =
          `請先在角色卡選擇「${ROLE_LABELS[step.role]}」；定位操作不會替你切換角色或執行業務。`;
        const roleCard = document.querySelector(`[data-role-card="${step.role}"]`);
        roleCard?.classList.add("guide-highlight");
        return;
      }
      global.history.replaceState(null, "", `#/${step.role}/${step.page}`);
      currentRole = step.role;
      page = step.page;
      draw();
      locateTarget(true);
    }
    function resetStudentDemo() {
      if (!global.confirm("只重置學生保障平台的合成演示存檔與角色；不影響學校責任險平台資料。確定重置？")) return;
      global.localStorage.removeItem(STORAGE_KEY);
      global.sessionStorage.removeItem(SESSION_KEY);
      global.sessionStorage.removeItem(PROFILE_KEY);
      global.location.hash = "#/login";
      global.location.reload();
    }
    function syncVisualViewport() {
      const height = global.visualViewport?.height || global.innerHeight;
      document.documentElement.style.setProperty("--student-viewport-height", `${height}px`);
    }
    function isCompactViewport() {
      return global.matchMedia("(max-width: 760px), (max-height: 500px) and (orientation: landscape)").matches;
    }

    document.addEventListener("click", event => {
      if (event.target.closest('[data-action="reset"]')) resetStudentDemo();
    });
    exportBackup.addEventListener("click", downloadOriginalSave);
    exportDiagnostics.addEventListener("click", downloadSafeDiagnostics);
    recoveryFile.addEventListener("change", () => validateRecoveryFile(recoveryFile.files?.[0]));
    backupConfirmation.addEventListener("change", () => {
      restoreButton.disabled = !backupConfirmation.checked || !recoveryCandidate;
    });
    restoreButton.addEventListener("click", restoreValidatedBackup);
    const saved = global.localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      db = createSeed();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } else {
      try {
        db = migrate(JSON.parse(saved));
      } catch {
        return showStorageRecovery("學生端存檔格式無法讀取，原始存檔仍未更動；請先下載備份。平台不會自動重置或覆蓋資料。");
      }
      const errors = validate(db);
      if (errors.length) return showStorageRecovery(`學生端存檔驗證／遷移未通過（${errors[0]}）。原始存檔仍未更動；請先下載備份。平台不會自動重置或覆蓋資料。`);
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
    global.addEventListener("hashchange", applyRoute);
    global.addEventListener("resize", positionPointer);
    document.addEventListener("scroll", positionPointer, true);
    guide.addEventListener("pointerdown", startGuideDrag);
    document.addEventListener("pointermove", moveGuideDrag);
    document.addEventListener("pointerup", endGuideDrag);
    document.addEventListener("pointercancel", endGuideDrag);
    root.addEventListener("click", event => {
      const roleLink = event.target.closest("[data-role]");
      if (roleLink) {
        profileId = "SYN-STU-0001";
        global.sessionStorage.setItem(PROFILE_KEY, profileId);
        currentRole = roleLink.dataset.role;
        page = MENUS[currentRole][0][0];
        global.location.hash = `#/${currentRole}/${page}`;
        draw();
        document.querySelectorAll(".guide-highlight").forEach(node => node.classList.remove("guide-highlight"));
        if (guideOpen) document.querySelector("#guide-location").textContent = "已進入對應角色工作台；本指南保留閱讀步驟，未執行任何業務操作。";
        return;
      }
      const nav = event.target.closest("[data-nav]");
      if (nav) {
        page = nav.dataset.nav;
        global.location.hash = `#/${currentRole}/${page}`;
        draw();
        if (guideOpen) updateGuide();
        return;
      }
      const selectProfile = event.target.closest("[data-profile-select]");
      if (selectProfile) return;
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const id = button.dataset.id;
      const card = button.closest(".workflow-card");
      const selectedItems = (selector, scope = card) =>
        [...(scope?.querySelectorAll(`${selector}:checked`) || [])].map(input => input.dataset.appSupplement || input.dataset.claimSupplement);
      if (button.dataset.action === "apply") {
        if (!document.querySelector("[data-demo-confirm]")?.checked) return showError("請先確認此操作僅建立合成演示申請，不是實際投保。");
        return execute("submitApplication", { profileId, productId: id, agreed: true });
      }
      if (button.dataset.action === "revoke") {
        if (!global.confirm("撤銷此合成代理的後續存取？既有申請、演示保單與理賠歷史會保留。")) return;
        return execute("revokeGuardian", { guardianId: id });
      }
      if (button.dataset.action === "create-product") return execute("createProductDraft", { insurer });
      if (button.dataset.action === "save-product") {
        const form = root.querySelector(`[data-product-editor="${CSS.escape(id)}"]`);
        if (!form) return showError("找不到演示商品草稿表單。");
        const fields = Object.fromEntries(["name", "benefit", "term", "exclusions", "version", "source", "limitAmount", "feeAmount"]
          .map(key => [key, form.elements.namedItem(key).value]));
        fields.limitAmount = Number(fields.limitAmount);
        fields.feeAmount = Number(fields.feeAmount);
        fields.coverageTypes = [...form.querySelectorAll("[data-coverage-type]:checked")].map(input => input.value);
        return execute("saveProductDraft", { productId: id, insurer, fields });
      }
      if (button.dataset.action === "submit-product") return execute("submitProductForReview", { productId: id, insurer });
      if (button.dataset.action === "publish-product") return execute("publishProduct", { productId: id, insurer });
      if (button.dataset.action === "withdraw-product") return execute("withdrawProduct", { productId: id, insurer });
      if (button.dataset.action === "create-revision") return execute("createProductRevision", { productId: id, insurer });
      if (button.dataset.action === "review-product") return execute("reviewProduct", {
        productId: id, decision: button.dataset.decision, reason: button.dataset.reason,
      });
      if (button.dataset.action === "request-application-supplement") {
        const itemIds = selectedItems("[data-app-supplement]");
        if (!itemIds.length) return showError("至少勾選一項合成補充清單。");
        return execute("requestUnderwritingSupplement", { applicationId: id, insurer, itemIds });
      }
      if (button.dataset.action === "approve-application" || button.dataset.action === "reject-application") {
        const approved = button.dataset.action === "approve-application";
        return execute("decideUnderwriting", {
          applicationId: id, insurer, decision: approved ? "approve" : "reject",
          reason: UNDERWRITING_REASONS[approved ? 0 : 1],
        });
      }
      if (button.dataset.action === "attempt-conflict-underwriting") {
        return execute("decideUnderwriting", {
          applicationId: id, insurer, decision: "approve", reason: UNDERWRITING_REASONS[0],
        });
      }
      if (button.dataset.action === "resubmit-application") {
        return execute("resubmitApplication", { applicationId: id, profileId, itemIds: selectedItems("[data-app-supplement]") });
      }
      if (button.dataset.action === "pay-application") {
        if (!global.confirm("這只是在本機記錄合成模擬繳費並建立非真實有效的演示保單。確定繼續？")) return;
        const application = db.applications.find(row => row.id === id);
        return execute("payApplication", { applicationId: id, profileId: application?.profileId, confirmed: true });
      }
      if (button.dataset.action === "submit-claim") {
        const form = root.querySelector("[data-claim-form]");
        const fields = new FormData(form);
        return execute("submitClaim", {
          policyId: fields.get("policyId"), profileId, category: fields.get("category"),
          eventMonth: fields.get("eventMonth"), claimedAmount: Number(fields.get("claimedAmount")),
        });
      }
      if (button.dataset.action === "start-claim-review") return execute("startClaimReview", { claimId: id, insurer });
      if (button.dataset.action === "request-claim-supplement") {
        const itemIds = selectedItems("[data-claim-supplement]");
        if (!itemIds.length) return showError("至少勾選一項合成材料清單占位。");
        return execute("requestClaimSupplement", { claimId: id, insurer, itemIds });
      }
      if (button.dataset.action === "resubmit-claim") {
        return execute("resubmitClaim", { claimId: id, profileId, itemIds: selectedItems("[data-claim-supplement]") });
      }
      if (["approve-claim", "partial-claim", "reject-claim"].includes(button.dataset.action)) {
        const amountInput = root.querySelector(`[data-claim-amount="${CSS.escape(id)}"]`);
        const decision = button.dataset.action === "approve-claim" ? "approve"
          : button.dataset.action === "partial-claim" ? "partial" : "reject";
        const claim = db.claims.find(row => row.id === id);
        const amount = decision === "reject" ? 0
          : decision === "partial" ? Math.max(1, Math.floor(claim.claimedAmount / 2))
            : Number(amountInput?.value);
        const reason = CLAIM_DECISION_REASONS[decision === "partial" ? 1 : decision === "reject" ? 2 : 0];
        return execute("decideClaim", { claimId: id, insurer, decision, amount, reason });
      }
      if (button.dataset.action === "pay-claim") {
        if (!global.confirm("僅記錄合成演示支付，不會發生真實轉帳或賠款。確定？")) return;
        return execute("payClaim", { claimId: id, insurer, confirmed: true });
      }
      if (button.dataset.action === "close-claim") return execute("closeClaim", { claimId: id, insurer });
    });
    root.addEventListener("change", event => {
      if (event.target.matches("[data-compare-product]")) {
        const id = event.target.dataset.compareProduct;
        if (event.target.checked) {
          const isMobile = isCompactViewport();
          if (isMobile && compareProductIds.length >= 2) {
            event.target.checked = false;
            return showError("手機版一次最多比較兩款；取消一款後即可選擇其他商品。");
          }
          if (!compareProductIds.includes(id)) compareProductIds.push(id);
        } else {
          compareProductIds = compareProductIds.filter(selected => selected !== id);
        }
        errorBox.hidden = true;
        const products = db.products.filter(row => row.published && compareProductIds.includes(row.id));
        const result = root.querySelector("[data-compare-results]");
        if (result) result.innerHTML = renderComparison(products);
      }
      if (event.target.matches("[data-insurer-select]")) {
        if (!INSURERS.includes(event.target.value)) return showError("合成保險公司無效。");
        insurer = event.target.value;
        errorBox.hidden = true;
        draw();
      }
      if (event.target.matches("[data-profile-select]")) {
        if (!canManageProfile(db, event.target.value)) return showError("此學生檔案不符合本人或有效演示代理權限。");
        profileId = event.target.value;
        global.sessionStorage.setItem(PROFILE_KEY, profileId);
        errorBox.hidden = true;
        draw();
      }
      if (event.target.matches("[data-context-select], [data-year-select]")) {
        const regionId = root.querySelector("[data-context-select]")?.value;
        const schoolYear = root.querySelector("[data-year-select]")?.value;
        if (regionId && schoolYear) execute("setContext", { regionId, schoolYear });
      }
      if (event.target.matches("[data-report-filter]")) {
        const key = event.target.dataset.reportFilter;
        const value = event.target.value;
        const allowed = {
          regionId: ["all", ...REGIONS.map(row => row.id)],
          schoolYear: ["all", ...YEARS],
          month: ["all", ...REPORT_MONTHS],
          insurerId: ["all", ...INSURERS],
        };
        if (!allowed[key]?.includes(value)) return showError("報表篩選值無效。");
        reportFilters = { ...reportFilters, [key]: value };
        errorBox.hidden = true;
        draw();
      }
    });
    document.addEventListener("click", event => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "open-guide" || action === "reopen-guide") setGuideOpen(true);
      if (action === "close-guide") setGuideOpen(false);
      if (action === "guide-maximize") {
        const enteringMobileFullscreen = isCompactViewport() && !guideLayout.maximized;
        guideLayout.maximized = !guideLayout.maximized;
        if (enteringMobileFullscreen) guideReturnFocus = event.target;
        applyGuideLayout();
        if (enteringMobileFullscreen) guideHeading.focus();
        else if (isCompactViewport()) (guideReturnFocus || event.target).focus();
      }
      if (action === "guide-reset-window") {
        guideLayout.rect = null;
        guideLayout.maximized = false;
        applyGuideLayout();
      }
      if (action === "guide-previous" && guideIndex.value > 0) { guideScroll.set(guideIndex.value, guideBody.scrollTop); guideIndex.value -= 1; updateGuide(); }
      if (action === "guide-next" && guideIndex.value < WALKTHROUGH.length - 1) { guideScroll.set(guideIndex.value, guideBody.scrollTop); guideIndex.value += 1; updateGuide(); }
      if (action === "guide-locate") navigateGuide();
    });
    document.querySelector("#guide-step-select").addEventListener("change", event => {
      guideScroll.set(guideIndex.value, guideBody.scrollTop);
      guideIndex.value = Number(event.target.value) || 0;
      updateGuide();
    });
    global.addEventListener("keydown", event => {
      if (event.key === "Escape" && guideOpen && isCompactViewport() && guideLayout.maximized) {
        guideLayout.maximized = false;
        applyGuideLayout();
        (guideReturnFocus || document.querySelector('[data-action="guide-maximize"]')).focus();
        return;
      }
      if (event.key === "Escape" && guideOpen) setGuideOpen(false);
      if (event.key !== "Tab" || !guideOpen || !guideLayout.maximized || !isCompactViewport()) return;
      const controls = [guideHeading, ...guide.querySelectorAll('button:not([disabled]), select, a[href], [tabindex]:not([tabindex="-1"])')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    global.addEventListener("resize", applyGuideLayout);
    global.addEventListener("resize", syncVisualViewport);
    global.visualViewport?.addEventListener("resize", syncVisualViewport);
    syncVisualViewport();
    if (!global.location.hash) global.location.hash = "#/login";
    applyRoute();
    updateGuide();
  }

  const api = Object.freeze({
    STORAGE_KEY, SESSION_KEY, PROFILE_KEY, BUSINESS_DATE, ROLES, ROLE_LABELS, MENUS,
    REGIONS, YEARS, INSURER_SEED, INSURERS, SCHOOL_SEED, AGE_BANDS, COVERAGE_TYPES,
    PRODUCT_STATES, APPLICATION_STATES, CLAIM_STATES, REPORT_MONTHS, PRODUCT_SEED,
    PROFILE_SEED, GUARDIAN_SEED, GOVERNMENT_REPORT_FIXTURE, SCHOOL_REPORT_FIXTURE,
    PRODUCT_REVIEW_REASONS, UNDERWRITING_REASONS, CLAIM_DECISION_REASONS,
    SYNTHETIC_DATA_NOTICE, WALKTHROUGH, createSeed, validate, migrate, run, renderWorkspace,
  });
  global.StudentInsuranceDemo = api;
  if (typeof document !== "undefined" && document.querySelector("#app")) init();
})(typeof window !== "undefined" ? window : globalThis);

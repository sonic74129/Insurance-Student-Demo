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
    insurer: "選擇合成公司，發布或下架本公司的學平險演示商品。",
    regulator: "查看合成醫保政策、產品目錄與匯總數據。",
    school: "了解一般學生保障指引，不查看個人保單或醫療資料。",
  };
  const REGIONS = [
    { id: "SYN-R1", name: "合成省會示例區", policyVersion: "示例版本 2026-A" },
    { id: "SYN-R2", name: "合成東部示例區", policyVersion: "示例版本 2026-B" },
    { id: "SYN-R3", name: "合成西部示例區", policyVersion: "示例版本 2026-C" },
  ];
  const YEARS = ["2026-2027", "2025-2026"];
  const PRODUCT_SEED = [
    {
      id: "STU-ACC-01", insurer: "合成保險機構甲", name: "學生意外補充示例方案",
      version: "合成條款 V1（待核實）", benefit: "意外傷害、意外醫療（合成責任示例；不表示疾病住院保障）",
      limit: "示例額度 20,000 元", term: "示例期間：按演示學年列示，非實際保障期",
      exclusions: "以合成條款摘要為例；實際責任、免責及理賠條件須查核正式條款",
      source: "無真實銷售來源；演示產品，不代表可投保", published: true,
    },
    {
      id: "STU-ACC-02", insurer: "合成保險機構乙", name: "學生綜合補充示例方案",
      version: "合成條款 V2（待核實）", benefit: "意外傷害、意外醫療及疾病住院（合成條款示例）",
      limit: "示例額度 50,000 元", term: "示例期間：按演示學年列示，非實際保障期",
      exclusions: "以合成條款摘要為例；不構成承保、除外或賠付判斷",
      source: "無真實銷售來源；演示產品，不代表可投保", published: true,
    },
  ];
  const MENUS = {
    "student-parent": [
      ["home", "保障 Marketplace", "總"], ["guide", "學生醫保政策", "醫"],
      ["products", "學平險 Marketplace", "險"],
    ],
    insurer: [["home", "我的演示商品", "品"]],
    regulator: [["home", "政策與產品總覽", "政"]],
    school: [["home", "學生保障說明", "校"]],
  };
  const PAGE_LABELS = Object.fromEntries(Object.values(MENUS).flat().map(([id, label]) => [id, label]));
  const WALKTHROUGH = [
    {
      role: "student-parent", page: "login", selector: '.role-card[data-role-card="student-parent"]',
      title: "選擇學生／家長", text: "在首頁點「學生／家長」角色卡，進入兩類保障入口。", done: "已進入學生工作台",
    },
    {
      role: "student-parent", page: "guide", selector: '[data-nav="guide"]',
      title: "查看學生醫保政策", text: "選擇合成地區和學年，閱讀資格與辦理查核提示。這不是官方參保查詢。", done: "已看到政策查核提示",
    },
    {
      role: "insurer", page: "home", selector: '[data-insurer-select]',
      title: "保險公司管理商品", text: "切換到保險公司角色，選擇合成公司，只可發布或下架該公司的演示商品。", done: "已查看公司商品",
    },
    {
      role: "student-parent", page: "products", selector: '[data-nav="products"]',
      title: "比較多家學平險", text: "回到學生／家長，打開學平險 Marketplace，查看商品責任、條款、期限和來源；手機至多勾選兩款比較。",
      done: "已查看學平險商品",
    },
    {
      role: "student-parent", page: "products", selector: '[data-action="apply"]',
      title: "選一個商品演示申請", text: "選擇合成身份並確認演示聲明，再點商品旁的申請。提交不等於投保、承保或生效。", done: "已看到本機申請狀態",
    },
    {
      role: "regulator", page: "home", selector: "#management-summary",
      title: "政府監管查看總覽", text: "切換政府監管，查看合成政策、商品與匯總，不顯示學生個人資料。", done: "已查看政策與商品匯總",
    },
    {
      role: "school", page: "home", selector: "#school-info",
      title: "學校查看一般說明", text: "切換學校角色，查看醫保和自願學平險的一般指引，不查看學生個人資料。", done: "已看到一般保障說明",
    },
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function createSeed() {
    return {
      schemaVersion: 2,
      meta: { synthetic: true, businessDate: BUSINESS_DATE, scenario: "student-insurance-demo" },
      context: { regionId: "SYN-R1", schoolYear: "2026-2027" },
      profiles: [
        { id: "SYN-STU-ADULT", displayName: "示例成年學生甲", ageBand: "18歲以上", school: "合成示例大學", guardianId: null },
        { id: "SYN-STU-MINOR", displayName: "示例未成年學生乙", ageBand: "未滿18歲", school: "合成示例中學", guardianId: "SYN-GUARDIAN-01" },
      ],
      guardians: [
        { id: "SYN-GUARDIAN-01", displayName: "示例家長甲", studentId: "SYN-STU-MINOR", active: true, relationship: "僅為可撤銷的演示代理關係" },
      ],
      products: clone(PRODUCT_SEED),
      applications: [],
      samplePolicies: [],
      policyPresentation: { status: "政策展示待權威來源確認", source: "尚未接入真實主管機關資料" },
      schoolBriefing: { reviewed: false, source: "僅本機合成示例；未實際發送" },
    };
  }
  function validate(db) {
    const errors = [];
    if (!db || typeof db !== "object" || db.schemaVersion !== 2 || !db.meta ||
        db.meta.synthetic !== true || db.meta.businessDate !== BUSINESS_DATE ||
        db.meta.scenario !== "student-insurance-demo") return ["資料版本或演示標記無效"];
    if (!db.context || !REGIONS.some(row => row.id === db.context.regionId) || !YEARS.includes(db.context.schoolYear)) errors.push("地區或學年無效");
    if (!Array.isArray(db.profiles) || !Array.isArray(db.guardians) ||
        !Array.isArray(db.products) || !Array.isArray(db.applications) ||
        !Array.isArray(db.samplePolicies)) return ["資料清單格式無效"];
    const profileIds = db.profiles.map(row => row.id);
    if (new Set(profileIds).size !== profileIds.length ||
        db.profiles.some(row => typeof row.id !== "string" || typeof row.displayName !== "string" ||
          !["未滿18歲", "18歲以上"].includes(row.ageBand) || typeof row.school !== "string")) errors.push("學生示例檔案無效");
    const guardianIds = db.guardians.map(row => row.id);
    if (new Set(guardianIds).size !== guardianIds.length ||
        db.guardians.some(row => typeof row.id !== "string" || typeof row.active !== "boolean" ||
          !profileIds.includes(row.studentId) || typeof row.displayName !== "string")) errors.push("演示代理關係無效");
    if (db.profiles.some(row => row.guardianId !== null &&
        !db.guardians.some(guardian => guardian.id === row.guardianId && guardian.studentId === row.id)) ||
        db.guardians.some(guardian => {
          const student = db.profiles.find(row => row.id === guardian.studentId);
          return !student || student.ageBand !== "未滿18歲" || student.guardianId !== guardian.id;
        })) errors.push("演示代理關係與學生檔案不匹配");
    if (new Set(db.products.map(row => row.id)).size !== db.products.length ||
        db.products.some(row => !PRODUCT_SEED.some(seed => seed.id === row.id && seed.insurer === row.insurer) ||
          typeof row.published !== "boolean" || typeof row.name !== "string" ||
          typeof row.version !== "string" || typeof row.source !== "string")) errors.push("演示產品目錄無效");
    for (const app of db.applications) {
      if (!profileIds.includes(app.profileId) || !db.products.some(row => row.id === app.productId) ||
          !["已送出演示申請", "演示處理完成（非承保）"].includes(app.status) ||
          app.source !== "本機演示紀錄" || typeof app.id !== "string") errors.push("申請紀錄包含無效狀態或參照");
    }
    for (const policy of db.samplePolicies) {
      if (!db.applications.some(app => app.id === policy.applicationId) ||
          policy.effective !== false || policy.status !== "樣例保單（不生效）") errors.push("樣例保單不得表示為有效保障");
    }
    if (!db.policyPresentation || typeof db.policyPresentation.status !== "string" ||
        typeof db.policyPresentation.source !== "string" ||
        !db.schoolBriefing || typeof db.schoolBriefing.reviewed !== "boolean" ||
        db.schoolBriefing.source !== "僅本機合成示例；未實際發送") errors.push("政策或學校通知資料無效");
    return errors;
  }
  function migrate(db) {
    if (db?.schemaVersion === 2) return db;
    if (db?.schemaVersion === 1 && db.meta?.synthetic === true &&
        db.meta.scenario === "student-insurance-demo" &&
        Array.isArray(db.profiles) && Array.isArray(db.guardians) &&
        Array.isArray(db.applications) && Array.isArray(db.samplePolicies)) {
      const next = clone(db);
      next.schemaVersion = 2;
      next.products = clone(PRODUCT_SEED);
      next.schoolBriefing = { reviewed: false, source: "僅本機合成示例；未實際發送" };
      return next;
    }
    return db;
  }
  function canManageProfile(db, profileId) {
    const profile = db.profiles.find(row => row.id === profileId);
    if (!profile) return false;
    if (profile.ageBand === "18歲以上") return profile.id === "SYN-STU-ADULT";
    return db.guardians.some(row => row.id === profile.guardianId &&
      row.studentId === profile.id && row.active);
  }
  function run(db, role, action, payload = {}) {
    const errors = validate(db);
    if (errors.length) return { ok: false, message: errors[0] };
    if (!ROLES.includes(role)) return { ok: false, message: "演示身分無效" };
    const next = clone(db);
    const fail = message => ({ ok: false, message });
    if (action === "setContext") {
      if (role !== "student-parent") return fail("此演示身分不可修改家庭地區／學年");
      if (!REGIONS.some(row => row.id === payload.regionId) || !YEARS.includes(payload.schoolYear)) return fail("請選擇有效的合成地區與學年");
      next.context = { regionId: payload.regionId, schoolYear: payload.schoolYear };
    } else if (action === "submitApplication") {
      if (role !== "student-parent") return fail("此演示身分不可提交學生申請");
      const profile = next.profiles.find(row => row.id === payload.profileId);
      if (!profile || !canManageProfile(next, profile.id)) return fail("成年學生僅由本人管理；未成年學生須有有效的演示代理關係");
      if (!next.products.some(row => row.id === payload.productId && row.published)) return fail("只能對目前已發布的合成商品建立演示申請");
      if (next.applications.some(row => row.profileId === profile.id && row.productId === payload.productId && row.status === "已送出演示申請")) return fail("此演示申請已送出，請勿重複提交");
      next.applications.push({
        id: `SYN-APP-${Math.max(0, ...next.applications.map(row => Number(/^SYN-APP-(\d+)$/.exec(row.id)?.[1]) || 0)) + 1}`,
        profileId: profile.id,
        productId: payload.productId,
        status: "已送出演示申請",
        source: "本機演示紀錄",
      });
    } else if (action === "setProductPublication") {
      if (role !== "insurer") return fail("僅保險公司角色可發布合成商品");
      const product = next.products.find(row => row.id === payload.productId);
      if (!product || typeof payload.published !== "boolean") return fail("演示商品或發布狀態無效");
      if (!PRODUCT_SEED.some(seed => seed.insurer === payload.insurer) || product.insurer !== payload.insurer) return fail("僅可管理所選合成公司的商品");
      product.published = payload.published;
    } else if (action === "revokeGuardian") {
      if (role !== "student-parent") return fail("僅學生／家長角色可撤銷演示代理關係");
      const guardian = next.guardians.find(row => row.id === payload.guardianId && row.active);
      if (!guardian) return fail("演示代理關係不存在或已撤銷");
      const minor = next.profiles.find(row => row.id === guardian.studentId);
      if (!minor || minor.ageBand !== "未滿18歲" || minor.guardianId !== guardian.id) return fail("演示代理關係與學生檔案不匹配");
      guardian.active = false;
      next.applications = next.applications.filter(row => row.profileId !== guardian.studentId);
      next.samplePolicies = next.samplePolicies.filter(row =>
        next.applications.some(app => app.id === row.applicationId));
    } else {
      return fail("不支援此操作");
    }
    const validation = validate(next);
    if (validation.length) return fail(validation[0]);
    return { ok: true, db: next, message: "已更新本機演示資料" };
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }
  function product(db, id) { return db.products.find(row => row.id === id); }
  function appProduct(db, app) { return product(db, app.productId); }
  function appProfile(db, app) { return db.profiles.find(row => row.id === app.profileId); }
  function applicationCard(db, app, showProfile = true) {
    const plan = appProduct(db, app);
    const profile = appProfile(db, app);
    const samplePolicy = db.samplePolicies.find(row => row.applicationId === app.id);
    return `<article class="application" data-application="${esc(app.id)}"><div><strong>${esc(plan.name)}</strong><div class="muted">${showProfile ? `${esc(profile.displayName)}・` : ""}${esc(app.status)}・${esc(app.source)}</div>${samplePolicy ? `<span class="tag danger">${esc(samplePolicy.status)}</span>` : ""}</div></article>`;
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
  function marketplacePage(db, profileId, compareProductIds = []) {
    const profiles = availableProfiles(db);
    const products = db.products.filter(row => row.published);
    const records = db.applications.filter(row => row.profileId === profileId);
    const compared = products.filter(row => compareProductIds.includes(row.id));
    const guardian = db.guardians.find(row => row.id === "SYN-GUARDIAN-01" && row.active);
    return `<div class="page-heading"><div><span class="eyebrow">VOLUNTARY MARKETPLACE</span><h1>學平險 Marketplace</h1><p>比較各公司合成商品，自願選擇；具體責任、免責及來源以正式文件核實。</p></div></div>
      <section class="panel"><h2>選擇合成身份</h2><label class="field">演示身份<select data-profile-select>${profiles.map(row => `<option value="${esc(row.id)}" ${row.id === profileId ? "selected" : ""}>${esc(row.displayName)}・${esc(row.ageBand)}</option>`).join("")}</select></label><p class="muted">成年學生本人管理；未成年僅以可撤銷的合成代理示例操作，並未核驗真實監護關係。</p>${guardian ? `<button class="button secondary" data-action="revoke" data-id="${esc(guardian.id)}">撤銷演示代理</button>` : "<p>演示代理已撤銷。</p>"}</section>
      <section class="panel"><h2>瀏覽與比較商品</h2><p>意外傷害、意外醫療及部分產品的疾病住院責任依條款而異；可能重疊時請核查，不作賠付結論。</p><label class="checkline"><input type="checkbox" data-demo-confirm>我了解此為合成演示申請，非實際投保、承保或保障生效；不輸入真實身份、病歷、學籍或支付資料。</label>
      <div class="product-list">${products.length ? products.map(row => `<article class="market-product" data-product="${esc(row.id)}">
        <div class="product-company"><span class="field-label">保險公司</span><strong>${esc(row.insurer)}</strong><span class="product-name">${esc(row.name)}</span></div>
        <div class="product-coverage"><span class="field-label">保障責任示例</span><strong>${esc(row.benefit)}</strong><small>${esc(row.exclusions)}</small></div>
        <div class="product-terms"><span class="field-label">條款與額度</span><strong>${esc(row.version)}</strong><small>${esc(row.limit)}</small></div>
        <div class="product-source"><span class="field-label">期間與來源</span><strong>${esc(row.term)}</strong><small>${esc(row.source)}</small></div>
        <div class="product-actions"><label class="compare-toggle"><input type="checkbox" data-compare-product="${esc(row.id)}" ${compareProductIds.includes(row.id) ? "checked" : ""}>加入比較</label><button class="button" data-action="apply" data-id="${esc(row.id)}">申請此演示商品</button></div>
        <details class="product-mobile-details"><summary>查看條款、額度與來源</summary><p>${esc(row.version)}｜${esc(row.limit)}</p><p>${esc(row.term)}</p><p>${esc(row.source)}</p><p>${esc(row.exclusions)}</p></details>
      </article>`).join("") : `<div class="empty">目前沒有演示發布商品。</div>`}</div><div class="compare-results" data-compare-results aria-live="polite">${compared.length ? `<h3>已選比較（${compared.length} 款）</h3><div class="comparison-grid">${compared.map(row => `<article class="comparison-product"><h4>${esc(row.insurer)}｜${esc(row.name)}</h4><dl><div><dt>責任</dt><dd>${esc(row.benefit)}</dd></div><div><dt>除外</dt><dd>${esc(row.exclusions)}</dd></div><div><dt>條款／額度</dt><dd>${esc(row.version)}｜${esc(row.limit)}</dd></div><div><dt>期間／來源</dt><dd>${esc(row.term)}｜${esc(row.source)}</dd></div></dl></article>`).join("")}</div>` : `<p>選擇商品加入比較，可按共同欄位並列查看。</p>`}</div></section>
      <section class="panel"><h2>本機演示申請</h2>${records.length ? records.map(app => applicationCard(db, app, false)).join("") : "<p>尚無此合成身份的演示申請。</p>"}<p class="muted">狀態來源：本機演示紀錄；不代表保障生效。</p></section>`;
  }
  function pageContent(db, role, page, profileId, insurer, compareProductIds) {
    const published = db.products.filter(row => row.published);
    if (role === "student-parent" && page === "home") {
      return `<div class="page-heading"><div><span class="eyebrow">STUDENT PROTECTION MARKETPLACE</span><h1>學生保障 Marketplace</h1><p>醫保打底，學平險自願補充。選擇下方兩類保障查看。</p></div></div>
        <div class="grid"><section class="panel"><h2>城鄉居民基本醫療保險（學生醫保）</h2><p>按地區查看政策與辦理查核提示；不是保險公司商品。</p><button class="button" data-nav="guide">查看醫保政策</button></section>
        <section class="panel"><h2>商業學平險</h2><p>自願比較多家保險公司的 ${published.length} 個演示商品。</p><button class="button" data-nav="products">比較學平險</button></section></div>
        <div class="callout">不宣稱全國統一強制。可能重疊的保障請核對政策與條款，不判定賠付。學校責任險屬另一平台。</div>`;
    }
    if (role === "student-parent" && page === "guide") {
      const region = REGIONS.find(row => row.id === db.context.regionId);
      return `<div class="page-heading"><div><h1>城鄉居民基本醫療保險（學生醫保）</h1><p>基礎醫療保障政策入口，非商品或參保核驗。</p></div></div><section class="panel"><h2>選擇地區與學年</h2><div class="field-row"><label class="field">合成地區<select data-context-select>${REGIONS.map(row => `<option value="${esc(row.id)}" ${row.id === db.context.regionId ? "selected" : ""}>${esc(row.name)}</option>`).join("")}</select></label><label class="field">學年<select data-year-select>${YEARS.map(row => `<option ${row === db.context.schoolYear ? "selected" : ""}>${esc(row)}</option>`).join("")}</select></label></div><p>${esc(region.policyVersion)}｜合成示例，未接入權威政策</p><p>請向所在地醫保官方渠道核實資格、辦理方式、適用期及疾病就醫／住院待遇；本頁沒有真實辦理連結。</p></section>`;
    }
    if (role === "student-parent" && page === "products") return marketplacePage(db, profileId, compareProductIds);
    if (role === "insurer") {
      const companies = [...new Set(PRODUCT_SEED.map(row => row.insurer))];
      return `<div class="page-heading"><div><h1>保險公司演示商品</h1><p>選擇合成公司，僅管理該公司的學平險商品；不是真實身份認證或上架銷售。</p></div></div><section class="panel"><label class="field">合成保險公司<select data-insurer-select>${companies.map(company => `<option ${company === insurer ? "selected" : ""}>${esc(company)}</option>`).join("")}</select></label></section><div class="card-list">${db.products.filter(row => row.insurer === insurer).map(row => `<article class="card product-admin" data-product-admin="${esc(row.id)}"><span class="tag">${row.published ? "演示發布" : "未發布"}</span><h2>${esc(row.name)}</h2><p>${esc(row.insurer)}｜${esc(row.version)}</p><p>${esc(row.benefit)}｜${esc(row.limit)}</p><p>${esc(row.exclusions)}</p><p>${esc(row.term)}｜${esc(row.source)}</p><button class="button" data-action="publish-product" data-id="${esc(row.id)}" data-published="${!row.published}">${row.published ? "下架演示商品" : "發布演示商品"}</button></article>`).join("")}</div>`;
    }
    if (role === "regulator") {
      return `<div class="page-heading"><div><h1>政策與產品總覽</h1><p>僅顯示合成政策、商品及匯總，不顯示個人申請、保單或醫療資料。</p></div></div><div class="metrics" id="management-summary"><article class="metric"><span>合成地區</span><strong>${REGIONS.length}</strong></article><article class="metric"><span>演示發布商品</span><strong>${published.length}</strong></article><article class="metric"><span>演示申請合計</span><strong>${db.applications.length}</strong></article></div><section class="panel"><h2>合成醫保政策</h2>${REGIONS.map(row => `<p>${esc(row.name)}｜${esc(row.policyVersion)}｜權威來源待確認</p>`).join("")}</section><section class="panel"><h2>學平險商品目錄</h2>${db.products.map(row => `<p>${esc(row.insurer)}｜${esc(row.name)}｜${row.published ? "演示發布" : "未發布"}｜${esc(row.version)}｜${esc(row.source)}</p>`).join("")}</section>`;
    }
    if (role === "school") {
      return `<div class="page-heading"><div><h1>學生保障一般說明</h1></div></div><section class="panel" id="school-info"><p>學生醫保資格、辦理與待遇請向所在地醫保官方渠道核實。</p><p>學平險是自願商業補充，家庭可自行核對各公司正式條款及渠道。</p><p>學校不查看學生個人申請、保單或醫療資料；學校責任險由另一平台管理。</p></section>`;
    }
    return `<div class="empty">找不到此頁面。</div>`;
  }
  function renderWorkspaceBase(db, role, page, profileId, insurer, compareProductIds) {
    const menu = MENUS[role];
    const title = PAGE_LABELS[page] || "工作台";
    const nav = menu.map(([id, label, symbol]) => `<button class="nav-item" type="button" data-nav="${esc(id)}" aria-current="${id === page ? "page" : "false"}"><span class="nav-icon">${esc(symbol)}</span><span>${esc(label)}</span></button>`).join("");
    const profile = db.profiles.find(row => row.id === profileId && canManageProfile(db, row.id));
    const principal = role === "student-parent" ? profile?.displayName || "學生／家長" : ROLE_LABELS[role];
    return `<div class="app-shell"><aside class="sidebar"><a class="brand sidebar-brand" href="#/${role}/${menu[0][0]}"><span class="brand-mark">學</span><span><strong>學生保障服務</strong><small>獨立演示工作台</small></span></a><div class="side-label">${esc(ROLE_LABELS[role])}功能</div><nav>${nav}</nav><div class="sidebar-note">離線演示・合成資料</div></aside><main class="main-area"><header class="topbar"><div><span class="breadcrumb">${esc(ROLE_LABELS[role])} / ${esc(title)}</span><strong>${esc(principal)}</strong></div><div class="top-actions"><button class="button secondary" type="button" data-action="open-guide">操作說明書</button><span class="business-date">演示日 ${BUSINESS_DATE}</span><a class="button secondary" href="#/login">切換角色</a></div></header><div class="page-content" id="page-content">${pageContent(db, role, page, profileId, insurer, compareProductIds)}<section class="synthetic-note"><strong>合成演示</strong><span>不代表官方政策、真實產品、保險承保或有效保障；請勿輸入真實身份、醫療、學籍或支付資料。</span></section></div></main></div>`;
  }
  function renderWorkspace(db, role, page, profileId, insurer = PRODUCT_SEED[0].insurer, compareProductIds = []) {
    return renderWorkspaceBase(db, role, page, profileId, insurer, compareProductIds);
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
    let profileId = global.sessionStorage.getItem(PROFILE_KEY) || "SYN-STU-ADULT";
    let insurer = PRODUCT_SEED[0].insurer;
    let compareProductIds = [];
    let guideOpen = false;
    let guideReturnFocus = null;
    document.querySelector("#guide-step-select").innerHTML = WALKTHROUGH
      .map((step, index) => `<option value="${index}">${index + 1}. ${esc(step.title)}</option>`).join("");

    function showError(message) {
      errorBox.hidden = false;
      errorBox.textContent = message;
    }
    function draw() {
      if (currentRole === "student-parent" && !canManageProfile(db, profileId)) profileId = "SYN-STU-ADULT";
      root.innerHTML = currentRole ? renderWorkspace(db, currentRole, page, profileId, insurer, compareProductIds) : roleCards();
      syncGuideEntry();
    }
    function applyRoute() {
      const route = parseRoute();
      currentRole = route.role;
      page = route.page;
      if (currentRole === "student-parent" && !canManageProfile(db, profileId)) profileId = "SYN-STU-ADULT";
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
    function renderComparison(products) {
      return products.length
        ? `<h3>已選比較（${products.length} 款）</h3><div class="comparison-grid">${products.map(row => `<article class="comparison-product"><h4>${esc(row.insurer)}｜${esc(row.name)}</h4><dl><div><dt>責任</dt><dd>${esc(row.benefit)}</dd></div><div><dt>除外</dt><dd>${esc(row.exclusions)}</dd></div><div><dt>條款／額度</dt><dd>${esc(row.version)}｜${esc(row.limit)}</dd></div><div><dt>期間／來源</dt><dd>${esc(row.term)}｜${esc(row.source)}</dd></div></dl></article>`).join("")}</div>`
        : "<p>選擇商品加入比較，可按共同欄位並列查看。</p>";
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
    const saved = global.localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      db = createSeed();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } else {
      try {
        db = migrate(JSON.parse(saved));
      } catch {
        return showError("學生端存檔格式損壞，為避免覆蓋資料，本頁不會自動重置。請確認後使用學生端專用重置。");
      }
      const errors = validate(db);
      if (errors.length) return showError(`學生端存檔驗證失敗（${errors[0]}），為避免覆蓋資料，本頁不會自動重置。`);
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
        profileId = "SYN-STU-ADULT";
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
      if (button.dataset.action === "apply") {
        if (!document.querySelector("[data-demo-confirm]")?.checked) return showError("請先確認此操作僅建立合成演示申請，不是實際投保。");
        return execute("submitApplication", { profileId, productId: id });
      }
      if (button.dataset.action === "publish-product") return execute("setProductPublication", { productId: id, insurer, published: button.dataset.published === "true" });
      if (button.dataset.action === "revoke") {
        if (!global.confirm("撤銷此未成年學生的合成代理關係，並移除該示例學生本機演示申請？")) return;
        return execute("revokeGuardian", { guardianId: id });
      }
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
        if (!PRODUCT_SEED.some(row => row.insurer === event.target.value)) return showError("合成保險公司無效。");
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
    REGIONS, YEARS, PRODUCT_SEED, WALKTHROUGH, createSeed, validate, migrate, run, renderWorkspace,
  });
  global.StudentInsuranceDemo = api;
  if (typeof document !== "undefined" && document.querySelector("#app")) init();
})(typeof window !== "undefined" ? window : globalThis);

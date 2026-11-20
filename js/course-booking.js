/* ===== 課程報名頁 /course-booking/ =====
   設定值都在 js/config.js 的 SITE_CONFIG.COURSE_BOOKING，這裡不用改。 */
(function () {
  const CFG = SITE_CONFIG.COURSE_BOOKING;
  const COURSES = CFG.COURSES;
  const WD = ["日", "一", "二", "三", "四", "五", "六"];
  const $ = s => document.querySelector(s);
  const NO_SESSION_TEXT = "目前還沒有開放新的課程日期，歡迎透過 LINE 詢問小豬下一次的開課資訊。";

  let data = null;          // 後端回傳的 { courses, sessions }
  let course = null;        // 目前選的 course_id
  let session = null;       // 目前選的場次物件（線上課程沒有場次）
  let mode = "physical";    // 上課方式：physical 實體小班／online 線上一對一
  let requestId = null;     // 防重複送出：同一次報名重試時沿用同一個 ID
  let sending = false;

  /* ---------- 小工具 ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function dayText(iso) {                       // "2026-12-06" → "2026/12/6（六）"
    const [y, m, d] = iso.split("-").map(Number);
    const w = WD[new Date(y, m - 1, d).getDay()];   // 只用年月日計算，不受訪客時區影響
    return y + "/" + m + "/" + d + "（" + w + "）";
  }
  function courseName(id) {
    const c = COURSES[id] || {};
    return (c.label || id) + "｜" + (c.title || "");
  }
  function lineBtnHTML(text) {
    return '<a class="btn" href="' + esc(CFG.LINE_URL) + '" target="_blank" rel="noopener">' + esc(text || "LINE 詢問小豬") + "</a>";
  }
  // 只在「，」的地方換行，避免最後一個字單獨掉到下一行
  function noBreak(text) {
    return String(text).split("，").map(t => '<span class="cb-nb">' + esc(t) + "</span>").join("，");
  }
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  const isOnline = id => !!(COURSES[id] && COURSES[id].online);
  const baseOf = id => (COURSES[id] && COURSES[id].base) || id;
  const idFor = (base, m) => m === "online" ? base + "_ONLINE" : base;
  function onlineOpen(id) {      // 試算表 Courses 把線上課程設成「關閉」時，就不開放選擇
    return !data || !data.courses || data.courses.some(c => c.course_id === id);
  }
  function setStep(n) {
    document.querySelectorAll(".cb-steps li").forEach(li => li.classList.toggle("on", Number(li.dataset.step) <= n));
  }

  /* ---------- STEP 01：課程 ---------- */
  function paintCourses() {
    ["ONE_DAY", "TWO_DAY"].forEach(base => {
      const id = idFor(base, mode);
      const fromSheet = data && data.courses && data.courses.find(c => c.course_id === id);
      const c = COURSES[id];
      const price = fromSheet && fromSheet.price !== "" && fromSheet.price != null ? fromSheet.price : (c.price != null ? c.price : CFG.PRICE_FALLBACK);
      const priceText = /^\d+$/.test(String(price)) ? "NT$ " + Number(price).toLocaleString("zh-TW") : price;
      const nameEl = document.querySelector('[data-course-name="' + base + '"]');
      const metaEl = document.querySelector('[data-course-meta="' + base + '"]');
      if (nameEl) nameEl.innerHTML = courseName(id).split("｜").map(t => '<span class="cb-nb">' + esc(t) + "</span>").join("｜");
      // 課程時間以網站設定為主（試算表 duration 只在網站沒寫時才用）
      if (metaEl) metaEl.innerHTML = "課程時間：" + noBreak(c.duration || (fromSheet && fromSheet.duration) || "") + "<br>課程費用：" + esc(priceText) + (c.classNote ? "<br>" + noBreak(c.classNote) : "");
    });
    const onlineAvail = onlineOpen("ONE_DAY_ONLINE") || onlineOpen("TWO_DAY_ONLINE");
    const onlineInput = document.querySelector('input[name=mode][value=online]');
    onlineInput.disabled = !onlineAvail;
    onlineInput.closest(".cb-pill").title = onlineAvail ? "" : "線上課程目前暫停預約";
    if (mode === "online") {
      ["ONE_DAY", "TWO_DAY"].forEach(base => {
        const inp = document.querySelector('input[name=course][value="' + base + '"]');
        inp.disabled = !onlineOpen(idFor(base, "online"));
      });
    } else document.querySelectorAll("input[name=course]").forEach(i => { i.disabled = false; });
    $("#modeNote").textContent = mode === "online"
      ? "一對一上課，課程內容都與實體課相同，一個人就開課。時間可以彈性安排（平日晚上 19:30 以後或假日），上課時數：一日課程 6 小時、兩日課程 12 小時。"
      : "小班教學，假日開課，每梯次最多 4 位，滿 2 位即開課。";
  }

  function setMode(m, fromUser) {
    mode = m === "online" ? "online" : "physical";
    const r = document.querySelector('input[name=mode][value="' + mode + '"]');
    if (r) r.checked = true;
    paintCourses();
    if (course) pickCourse(idFor(baseOf(course), mode), fromUser);
    else renderStep2();
  }

  function pickCourse(id, fromUser) {
    if (!COURSES[id]) return;
    const m = isOnline(id) ? "online" : "physical";
    if (m !== mode) { mode = m; const r = document.querySelector('input[name=mode][value="' + m + '"]'); if (r) r.checked = true; paintCourses(); }
    course = id;
    const input = document.querySelector('input[name=course][value="' + baseOf(id) + '"]');
    if (input) input.checked = true;
    session = null;
    $("#birthFields").hidden = baseOf(id) !== "TWO_DAY";
    renderStep2();
    setStep(2);
    updateSummary();
    if (fromUser) { const u = new URL(location.href); u.searchParams.set("course", id); history.replaceState(null, "", u); }
  }

  /* ---------- STEP 02：場次（實體）／希望時段（線上）---------- */
  function renderStep2() {
    const online = course ? isOnline(course) : mode === "online";
    $("#step2Title").textContent = online ? "希望上課的時段" : "選擇開課日期";
    $("#onlineBox").hidden = !(online && course);
    $("#sessionList").hidden = online && !!course;
    if (online && course) { setStep(slotsPicked().length ? 3 : 2); return; }
    renderSessions();
  }
  function slotsPicked() {
    return Array.from(document.querySelectorAll("#slotList input:checked")).map(i => i.value);
  }
  function renderSessions() {
    const box = $("#sessionList");
    if (!course) { box.innerHTML = '<p class="cb-msg">請先選擇課程。</p>'; return; }
    if (!data) { box.innerHTML = '<p class="cb-msg"><span class="cb-spin" aria-hidden="true"></span>正在讀取開課日期…</p>'; return; }
    if (isOnline(course)) return;
    const list = data.sessions.filter(s => s.course_id === course);
    if (!list.length) {
      box.innerHTML = '<div class="cb-msg"><p>' + NO_SESSION_TEXT + "</p>" + lineBtnHTML("LINE 詢問下一次開課") + "</div>";
      return;
    }
    box.innerHTML = "";
    list.forEach(s => {
      const full = s.state === "full" || s.remaining < 1;
      const multi = s.dates.length > 1;
      const days = s.dates.map((d, i) => "<div>" + (multi ? "<em>第 " + (i + 1) + " 天</em>" : "") + dayText(d) + "</div>").join("");
      const badge = full ? '<span class="cb-badge full">已額滿</span>'
        : s.remaining <= 1 ? '<span class="cb-badge low">剩餘 ' + s.remaining + " 位｜可報名</span>"
        : '<span class="cb-badge ok">剩餘 ' + s.remaining + " 位｜可報名</span>";
      const label = document.createElement("label");
      label.className = "cb-opt cb-session";
      label.innerHTML =
        '<input type="radio" name="session" value="' + esc(s.session_id) + '"' + (full ? " disabled" : "") + (session && session.session_id === s.session_id ? " checked" : "") + ">" +
        "<span><span class=\"cb-days\">" + days + "</span>" + badge +
        '<span class="cb-meta">時間：' + esc(s.start_time) + "–" + esc(s.end_time) + (multi ? "（每天）" : "") +
        "<br>地點：" + esc(s.location || "將於確認報名時告知") + "</span></span>";
      label.querySelector("input").addEventListener("change", () => { session = s; setStep(3); updateSummary(); });
      box.appendChild(label);
    });
  }

  async function loadSessions() {
    if (!CFG.API_URL) {
      console.warn("[課程報名] 尚未設定 SITE_CONFIG.COURSE_BOOKING.API_URL");
      data = { courses: [], sessions: [] };
      paintCourses(); renderStep2(); return;
    }
    try {
      const r = await fetch(CFG.API_URL + "?action=sessions&t=" + Date.now(), { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "load failed");
      data = { courses: j.courses || [], sessions: j.sessions || [] };
      if (session) {   // 重新整理後，已選的場次若額滿或消失就取消選取
        const still = data.sessions.find(s => s.session_id === session.session_id && s.state === "open" && s.remaining > 0);
        session = still || null;
      }
      paintCourses();
      if (course && isOnline(course) && !onlineOpen(course)) { course = null; document.querySelectorAll("input[name=course]").forEach(i => { i.checked = false; }); }
      renderStep2(); updateSummary();
    } catch (e) {
      data = null;
      $("#sessionList").innerHTML = '<div class="cb-msg"><p>開課日期讀取失敗，請確認網路後再試一次。</p><button type="button" class="btn ghost" id="retryLoad">重新讀取</button> ' + lineBtnHTML("或 LINE 詢問小豬") + "</div>";
      $("#retryLoad").addEventListener("click", () => { $("#sessionList").innerHTML = '<p class="cb-msg"><span class="cb-spin"></span>正在讀取開課日期…</p>'; loadSessions(); });
    }
  }

  /* ---------- STEP 03：表單 ---------- */
  const fields = {
    name: { el: "#fName", err: "#eName", check: v => !v ? "請填寫姓名" : v.length > 50 ? "最多 50 個字" : "" },
    phone: { el: "#fPhone", err: "#ePhone", check: v => !v ? "請填寫聯絡電話" : (!/^[0-9+\-()\s#]{8,20}$/.test(v) || v.replace(/\D/g, "").length < 8) ? "電話格式好像不太對，請再確認一下" : "" },
    line_id: { el: "#fLine", err: "#eLine", check: v => !v ? "請填寫 LINE ID" : "" },
    fb_name: { el: "#fFb", err: "#eFb", check: v => !v ? "請填寫 FB 名稱" : "" },
    birth_date: { el: "#fBirthDate", err: "#eBirthDate", only: "TWO_DAY", check: v => !v ? "請填寫出生日期" : (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v > todayISO() || v < "1920-01-01") ? "出生日期好像不太對，請再確認一下" : "" },
    birth_time: { el: "#fBirthTime", err: "#eBirthTime", only: "TWO_DAY", check: v => ($("#fBirthUnknown").checked || v) ? "" : "請填寫出生時間，或勾選「不清楚出生時間」" }
  };
  fields.prefer = { el: "#fPrefer", err: "#ePrefer", online: true, check: v => !v ? "請寫下希望的日期，方便小豬幫你安排" : "" };
  const activeFields = () => Object.keys(fields).filter(k =>
    (!fields[k].only || fields[k].only === baseOf(course)) && (!fields[k].online || isOnline(course)));
  function checkSlots() {
    const ok = slotsPicked().length > 0;
    $("#eSlots").textContent = ok ? "" : "請至少勾選一個方便的時段";
    return ok;
  }
  function preferText() {
    return slotsPicked().join("、") + "｜" + $("#fPrefer").value.trim();
  }
  function todayISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  const CHECKS = ["#fPay", "#fRefund", "#fNotice", "#fConsent"];
  $("#fBirthUnknown").addEventListener("change", () => {
    const t = $("#fBirthTime"); t.disabled = $("#fBirthUnknown").checked; if (t.disabled) t.value = "";
    if (t.getAttribute("aria-invalid") === "true") validateField("birth_time");
  });
  function validateField(k) {
    const f = fields[k], el = $(f.el), msg = f.check(el.value.trim());
    $(f.err).textContent = msg;
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  Object.keys(fields).forEach(k => {
    const el = $(fields[k].el);
    el.addEventListener("blur", () => { if (el.value) validateField(k); });
    el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") validateField(k); });
  });
  CHECKS.forEach(s => $(s).addEventListener("change", () => { if (CHECKS.every(c => $(c).checked)) $("#eConsent").textContent = ""; }));

  function updateSummary() {
    const box = $("#summary");
    if (course && isOnline(course)) {
      const sl = slotsPicked();
      box.innerHTML = "你選擇的是：<br><b>" + esc(courseName(course)) + "</b><br>線上一對一" + (sl.length ? "｜方便時段：" + esc(sl.join("、")) : "");
      return;
    }
    if (!course || !session) { box.textContent = ""; return; }
    box.innerHTML = "你選擇的是：<br><b>" + esc(courseName(course)) + "</b><br>" +
      session.dates.map(dayText).join("、") + "　" + esc(session.start_time) + "–" + esc(session.end_time);
  }

  function lock(on) {
    sending = on;
    const b = $("#submitBtn");
    b.disabled = on;
    b.innerHTML = on ? '<span class="cb-spin" aria-hidden="true"></span>資料送出中，請稍候…' : "送出資料，前往 LINE 確認";
    document.querySelectorAll("#cbForm input, #cbForm textarea").forEach(i => { if (i.type !== "radio" && i.type !== "checkbox") i.readOnly = on; });
  }

  $("#cbForm").addEventListener("submit", async ev => {
    ev.preventDefault();
    if (sending) return;                      // 防止連點
    const alert = $("#formAlert"); alert.textContent = "";
    if (!course) { alert.textContent = "請先選擇課程（STEP 01）。"; $("#stepCourse").scrollIntoView({ behavior: "smooth" }); return; }
    const online = isOnline(course);
    if (!online && !session) { alert.textContent = "請選擇開課日期（STEP 02）。"; $("#stepSession").scrollIntoView({ behavior: "smooth" }); return; }
    const slotsOk = online ? checkSlots() : true;
    const ok = activeFields().map(validateField).every(Boolean) && slotsOk;
    const allChecked = CHECKS.every(c => $(c).checked);
    $("#eConsent").textContent = allChecked ? "" : "請勾選上面每一個確認項目";
    if (!ok || !allChecked) {
      alert.textContent = "還有欄位需要確認，請看一下標示的地方。";
      const bad = (!slotsOk && $("#slotList input")) || document.querySelector('#cbForm [aria-invalid="true"]') || $(CHECKS.find(c => !$(c).checked));
      bad.focus(); return;
    }
    if (!CFG.API_URL) { alert.textContent = "報名系統尚未開放，請先透過 LINE 詢問小豬。"; return; }

    requestId = requestId || newId();
    const payload = {
      action: "book", request_id: requestId, course_id: course, session_id: online ? "ONLINE" : session.session_id,
      preferred_time: online ? preferText() : "",
      name: $("#fName").value.trim(), phone: $("#fPhone").value.trim(),
      line_id: $("#fLine").value.trim(), fb_name: $("#fFb").value.trim(),
      birth_date: baseOf(course) === "TWO_DAY" ? $("#fBirthDate").value : "",
      birth_time: baseOf(course) === "TWO_DAY" ? ($("#fBirthUnknown").checked ? "不清楚" : $("#fBirthTime").value) : "",
      pets: $("#fPets").value.trim(),
      pay_ack: $("#fPay").checked, refund_ack: $("#fRefund").checked, notice_ack: $("#fNotice").checked, consent: $("#fConsent").checked,
      website: $("#fWebsite").value
    };
    lock(true);
    try {
      // 用 text/plain 送出，屬於「簡單請求」，不會觸發 CORS 預檢，Apps Script 可以正常接收
      const r = await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!j.ok) {
        alert.textContent = j.error || "資料沒有送出成功，請再試一次。";
        if (j.code === "FULL" || j.code === "SESSION_CLOSED") { requestId = null; session = null; await loadSessions(); $("#stepSession").scrollIntoView({ behavior: "smooth" }); }
        else if (j.field && fields[j.field]) { $(fields[j.field].err).textContent = j.error; $(fields[j.field].el).focus(); }
        else if (j.code === "INVALID") { requestId = null; }
        return;
      }
      showDone(j);
    } catch (e) {
      // 連線中斷時不確定是否已寫入：保留同一個 requestId，再按一次送出不會重複報名
      alert.textContent = "連線不太穩定，資料可能沒有送出。請確認網路後再按一次送出（不會重複報名）。";
    } finally {
      lock(false);
    }
  });

  /* ---------- STEP 05：成功 → LINE ---------- */
  function showDone(j) {
    setStep(4);
    const cid = j.course_id || course;
    let info = "【Ohana 課程報名確認】\n" +
      "報名編號：" + j.booking_id + "\n" +
      "課程名稱：" + courseName(cid) + "\n";
    if (isOnline(cid)) {
      info += "上課方式：線上一對一\n" +
        "方便時段：" + slotsPicked().join("、") + "\n" +
        "希望日期：" + $("#fPrefer").value.trim();
    } else {
      const dates = ((j.dates && j.dates.length) ? j.dates : session.dates).map(dayText).join("、");
      info += "開課日期：" + dates + "\n" +
        "上課時間：" + (j.start_time || session.start_time) + "–" + (j.end_time || session.end_time);
    }
    $("#doneInfo").textContent = info;

    // 只把報名編號、課程、日期帶進 LINE；電話與信箱不會放進網址
    // 手機：用 LINE 官方帳號的「預填訊息」連結（@ 要編碼成 %40），在同一個分頁開啟，LINE App 才接得到
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    const canPrefill = mobile && CFG.LINE_ID;
    const btn = $("#lineBtn");
    btn.href = canPrefill
      ? "https://line.me/R/oaMessage/" + encodeURIComponent(CFG.LINE_ID) + "/?" + encodeURIComponent(info)
      : CFG.LINE_URL;
    if (canPrefill) btn.removeAttribute("target"); else btn.setAttribute("target", "_blank");
    $("#doneHint").textContent = canPrefill
      ? "按下按鈕會開啟 LINE 並帶入報名資訊，按「傳送」就完成囉！我們也會同時幫你複製報名資訊，如果 LINE 裡沒有出現文字（例如還沒加好友），加入好友後直接長按「貼上」傳送就可以 ♡"
      : "請先按「複製報名資訊」，開啟 LINE 官方帳號後貼上傳送給小豬 ♡";

    $("#cbForm").hidden = true;
    const done = $("#done"); done.hidden = false;
    done.scrollIntoView({ behavior: "smooth", block: "start" }); done.focus({ preventScroll: true });
  }

  // 按「前往 LINE」時先自動複製報名資訊，萬一 LINE 沒帶入文字，也能直接貼上
  $("#lineBtn").addEventListener("click", () => {
    const text = $("#doneInfo").textContent;
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
  });

  $("#copyBtn").addEventListener("click", async () => {
    const text = $("#doneInfo").textContent, b = $("#copyBtn");
    try { await navigator.clipboard.writeText(text); b.textContent = "已複製 ✓"; }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents($("#doneInfo"));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      b.textContent = "已選取文字，請長按後選「拷貝」";
    }
    setTimeout(() => { b.textContent = "複製報名資訊"; }, 2500);
  });

  /* ---------- 啟動 ---------- */
  document.querySelectorAll("input[name=course]").forEach(i => i.addEventListener("change", () => pickCourse(idFor(i.value, mode), true)));
  document.querySelectorAll("input[name=mode]").forEach(i => i.addEventListener("change", () => setMode(i.value, true)));
  (CFG.ONLINE_SLOTS || []).forEach(t => {
    const l = document.createElement("label");
    l.className = "cb-check cb-slot";
    l.innerHTML = '<input type="checkbox" value="' + esc(t) + '"><span>' + esc(t) + "</span>";
    l.querySelector("input").addEventListener("change", () => { if ($("#eSlots").textContent) checkSlots(); setStep(slotsPicked().length ? 3 : 2); updateSummary(); });
    $("#slotList").appendChild(l);
  });
  $("#fBirthDate").max = todayISO();
  paintCourses();
  const q = (new URLSearchParams(location.search).get("course") || "").toUpperCase().replace(/-/g, "_");
  if (COURSES[q]) pickCourse(q, false);
  loadSessions();
})();

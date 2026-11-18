(function () {
  const C = SITE_CONFIG;
  document.querySelectorAll("[data-link]").forEach(a => { const u = C[a.dataset.link]; if (u) a.href = u; });
  document.querySelectorAll("[data-text]").forEach(e => { e.textContent = C[e.dataset.text] || ""; });
  document.querySelectorAll("[data-photo]").forEach(box => {
    const src = C.PHOTOS[box.dataset.photo]; if (!src) return;
    const orig = box.innerHTML, img = new Image();
    img.alt = box.dataset.alt || "";
    img.onload = () => { box.innerHTML = ""; box.appendChild(img); box.classList.add("has-img"); };
    img.onerror = () => { box.innerHTML = orig; };   // 圖片讀不到時，保留佔位圖
    img.src = src;
  });
  const nav = document.getElementById("nav"), btn = document.getElementById("menuBtn");
  btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
  nav.addEventListener("click", e => { if (e.target.tagName === "A") { nav.classList.remove("open"); btn.setAttribute("aria-expanded", false); } });
  // 下拉選單：點箭頭展開／收合
  document.querySelectorAll(".sub-btn").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const li = b.parentElement, o = !li.classList.contains("open");
    document.querySelectorAll(".has-sub.open").forEach(x => { x.classList.remove("open"); x.querySelector(".sub-btn").setAttribute("aria-expanded", false); });
    li.classList.toggle("open", o); b.setAttribute("aria-expanded", o);
  }));
  document.addEventListener("click", e => { if (!e.target.closest(".has-sub")) document.querySelectorAll(".has-sub.open").forEach(x => { x.classList.remove("open"); x.querySelector(".sub-btn").setAttribute("aria-expanded", false); }); });
  const all = document.querySelectorAll(".rv");
  const show = () => all.forEach(el => el.classList.add("in"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .05 });
    all.forEach(el => io.observe(el));
    setTimeout(show, 2500);   // 保險：2.5 秒後一定全部顯示
  } else show();
})();

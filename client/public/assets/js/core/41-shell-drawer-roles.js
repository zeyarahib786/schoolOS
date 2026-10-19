/* ============ DRAWER ============ */
function openDrawer(html) {
  window._lastFocus = document.activeElement;
  $("#drawer").innerHTML = html;
  $("#drawer").removeAttribute("aria-hidden");
  $("#drawer").classList.add("on");
  $("#scrim").classList.add("on");
  a11yEnhance($("#drawer"));
  localizeView($("#drawer"));
  setTimeout(() => {
    const d = $("#drawer");
    const f = d.querySelector("button,[href],input,select,textarea,[tabindex]");
    (f || d).focus && (f || d).focus();
  }, 60);
}
function closeDrawer() {
  $("#drawer").classList.remove("on");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#scrim").classList.remove("on");
  if (window._lastFocus && window._lastFocus.focus) {
    try {
      window._lastFocus.focus();
    } catch (e) {}
  }
}
function toggleSidebar() {
  const open = $("#sidebar").classList.toggle("open");
  $("#sbBackdrop").classList.toggle("on", open);
}
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sbBackdrop").classList.remove("on");
}

/* ============ NAV RENDER ============ */
function renderNav() {
  const nav = $("#nav");
  nav.innerHTML = "";
  NAV.forEach((g) => {
    const items = g.items.filter(
      (it) => (!it.roles || it.roles.includes(state.role)) && modOn(it.id),
    );
    if (!items.length) return;
    const gd = document.createElement("div");
    gd.className = "nav-group";
    gd.innerHTML = `<div class="nav-label">${t(g.group)}</div>`;
    items.forEach((it) => {
      const a = document.createElement("div");
      const active = state.module === it.id;
      a.className = "nav-item" + (active ? " active" : "");
      a.setAttribute("role", "link");
      a.setAttribute("tabindex", "0");
      if (active) a.setAttribute("aria-current", "page");
      a.setAttribute("aria-label", t(it.label));
      a.onclick = () => go(it.id);
      a.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go(it.id);
        }
      };
      a.innerHTML =
        ic(it.icon) +
        `<span>${t(it.label)}</span>` +
        (it.tag ? `<span class="tag" aria-hidden="true">${it.tag}</span>` : "");
      gd.appendChild(a);
    });
    nav.appendChild(gd);
  });
}
function flatItems() {
  const o = [];
  NAV.forEach((g) =>
    g.items.forEach((it) => o.push({ ...it, group: g.group })),
  );
  return o;
}
function go(id) {
  state.module = id;
  const it = flatItems().find((x) => x.id === id) || {
    label: "Dashboard",
    group: "Overview",
  };
  $("#crumb").textContent = t(it.group);
  $("#tbTitle").textContent = t(it.label);
  closeSidebar();
  closeDrawer();
  renderNav();
  render();
  $("#view").scrollTop = 0;
}

/* ============ ROLES ============ */
function setRole(r) {
  state.role = r;
  $("#rolePill").textContent = t(r);
  $("#userRole").textContent = t(r);
  const av = $(".sb-user .ua"),
    nm = $(".sb-user .ut .n");
  const profiles = {
    Administrator: ["Rashid Al Maktoum", "RA"],
    Principal: ["Dr. Salma Haddad", "SH"],
    Teacher: ["Rohan Mehta", "RM"],
    Accountant: ["Joseph Thomas", "JT"],
    Parent: ["Khalid Al Hashimi", "KA"],
    Student: ["Fatima Al Hashimi", "FA"],
  };
  nm.textContent = t(profiles[r][0]);
  av.textContent = profiles[r][1];
  if (state.module !== "dashboard") {
    const allowed = flatItems().find((x) => x.id === state.module);
    if (allowed && allowed.roles && !allowed.roles.includes(r))
      state.module = "dashboard";
  }
  renderNav();
  render();
}
function cycleRole() {
  const i = ROLES.indexOf(state.role);
  setRole(ROLES[(i + 1) % ROLES.length]);
  toast("Viewing as " + t(state.role));
}
/* ============ KPI helper ============ */
function kpi(icon, color, label, val, trend, onclick, active) {
  const tcls = trend
    ? trend.dir === "up"
      ? "up"
      : trend.dir === "down"
        ? "down"
        : "flat"
    : "";
  const tarrow = trend
    ? trend.dir === "up"
      ? "▲"
      : trend.dir === "down"
        ? "▼"
        : "•"
    : "";
  const labTr = typeof schoolTranslateText === "function" ? schoolTranslateText(label) : (typeof t === "function" ? t(label) : label);
  const valTr = typeof schoolArabicDigits === "function" ? schoolArabicDigits(val) : val;
  const vTr = trend ? (typeof schoolTranslateText === "function" ? schoolTranslateText(trend.v) : (typeof schoolArabicDigits === "function" ? schoolArabicDigits(trend.v) : trend.v)) : "";
  const noteTr = trend ? (typeof schoolTranslateText === "function" ? schoolTranslateText(trend.note) : (typeof t === "function" ? t(trend.note) : trend.note)) : "";
  return `<div class="card pad kpi${onclick ? " kpi-click" : ""}${active ? " kpi-active" : ""}"${onclick ? ` onclick="${onclick}" role="button" tabindex="0"` : ""}>
    ${onclick ? `<span class="kpi-go">${ic(active ? "att" : "arrow", 14)}</span>` : ""}
    <div class="kp-top"><div class="kp-ic" style="background:${color}14;color:${color}">${ic(icon, 20)}</div><div class="kp-lab">${labTr}</div></div>
    <div class="kp-val num">${valTr}</div>
    ${trend ? `<div class="kp-sub"><span class="trend ${tcls}">${tarrow} ${vTr}</span><span>${noteTr}</span></div>` : ""}
  </div>`;
}
function vbars(data) {
  // [{lb,val,pct,alt}]
  return `<div class="vbars">${data.map((d) => `<div class="vb"><div class="col${d.alt ? " alt" : ""}" style="height:${d.pct}%" title="${d.val}"></div><div class="lb">${d.lb}</div></div>`).join("")}</div>`;
}

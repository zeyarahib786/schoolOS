/* ============ DRAWER ============ */
window.schoolDrawerTrail = [];
function drawerScope() { return (window.SCHOOLOS_ADAPTER?.user?._id || '') + ':' + state.module; }
function drawerEnhance() {
  const drawer = $("#drawer"), header = drawer.querySelector('.dh');
  if (header && !header.querySelector('.workspace-back')) {
    const back = document.createElement('button');
    back.className = 'btn workspace-back'; back.type = 'button'; back.onclick = backDrawer;
    back.setAttribute('aria-label', 'Back');
    back.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14"/></svg><span>Back</span>';
    header.prepend(back);
  }
  drawer.querySelectorAll('button[onclick="closeDrawer()"]').forEach(button => {
    if (!button.textContent.trim()) button.setAttribute('aria-label', 'Close details');
  });
  a11yEnhance(drawer); localizeView(drawer);
}
function openDrawer(html, options = {}) {
  const drawer = $("#drawer"), wasOpen = drawer.classList.contains('on');
  const scope = drawerScope(), sameScope = window.schoolDrawerScope === scope;
  if (!wasOpen || window.schoolDrawerScope !== scope) {
    window.schoolDrawerTrail = [];
    window._lastFocus = document.activeElement;
  }
  window.schoolDrawerScope = scope;
  const template = document.createElement('template'); template.innerHTML = html;
  const oldTitle = drawer.querySelector('.dh h3')?.textContent;
  const newTitle = template.content.querySelector('.dh h3')?.textContent;
  const oldForm = drawer.querySelector('.form-body'), newForm = template.content.querySelector('.form-body');
  const sensitive = drawer.querySelector('#schoolCredentialReceipt,input[type="password"]');
  // Keep actual nodes so unsaved wizard values and event listeners survive Back.
  // Completed forms and one-time credentials must never be resurrected from history.
  if (wasOpen && sameScope && options.replace !== true && !sensitive && !(oldForm && !newForm) && !(oldTitle && oldTitle === newTitle && !oldForm && !newForm)) {
    window.schoolDrawerTrail.push({ nodes: [...drawer.childNodes], scroll: drawer.querySelector('.db')?.scrollTop || 0, options: window.schoolDrawerOptions || {} });
    if (window.schoolDrawerTrail.length > 20) window.schoolDrawerTrail.shift();
  }
  window.schoolDrawerOptions = options;
  drawer.replaceChildren(template.content);
  document.querySelector('.main')?.setAttribute('inert', '');
  drawer.removeAttribute('aria-hidden'); drawer.classList.add('on'); $("#scrim").classList.add('on');
  drawerEnhance();
  const anchor = drawer.firstElementChild;
  setTimeout(() => { if (drawer.firstElementChild === anchor && drawer.classList.contains('on')) (drawer.querySelector('button,[href],input,select,textarea,[tabindex]') || drawer).focus?.(); }, 60);
}
function backDrawer() {
  if (window.schoolDrawerScope !== drawerScope()) { closeDrawer(); return; }
  const previous = window.schoolDrawerTrail.pop();
  if (!previous) { closeDrawer(); return; }
  const drawer = $("#drawer");
  drawer.replaceChildren(...previous.nodes); window.schoolDrawerOptions = previous.options;
  drawerEnhance();
  const body = drawer.querySelector('.db'); if (body) body.scrollTop = previous.scroll;
  drawer.querySelector('.workspace-back')?.focus();
  previous.options.onRestore?.(previous.scroll);
}
function closeDrawer() {
  window.schoolDrawerTrail = []; window.schoolDrawerOptions = {};
  document.querySelector('.main')?.removeAttribute('inert');
  if (document.getElementById('schoolCredentialReceipt')) $("#drawer").innerHTML = '';
  $("#drawer").classList.remove('on'); $("#drawer").setAttribute('aria-hidden', 'true'); $("#scrim").classList.remove('on');
  if (window._lastFocus?.isConnected) { try { window._lastFocus.focus(); } catch (e) {} }
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

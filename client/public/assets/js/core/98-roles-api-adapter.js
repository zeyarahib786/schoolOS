/* ============ ROLES & ACCESS LIVE ADAPTER ============
 * Persists the established permission matrix and custom-role form without changing the UI.
 */
(function () {
  'use strict';
  var MODULE_IDS = {
    Students: 'students', Admissions: 'admissions', Attendance: 'attendance', 'Exams & Gradebook': 'exams',
    'Fees & Finance': 'fees', Payroll: 'payroll', Communication: 'comm', 'AI Insights': 'aiinsights',
    Reports: 'reports', 'Audit Log': 'audit', Settings: 'settings'
  };
  function adapter() { return window.SCHOOLOS_ADAPTER; }
  function fail(error) { console.warn('[SchoolOS] Roles write failed:', error); if (typeof toast === 'function') toast('Not saved — ' + error.message); }
  function applyNavigation(roles) {
    if (typeof NAV === 'undefined') return;
    Object.keys(MODULE_IDS).forEach(function (moduleName) {
      var id = MODULE_IDS[moduleName];
      NAV.forEach(function (group) { group.items.forEach(function (item) {
        if (item.id === id) item.roles = roles.filter(function (role) { return role.permissions && role.permissions[moduleName]; }).map(function (role) { return role.name; });
      }); });
    });
  }
  function sync(payload) {
    var api = adapter(), roles = payload.roles || [];
    api.accessRoles = roles; api.accessModules = payload.modules || []; api.accessRoleIds = {}; api.rbacTotalUsers = payload.totalUsers || 0; api.rbacUsersByRole = payload.usersByRole || {};
    roles.forEach(function (role) { api.accessRoleIds[role.name] = role._id; });
    if (typeof ROLES !== 'undefined' && typeof PERMROWS !== 'undefined') {
      ROLES.length = 0; roles.forEach(function (role) { ROLES.push(role.name); });
      PERMROWS.length = 0;
      (payload.modules || []).forEach(function (moduleName) { PERMROWS.push([moduleName, roles.map(function (role) { return role.permissions && role.permissions[moduleName] ? 1 : 0; })]); });
    }
    applyNavigation(roles);
    api.live.roles = true;
    if (typeof renderNav === 'function') renderNav();
    if (typeof state !== 'undefined' && state.module === 'roles' && typeof render === 'function') render();
    return true;
  }
  function hydrateRoles() {
    var api = adapter();
    if (!api || !api.token || !api.user) return Promise.resolve(false);
    if (api.user.role !== 'Administrator') {
      return api.api('/roles/me').then(function (response) {
        api.myAccessRole = response.data; applyNavigation([response.data]); api.live.roles = true;
        if (typeof renderNav === 'function') renderNav(); return true;
      }).catch(function (error) { console.info('[SchoolOS] keeping default role navigation:', error.message); return false; });
    }
    return api.api('/roles').then(function (response) { return sync(response.data || {}); })
      .catch(function (error) { console.info('[SchoolOS] keeping default permission matrix:', error.message); return false; });
  }
  function install() {
    var api = adapter();
    if (!api || !api.connected || api.rolesWorkflowInstalled || api.user.role !== 'Administrator') return;
    api.rolesWorkflowInstalled = true;
    window.togglePerm = function (rowIndex, roleIndex) {
      var row = PERMROWS[rowIndex], roleName = ROLES[roleIndex], id = api.accessRoleIds && api.accessRoleIds[roleName];
      if (!row || !id) return toast('Not saved — role is unavailable on the server');
      var writeKey = roleName + '|' + row[0]; api.roleWrites = api.roleWrites || {};
      if (api.roleWrites[writeKey]) { toast('Saving permission change…'); return api.roleWrites[writeKey]; }
      var enabled = !Boolean(row[1][roleIndex]);
      api.roleWrites[writeKey] = api.api('/roles/' + id + '/permissions/' + encodeURIComponent(row[0]), { method: 'PATCH', body: JSON.stringify({ enabled: enabled }) })
        .then(hydrateRoles).then(function () { toast(row[0] + ' · ' + roleName + (enabled ? ' granted' : ' revoked')); })
        .catch(fail).finally(function () { delete api.roleWrites[writeKey]; });
      return api.roleWrites[writeKey];
    };
    window.addRole = function (values) {
      values = values || {}; var name = String(values.role || '').trim();
      if (!name) { toast('Role name is required'); return false; }
      return api.api('/roles', { method: 'POST', body: JSON.stringify({ name: name, basedOn: values.base || 'Teacher', description: values.desc || '' }) })
        .then(hydrateRoles).then(function () { closeDrawer(); toast('Role created · ' + name); }).catch(fail), false;
    };
  }
  function arm() {
    var attempts = 0, timer = setInterval(function () {
      attempts += 1;
      if (adapter() && adapter().connected) { clearInterval(timer); hydrateRoles().then(install); }
      else if (attempts > 600) clearInterval(timer);
    }, 100);
  }
  var originalEnter = window.enterApp;
  window.enterApp = function () { var result = originalEnter.apply(this, arguments); arm(); return result; };
  arm();
})();

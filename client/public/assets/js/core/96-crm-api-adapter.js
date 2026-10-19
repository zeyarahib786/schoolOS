/* ============ ENROLMENT CRM LIVE ADAPTER ============
 * Keeps the established CRM UI intact while replacing its in-memory mutations with API writes.
 */
(function () {
  'use strict';

  function adapter() { return window.SCHOOLOS_ADAPTER; }
  function rows() { try { return eval('CRMLEADS'); } catch (e) { return null; } }
  function dayOffset(value) {
    if (!value) return null;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var date = new Date(value); date.setHours(0, 0, 0, 0);
    return Math.round((date - now) / 86400000);
  }
  function idleDays(value) {
    var difference = Date.now() - new Date(value || Date.now()).getTime();
    return Math.max(0, Math.floor(difference / 86400000));
  }
  function label(value) {
    var date = new Date(value);
    if (dayOffset(date) === 0) return 'Today';
    return date.toLocaleDateString((typeof schoolLocale==='function'?schoolLocale():'en-GB'), { day: '2-digit', month: 'short' });
  }
  function mapLead(lead) {
    return {
      mongoId: lead._id, updatedAt: lead.updatedAt, name: lead.name, grade: lead.grade, stage: lead.stage, source: lead.source,
      phone: lead.phone || '—', guardian: lead.guardian || '—', email: lead.guardianEmail || '',
      ownerUserId: lead.ownerUserId, applicationId: lead.applicationId,
      owner: lead.owner, date: label(lead.createdAt), temp: lead.temperature,
      idle: idleDays(lead.lastActivityAt), follow: dayOffset(lead.followUpDate),
      followType: lead.followUpType || null, archived: Boolean(lead.archived),
      archReason: lead.archiveReason || null,
      log: (lead.activityLog || []).map(function (entry) { return [entry.action, label(entry.occurredAt)]; }),
    };
  }
  function hydrateCrm() {
    var api = adapter();
    var target = rows();
    if (!api || !api.token || !target) return Promise.resolve(false);
    return api.apiAll('/crm').then(function (response) {
      target.length = 0;
      Array.prototype.push.apply(target, (response.data || []).map(mapLead));
      api.crmRows = target;
      api.live.crm = true;
      if (typeof render === 'function' && typeof state !== 'undefined' && state.module === 'crm') render();
      return true;
    }).catch(function (error) {
      target.length=0;api.live.crm=false;api.crmError=error.message;console.info('[SchoolOS] CRM unavailable:', error.message);
      return false;
    });
  }
  function lead(name) {
    var target = rows();
    return target && target.find(function (item) { return item.mongoId === name || item.name === name; });
  }
  function fail(error) { console.warn('[SchoolOS] CRM write failed:', error); if (typeof toast === 'function') toast('Not saved — ' + error.message); }
  function drawerNode() { return document.getElementById('drawer')?.firstElementChild; }
  function persist(path, options, original, args, fullRefresh) {
    var sourceDrawer = drawerNode(), sourceModule = state.module;
    return adapter().api(path, options || { method: 'POST' })
      .then(function () {
        // A completed older action must not replace a newer form or navigation.
        if (state.module === sourceModule && drawerNode() === sourceDrawer) original.apply(null, args || []);
        return fullRefresh ? adapter().hydrate() : hydrateCrm();
      })
      .then(function () { if (typeof render === 'function') render(); })
      .catch(fail);
  }
  function wrap(name, handler) {
    var original = window[name];
    if (typeof original !== 'function' || original.__apiBacked) return;
    var wrapped = handler(original);
    wrapped.__apiBacked = true;
    window[name] = wrapped;
  }
  function isoAfter(days) {
    var date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function install() {
    var api = adapter();
    if (!api || !api.connected || api.crmWorkflowInstalled) return;
    api.crmWorkflowInstalled = true;
    api.hydrateCrm=hydrateCrm;

    wrap('addLead', function (original) { return function (values) {
      values = values || {};
      var name = String(values.name || '').trim();
      if (!name) { toast('Student name is required'); return false; }
      var body = {
        name: name, grade: values.grade || 'Grade 1', source: values.source || 'Website',
        phone: String(values.phone || '').trim() || undefined, guardian: String(values.guardian || '').trim() || undefined,
        guardianEmail: String(values.email || '').trim() || undefined, owner: values.owner || 'Front Office',
        temperature: values.temp || 'Warm', followUpDate: values.followdate || undefined,
        notes: String(values.notes || '').trim() || undefined,
      };
      var sourceDrawer = drawerNode(), sourceModule = state.module;
      api.api('/crm', { method: 'POST', body: JSON.stringify(body) }).then(function(response) {
        return hydrateCrm().then(function() {
          if(state.module === sourceModule && drawerNode() === sourceDrawer) {
            closeDrawer();openDrawer(crmDetail(response.data._id));
          }
          render();toast('CRM record saved');
        });
      }).catch(fail);
      return false;
    }; });
    wrap('quickSchedule', function (original) { return function (name, days) {
      var item = lead(name); if (!item || !item.mongoId) return toast('Not saved — lead is unavailable on the server');
      persist('/crm/' + item.mongoId + '/follow-up', { method: 'PUT', body: JSON.stringify({ date: isoAfter(days), type: 'Scheduled' }) }, original, [name, days]);
    }; });
    wrap('followLater', function (original) { return function (name) {
      var item = lead(name); if (!item || !item.mongoId) return toast('Not saved — lead is unavailable on the server');
      persist('/crm/' + item.mongoId + '/follow-up', { method: 'PUT', body: JSON.stringify({ date: isoAfter(7), type: 'Follow later' }) }, original, [name]);
    }; });
    wrap('saveSchedule', function (original) { return function (values) {
      var item = lead(state._crmActive); if (!item || !item.mongoId) return false;
      persist('/crm/' + item.mongoId + '/follow-up', { method: 'PUT', body: JSON.stringify({
        date: values.date, type: values.type || 'Follow-up', note: String(values.note || '').trim() || undefined,
      }) }, original, [values]);
      return false;
    }; });
    wrap('saveFollowup', function (original) { return function (values) {
      var item = lead(state._crmActive); if (!item || !item.mongoId) return false;
      persist('/crm/' + item.mongoId + '/activity', { method: 'POST', body: JSON.stringify({
        type: values.type || 'Note', outcome: values.outcome || undefined,
        notes: String(values.notes || '').trim() || undefined, temperature: values.temp || undefined,
      }) }, original, [values]);
      return false;
    }; });
    wrap('crmLogChannel', function (original) { return function (name, channel) {
      var item = lead(name); if (!item || !item.mongoId) return;
      persist('/crm/' + item.mongoId + '/activity', { method: 'POST', body: JSON.stringify({ type: channel }) }, original, [name, channel]);
    }; });
    wrap('advanceLead', function (original) { return function (name) {
      var item = lead(name); if (!item || !item.mongoId) return toast('Not saved — lead is unavailable on the server');
      persist('/crm/' + item.mongoId + '/advance', { method: 'POST' }, original, [name]);
    }; });
    wrap('archiveLead', function (original) { return function (name) {
      var item = lead(name); if (!item || !item.mongoId) return toast('Not saved — lead is unavailable on the server');
      var reason = item.idle >= 14 ? 'Archived — stale (' + item.idle + 'd idle)' : 'Archived — manual';
      persist('/crm/' + item.mongoId + '/archive', { method: 'POST', body: JSON.stringify({ reason: reason }) }, original, [name]);
    }; });
    wrap('saveLost', function (original) { return function (values) {
      var item = lead(state._crmActive); if (!item || !item.mongoId) return false;
      persist('/crm/' + item.mongoId + '/archive', { method: 'POST', body: JSON.stringify({
        reason: values.reason || 'Lost', note: String(values.note || '').trim() || undefined,
      }) }, original, [values]);
      return false;
    }; });
    wrap('restoreLead', function (original) { return function (name) {
      var item = lead(name); if (!item || !item.mongoId) return toast('Not saved — lead is unavailable on the server');
      persist('/crm/' + item.mongoId + '/restore', { method: 'POST' }, original, [name]);
    }; });
    wrap('deleteLead', function (original) { return function (name) {
      var item = lead(name); if (!item || !item.mongoId) return toast('Not saved — lead is unavailable on the server');
      persist('/crm/' + item.mongoId, { method: 'DELETE' }, original, [name]);
    }; });
    wrap('archiveStale', function (original) { return function () {
      var stale = (rows() || []).filter(function (item) { return !item.archived && item.stage !== 'Won' && item.follow == null && item.idle >= 14; });
      if (!stale.length) { original(); return; }
      Promise.all(stale.map(function (item) {
        return api.api('/crm/' + item.mongoId + '/archive', { method: 'POST', body: JSON.stringify({ reason: 'Auto-archived — stale (' + item.idle + 'd idle)' }) });
      })).then(function () { original(); return hydrateCrm(); }).then(function () { render(); }).catch(fail);
    }; });
    wrap('convertLead', function (original) { return function (name) {
      var item = lead(name); if (!item || !item.mongoId) return toast('Not saved — lead is unavailable on the server');
      persist('/crm/' + item.mongoId + '/convert', { method: 'POST' }, original, [name], true);
    }; });
  }

  var originalEnter = window.enterApp;
  window.enterApp = function () {
    var result = originalEnter.apply(this, arguments);
    arm();
    return result;
  };
  function arm() {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (adapter() && adapter().connected) {
        clearInterval(timer);
        hydrateCrm().then(install);
      } else if (attempts > 600) clearInterval(timer);
    }, 100);
  }
  arm();
})();

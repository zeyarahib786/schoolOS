/* ============ PARENTS & GUARDIANS LIVE ADAPTER ============
 * Preserves the established Parents UI and makes its existing workflows API-backed.
 */
(function () {
  'use strict';
  function adapter() { return window.SCHOOLOS_ADAPTER; }
  function read(name) { try { return eval(name); } catch (error) { return null; } }
  function replace(name, value) { try { eval(name + ' = value'); return true; } catch (error) { return false; } }
  function dateLabel(value) {
    if (!value) return '—';
    var date = new Date(value), today = new Date(), yesterday = new Date(Date.now() - 86400000);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }
  function mapGuardian(row) {
    var children = (row.studentIds || []).map(function (student) { return student.refId || student._id; });
    var paid = (row.studentIds || []).length > 0 && (row.studentIds || []).every(function (student) { return student.feeStatus === 'Paid'; });
    return {
      mongoId: row._id, id: row.refId, name: row.name, relation: row.relation, phone: row.phone, email: row.email,
      children: children, portal: row.portalStatus, lastLogin: dateLabel(row.lastLoginAt), pickup: Boolean(row.pickupAuthorized),
      financial: Boolean(row.financialResponsible), custody: row.custody, consents: row.consents || {}, note: row.note || null,
      fee: paid ? 'Paid' : 'Due',
    };
  }
  function mapBroadcast(row) {
    return { mongoId: row._id, subject: row.subject, audience: row.audienceLabel, channel: row.channel,
      delivered: row.deliveredCount, read: row.readCount, sent: dateLabel(row.createdAt) };
  }
  function mapMessage(row) { return { mongoId: row._id, dir: row.direction, from: row.from, text: row.text, time: dateLabel(row.createdAt) }; }
  function mapMeeting(row) {
    var teacher = row.teacher || {}, guardian = row.bookedGuardian || row.bookedBy || {}, student = row.bookedForStudent || {};
    return {
      id: row._id, time: row.startTime, date: new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      parent: guardian.name || null,
      student: student.name ? student.name + (student.grade ? ' - ' + String(student.grade).replace('Grade ', 'Gr ') : '') : null,
      teacher: teacher.name || 'Unassigned', teacherMongoId: teacher._id || row.teacher,
      status: row.status || (row.bookedForStudent ? 'Confirmed' : 'Available'), link: row.link || null, room: row.room || 'TBC',
    };
  }
  function guardian(gid) { return (read('GUARDIANS') || []).find(function (row) { return row.id === gid; }); }
  function meeting(id) { return (read('MEETINGS') || []).find(function (row) { return row.id === id; }); }
  function fail(error) { console.warn('[SchoolOS] Parents write failed:', error); if (typeof toast === 'function') toast('Not saved — ' + error.message); }
  function refreshView() { if (typeof render === 'function') render(); }
  function parseDate(value) {
    var raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    var parsed = new Date(raw + ' ' + new Date().getFullYear());
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  function hydrateParents() {
    var api = adapter();
    if (!api || !api.token) return Promise.resolve(false);
    return Promise.all([api.api('/guardians?limit=100'), api.api('/guardians/broadcasts?limit=100'), api.api('/meetings?limit=100')])
      .then(function (responses) {
        var guardians = (responses[0].data || []).map(mapGuardian);
        replace('GUARDIANS', guardians);
        api.guardianRows = guardians;
        replace('PARENT_BROADCASTS', (responses[1].data || []).map(mapBroadcast));
        api.parentMeetings = (responses[2].data || []).map(mapMeeting);
        replace('MEETINGS', api.parentMeetings);
        api.guardianIds = {}; api.guardianIdsByName = {};
        guardians.forEach(function (row) { api.guardianIds[row.id] = row.mongoId; api.guardianIdsByName[row.name] = row.mongoId; });
        return Promise.all(guardians.map(function (row) {
          return api.api('/guardians/' + row.mongoId + '/messages').then(function (response) { return [row.id, (response.data || []).map(mapMessage)]; });
        }));
      })
      .then(function (threads) {
        var store = read('MSG_THREADS') || {};
        Object.keys(store).forEach(function (key) { delete store[key]; });
        threads.forEach(function (entry) { store[entry[0]] = entry[1]; });
        adapter().parentThreads = store;
        adapter().live.parents = true;
        adapter().live.parentMeetings = true;
        if (typeof state !== 'undefined' && state.page === 'parents') refreshView();
        return true;
      })
      .catch(function (error) { console.info('[SchoolOS] keeping Parents demo data:', error.message); return false; });
  }
  function wrap(name, factory) {
    var original = window[name];
    if (typeof original !== 'function' || original.__apiBacked) return;
    var wrapped = factory(original); wrapped.__apiBacked = true; window[name] = wrapped;
  }
  function persist(path, options, original, args) {
    return adapter().api(path, options || { method: 'POST' }).then(function () {
      if (original) original.apply(null, args || []);
      return hydrateParents();
    }).then(refreshView).catch(fail);
  }
  function install() {
    var api = adapter();
    if (!api || !api.connected || api.parentsWorkflowInstalled) return;
    api.parentsWorkflowInstalled = true;
    wrap('toggleGuardianPortal', function (original) { return function (gid) {
      var row = guardian(gid); if (!row) return;
      var status = row.portal === 'Active' ? 'Suspended' : 'Active';
      persist('/guardians/' + row.mongoId + '/portal', { method: 'PATCH', body: JSON.stringify({ status: status }) }, original, [gid]);
    }; });
    wrap('sendToParents', function (original) { return function (values) {
      values = values || {}; var body = {
        audience: values.audience || 'All parents', grade: values.grade || undefined, className: values.cls || undefined,
        channel: values.channel || 'In-app only', subject: values.subject, message: values.message,
      };
      if (body.audience === 'Individual guardian') {
        var match = String(values.guardian || '').match(/\(([^)]+)\)$/), row = match && guardian(match[1]);
        body.guardianId = row && row.mongoId;
      }
      persist('/guardians/broadcasts', { method: 'POST', body: JSON.stringify(body) }, original, [values]);
      return false;
    }; });
    wrap('sendThreadReply', function (original) { return function (gid) {
      var row = guardian(gid), input = document.getElementById('threadReply'), text = String(input && input.value || '').trim();
      if (!text) { toast('Type a message first'); return; }
      if (!row) return toast('Not saved — guardian is unavailable on the server');
      persist('/guardians/' + row.mongoId + '/messages', { method: 'POST', body: JSON.stringify({ text: text }) }, original, [gid]);
    }; });
    wrap('saveMeetingSlot', function (original) { return function (values) {
      values = values || {}; var date = parseDate(values.date || '18 Jun');
      var teacherId = api.staffIds && api.staffIds[values.teacher];
      if (!teacherId || !date) { toast('Not saved — select a valid teacher and date'); return false; }
      persist('/meetings', { method: 'POST', body: JSON.stringify({ teacherStaffId: teacherId, date: date, startTime: values.time || '12:00', room: values.room || 'TBC' }) }, original, [values]);
      return false;
    }; });
    wrap('confirmBooking', function (original) { return function (values) {
      var slot = meeting(state._meetingSlot), guardianMatch = String(values.guardian || '').match(/\(([^)]+)\)$/);
      var guardianRow = guardianMatch && guardian(guardianMatch[1]);
      var studentName = String(values.student || '').split(' - ')[0].trim(), studentId = api.studentIds && api.studentIds[studentName];
      if (!slot || !guardianRow || !studentId) { toast('Not saved — select a valid guardian and student'); return false; }
      persist('/meetings/' + slot.id + '/book-on-behalf', { method: 'POST', body: JSON.stringify({ guardianId: guardianRow.mongoId, studentId: studentId, note: values.note || undefined }) }, original, [values]);
      return false;
    }; });
    wrap('confirmMeeting', function (original) { return function (id) { persist('/meetings/' + id + '/confirm', { method: 'POST' }, original, [id]); }; });
    wrap('cancelMeeting', function (original) { return function (id) { persist('/meetings/' + id + '/cancel', { method: 'POST' }, original, [id]); }; });
    wrap('doReschedule', function (original) { return function (values) {
      var match = String(values.slot || '').match(/\(([^)]+)\)$/), targetId = match && match[1];
      if (!targetId) { toast('Select a slot'); return false; }
      persist('/meetings/' + state._reschedFrom + '/reschedule', { method: 'POST', body: JSON.stringify({ targetSlotId: targetId }) }, original, [values]);
      return false;
    }; });
    wrap('notifyMeeting', function (original) { return function (id) { return persist('/meetings/' + id + '/notify', { method: 'POST' }, original, [id]); }; });
  }
  var originalEnter = window.enterApp;
  window.enterApp = function () { var result = originalEnter.apply(this, arguments); arm(); return result; };
  function arm() {
    var attempts = 0, timer = setInterval(function () {
      attempts += 1;
      if (adapter() && adapter().connected) { clearInterval(timer); hydrateParents().then(install); }
      else if (attempts > 600) clearInterval(timer);
    }, 100);
  }
  arm();
})();

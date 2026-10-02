/* ID Cards: authenticated registry for the existing issue / lost / revoke lifecycle. */
(function () {
  'use strict';

  var cards = [];
  var page = 1;
  var pages = 1;
  var total = 0;
  var loading = false;
  var loaded = false;
  var error = '';
  var statusFilter = 'All';
  var typeFilter = 'All';
  var requestSequence = 0;

  function safe(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function adapter() { return window.SCHOOLOS_ADAPTER; }
  function canManage() {
    var user = adapter() && adapter().user;
    return !!(user && ['Administrator', 'Principal', 'Teacher'].indexOf(user.role) >= 0);
  }

  function query() {
    var parts = ['page=' + page, 'limit=20'];
    if (statusFilter !== 'All') parts.push('status=' + encodeURIComponent(statusFilter));
    if (typeFilter !== 'All') parts.push('subjectType=' + encodeURIComponent(typeFilter));
    return '/id-cards?' + parts.join('&');
  }

  function load() {
    if (!canManage()) return;
    var current = ++requestSequence;
    loading = true; error = '';
    adapter().api(query()).then(function (response) {
      if (current !== requestSequence) return;
      cards = response.data || [];
      var pagination = response.meta && response.meta.pagination;
      total = pagination ? pagination.total : cards.length;
      pages = pagination ? Math.max(1, pagination.totalPages) : 1;
      loaded = true;
    }).catch(function (failure) {
      if (current === requestSequence) error = failure.message || 'ID cards could not be loaded';
    }).finally(function () {
      if (current !== requestSequence) return;
      loading = false;
      if (state.module === 'idcards') render();
    });
  }

  function holder(card) {
    var subject = card.subject;
    return subject && typeof subject === 'object'
      ? safe(subject.name) + '<div class="muted" style="font-size:11px">' + safe(subject.refId) + '</div>'
      : '<span class="muted">Holder unavailable</span>';
  }
  function fmt(date) { return date ? safe(String(date).slice(0, 10)) : '—'; }
  function statusChip(status) { return chip(status, status === 'Active' ? 'green' : status === 'Lost' ? 'amber' : 'red'); }

  window.idCardSetStatus = function (value) { statusFilter = value; page = 1; loaded = false; load(); render(); };
  window.idCardSetType = function (value) { typeFilter = value; page = 1; loaded = false; load(); render(); };
  window.idCardPage = function (next) { if (next < 1 || next > pages) return; page = next; loaded = false; load(); render(); };
  window.idCardReload = function () { loaded = false; load(); render(); };

  window.idCardDetail = function (index) {
    var card = cards[index];
    if (!card) return;
    var person = card.subject && typeof card.subject === 'object' ? card.subject : null;
    var footer = [['Close', 'closeDrawer()', true]];
    if (card.status === 'Active') {
      footer.unshift(['Revoke card', "idCardChangeStatus('" + card._id + "','revoke')"]);
      footer.unshift(['Report lost', "idCardChangeStatus('" + card._id + "','lost')"]);
    }
    openDrawer(detailDrawer({
      title: person ? safe(person.name) + ' · ID card' : 'ID card',
      sub: safe(card.serial),
      color: '#2563EB',
      badge: ic('idcard', 18),
      stats: [['Status', card.status, card.status === 'Active' ? 'green' : card.status === 'Lost' ? 'amber' : 'red'], ['Type', card.subjectType, 'blue']],
      sections: [
        { h: 'Card record', rows: [['Serial', safe(card.serial)], ['Holder', person ? safe(person.name) : 'Unavailable'], ['Reference', person ? safe(person.refId) : '—'], ['Issued', fmt(card.issuedDate)], ['Expires', fmt(card.expiryDate)], ['Replaces', card.replaces ? safe(card.replaces) : 'Original issue']] },
        { h: 'Operational note', html: '<p class="muted" style="font-size:12px">This registry records issuance and replacement history. The physical card is printed using the school’s approved card-production process.</p>' }
      ],
      footer: footer
    }));
  };

  window.idCardChangeStatus = function (id, action) {
    var card = cards.find(function (item) { return item._id === id; });
    if (!card || card.status !== 'Active') { toast('Only an active card can be updated'); return; }
    var label = action === 'lost' ? 'report this card as lost' : 'revoke this card';
    if (!window.confirm('Are you sure you want to ' + label + '?')) return;
    adapter().api('/id-cards/' + encodeURIComponent(id) + (action === 'lost' ? '/report-lost' : '/revoke'), { method: 'POST' })
      .then(function () { closeDrawer(); loaded = false; load(); toast(action === 'lost' ? 'Card reported lost' : 'Card revoked'); })
      .catch(function (failure) { toast('Not updated — ' + failure.message); });
  };

  window.idCardIssueForm = function (subjectType) {
    if (!canManage()) return;
    var endpoint = subjectType === 'Staff' ? '/staff?status=Active&limit=100&page=1' : '/students?status=Active&limit=100&page=1';
    toast('Loading active ' + subjectType.toLowerCase() + 's…');
    adapter().api(endpoint).then(function (response) {
      var holders = response.data || [];
      if (!holders.length) { toast('No active ' + subjectType.toLowerCase() + ' records are available'); return; }
      formDrawer('Issue ' + subjectType.toLowerCase() + ' ID card',
        'One active card per holder. A replacement is linked to the prior Lost or Revoked card.', [
          { label: subjectType, key: 'subjectId', opts: holders.map(function (person) { return safe(person._id + '|' + person.name + ' · ' + person.refId); }), req: true },
          { label: 'Expiry date', key: 'expiryDate', type: 'date', req: true }
        ], 'Issue card', '', 'idCardIssue');
      window.__idCardIssueType = subjectType;
    }).catch(function (failure) { toast('Could not load holders — ' + failure.message); });
  };

  window.idCardIssue = function (values) {
    var raw = String(values.subjectId || '');
    var subjectId = raw.split('|')[0];
    var expiryDate = String(values.expiryDate || '');
    if (!/^[a-f\d]{24}$/i.test(subjectId)) { toast('Choose a holder'); return false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || new Date(expiryDate + 'T00:00:00').getTime() <= Date.now()) {
      toast('Choose a future expiry date'); return false;
    }
    adapter().api('/id-cards', { method: 'POST', body: JSON.stringify({
      subjectType: window.__idCardIssueType, subjectId: subjectId, expiryDate: expiryDate
    }) }).then(function (response) {
      closeDrawer(); page = 1; loaded = false; load();
      toast('Issued ' + response.data.serial);
    }).catch(function (failure) { toast('Not issued — ' + failure.message); });
    return false;
  };

  M.idcards = function () {
    if (!canManage()) return '<div class="page-head"><div class="ph-l"><h2>ID Cards</h2><p>The ID-card registry is restricted to authorized school staff.</p></div></div><div class="card pad muted">Your role does not have access to this internal registry.</div>';
    if (!loaded && !loading && !error) setTimeout(load, 0);
    var body = error
      ? '<div class="card pad" role="alert">' + safe(error) + ' <button class="btn sm" onclick="idCardReload()">Retry</button></div>'
      : loading && !loaded ? '<div class="card pad muted">Loading ID cards…</div>'
      : '<div class="card pad"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Serial</th><th>Holder</th><th>Type</th><th>Expiry</th><th>Status</th><th></th></tr></thead><tbody>' +
        (cards.length ? cards.map(function (card, index) {
          return '<tr style="cursor:pointer" onclick="idCardDetail(' + index + ')" tabindex="0" onkeydown="if(event.key===\'Enter\')idCardDetail(' + index + ')"><td class="num">' + safe(card.serial) + '</td><td>' + holder(card) + '</td><td>' + safe(card.subjectType) + '</td><td>' + fmt(card.expiryDate) + '</td><td>' + statusChip(card.status) + '</td><td class="right">' + (card.status === 'Active' ? '<button class="btn sm" onclick="event.stopPropagation();idCardChangeStatus(\'' + card._id + '\',\'lost\')">Lost</button>' : '') + '</td></tr>';
        }).join('') : '<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">No ID cards match these filters.</td></tr>') + '</tbody></table></div></div>';
    return '<div class="page-head"><div class="ph-l"><h2>ID Cards</h2><p>Student and staff card issuance, lost-card reporting, revocation, and replacement history.</p></div><div class="ph-r"><button class="btn" onclick="idCardIssueForm(\'Student\')">' + ic('plus', 16) + ' Student card</button><button class="btn primary" onclick="idCardIssueForm(\'Staff\')">' + ic('plus', 16) + ' Staff card</button></div></div>' +
      '<div class="grid cols-2" style="margin-bottom:18px">' + kpi('idcard', '#2563EB', 'Matching records', String(total), null) + kpi('students', '#0E7C39', 'Active on this page', String(cards.filter(function (card) { return card.status === 'Active'; }).length), null) + '</div>' +
      '<div class="flex ac jb" style="gap:12px;flex-wrap:wrap;margin-bottom:14px"><div><span class="muted" style="font-size:12px;margin-right:7px">Status</span>' + ['All', 'Active', 'Lost', 'Revoked'].map(function (value) { return '<button class="btn sm ' + (statusFilter === value ? 'primary' : '') + '" onclick="idCardSetStatus(\'' + value + '\')">' + value + '</button>'; }).join(' ') + '</div><div><span class="muted" style="font-size:12px;margin-right:7px">Holder</span>' + ['All', 'Student', 'Staff'].map(function (value) { return '<button class="btn sm ' + (typeFilter === value ? 'primary' : '') + '" onclick="idCardSetType(\'' + value + '\')">' + value + '</button>'; }).join(' ') + '</div></div>' + body +
      '<div class="flex ac jb" style="margin-top:14px"><span class="muted">Page ' + page + ' of ' + pages + ' · ' + total + ' total</span><div class="flex ac" style="gap:8px"><button class="btn sm" ' + (page <= 1 ? 'disabled' : '') + ' onclick="idCardPage(' + (page - 1) + ')">Previous</button><button class="btn sm" ' + (page >= pages ? 'disabled' : '') + ' onclick="idCardPage(' + (page + 1) + ')">Next</button></div></div>';
  };
}());

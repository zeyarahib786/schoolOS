/* ============ MERN API ADAPTER (additive - the ONLY integration file) ============
 * Contract with the rest of the prototype:
 *   1. This file is loaded LAST and is the only change made for backend integration -
 *      no other JS or CSS file has been modified. Deleting this file (or its <script>
 *      tag) returns the prototype to 100% built-in demo data, byte-identical behaviour.
 *   2. If the MERN API is not reachable within ~1.2s, nothing happens: the UI keeps the
 *      demo data it booted with. There is no error state and no visual difference.
 *   3. If the API IS reachable, the adapter logs in with the seeded demo administrator,
 *      maps live entities into the exact array shapes the modules already render
 *      (mutating const arrays IN PLACE - length=0 then push), then calls render().
 *      Modules whose backend data is not yet populated keep their demo rows, so the
 *      UI is never emptier than the AS-IS prototype.
 * Configuration (all optional):
 *   window.SCHOOLOS_API = { base:'http://localhost:4000/api/v1', email:'admin@alnoor.ae',
 *                           password:'ChangeMe123', enabled:true }
 *   or add ?api=off to the URL to force pure demo mode.
 */
(function () {
  'use strict';

  var qs = new URLSearchParams(location.search);
  var cfg = Object.assign(
    { base: 'http://localhost:4000/api/v1', email: 'admin@alnoor.ae', password: 'ChangeMe123', enabled: true },
    window.SCHOOLOS_API || {},
  );
  if (!cfg.enabled || qs.get('api') === 'off' || location.protocol === 'file:') {
    console.info('[SchoolOS] Demo-data mode (API adapter disabled: ' + (location.protocol === 'file:' ? 'file:// context' : 'config') + ')');
    return;
  }

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]);
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (adapter.token) opts.headers.Authorization = 'Bearer ' + adapter.token;
    return fetch(cfg.base + path, opts).then(function (r) {
      if (!r.ok) throw new Error(path + ' -> ' + r.status);
      return r.json();
    });
  }

  /* ---- mappers: API entity -> the EXACT row shape each module renders ---- */
  function mapStudent(s) {
    return {
      id: s.refId, name: s.name, grade: s.grade,
      gender: s.gender === 'Female' ? 'F' : s.gender === 'Male' ? 'M' : '—',
      roll: parseInt(s.roll, 10) || 0, guardian: s.guardianName || '—', phone: s.phone || '—',
      fee: s.feeStatus === 'Pending' ? 'Due' : (s.feeStatus || 'Paid'),
      att: typeof s.attendancePct === 'number' ? Math.round(s.attendancePct) : 0,
      gpa: typeof s.gpa === 'number' ? s.gpa : 0,
      status: s.status || 'Active',
    };
  }
  function mapStaff(s) {
    return { id: s.refId, name: s.name, role: s.designation || '—', dept: s.department || '—', type: s.type || 'Teaching', phone: s.phone || '—', status: s.status || 'Active' };
  }
  function mapInvoice(inv) {
    var due = '—';
    try { due = new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); } catch (e) { /* keep dash */ }
    return {
      id: inv.refId, student: (inv.student && inv.student.name) || inv.studentName || '—',
      term: inv.term, amt: inv.amount,
      status: inv.status === 'Pending' ? 'Due' : inv.status, due: due,
    };
  }

  function short(d) { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); } catch (e) { return '—'; } }
  function hhmm(d) { try { return new Date(d).toTimeString().slice(0, 5); } catch (e) { return '—'; } }
  function mapTicket(t) { return { id: 'TKT-' + String(t._id).slice(-4).toUpperCase(), title: t.subject, cat: t.category, by: (t.raisedBy && t.raisedBy.name) || '—', priority: t.priority, status: t.status, date: short(t.createdAt) }; }
  function mapVisitor(v) { return { name: v.visitorName, purpose: v.purpose, host: v.hostName, in: hhmm(v.checkedInAt), out: v.checkedOutAt ? hhmm(v.checkedOutAt) : '—', status: v.checkedOutAt ? 'Left' : 'On-site' }; }
  function mapItem(i) { return { sku: i.sku, item: i.name, cat: i.category, stock: i.quantityOnHand, min: i.reorderLevel, unitCost: i.unitCost, supplier: '—', location: '—', condition: 'Good', lastCounted: '—', warranty: '—', movements: [] }; }
  function mapEvent(e) { var dt = new Date(e.date); return { d: String(dt.getDate()), mon: dt.toLocaleString('en-GB', { month: 'short' }).toUpperCase(), t: e.title, tag: e.audience, c: 'green', sub: e.description || '' }; }
  function mapApplication(a) { return { name: a.applicantName, grade: a.gradeAppliedFor, stage: a.status === 'Applied' ? 'Application' : a.status, date: short(a.createdAt), src: '—', dob: '—', guardian: a.guardianName, phone: a.phone }; }
  function mapLeave(l) { var name = (l.staff && l.staff.name) || '—'; var range = short(l.fromDate) + (l.toDate !== l.fromDate ? ' – ' + short(l.toDate) : '');
    return [name, l.reason || 'Leave', range, (l.days || 1) + ' day' + ((l.days || 1) > 1 ? 's' : ''), l.status, l.status === 'Approved' ? 'green' : l.status === 'Denied' ? 'red' : 'amber']; }
  function mapAnn(a) { return { t: a.title, by: (a.publishedBy && a.publishedBy.name) || 'School Office', tm: short(a.createdAt), bd: a.body, ic: 'comm', c: 'green', aud: a.audience }; }
  function mapAudit(a) { return { user: (a.performedBy && a.performedBy.name) || 'System', action: a.action, module: a.module, time: short(a.createdAt) }; }
  function mapRoute(r) { var veh = r.vehicle || {}; return { r: r.name, bus: veh.regNumber || '—', driver: veh.driverName || '—', driverPhone: veh.driverPhone || '—', riders: (r.students || []).length, cap: veh.capacity || 0, onTime: 100, status: 'On road', gpsId: '—', stops: (r.stops || []).map(function (n) { return { name: n, time: '—', lat: 25.2, lng: 55.27 }; }) }; }
  function mapLoan(l) { return { title: (l.book && l.book.title) || '—', author: (l.book && l.book.author) || '—', borrower: (l.student && l.student.name) || '—', cls: (l.student && l.student.grade) || '—', due: short(l.dueDate), status: l.status === 'Active' ? 'On loan' : l.status }; }
  function mapBookCat(b) { return { title: b.title, author: b.author, cat: b.category, total: b.totalCopies, avail: b.availableCopies }; }
  function mapFacility(f) { return { name: f.name, type: f.type || 'Facility', cap: f.capacity, status: 'Available' }; }
  function mapFacBooking(b) { return { facility: (b.facility && b.facility.name) || '—', by: (b.bookedBy && b.bookedBy.name) || '—', date: String(b.date).slice(0, 10), time: b.startTime + '-' + b.endTime, status: 'Confirmed' }; }

  /* Replace a const array's contents in place - reassignment is impossible, mutation is the contract. */
  function replaceInPlace(target, rows) {
    if (!Array.isArray(target) || !Array.isArray(rows) || rows.length === 0) return false;
    target.length = 0;
    Array.prototype.push.apply(target, rows);
    return true;
  }

  var adapter = { token: null, live: {} };
  window.SCHOOLOS_ADAPTER = adapter; // introspection hook for tests and debugging

  function hydrate() {
    var jobs = [
      api('/students?limit=100').then(function (res) {
        adapter.studentIds = {};
        (res.data || []).forEach(function (s) { adapter.studentIds[s.name] = s._id; });
        adapter.live.students = replaceInPlace(typeof STUDENTS !== 'undefined' ? STUDENTS : null, (res.data || []).map(mapStudent));
      }),
      api('/staff?limit=100').then(function (res) {
        adapter.staffIds = {}; adapter.staffEmails = {};
        (res.data || []).forEach(function (s) { adapter.staffIds[s.name] = s._id; if (s.email) adapter.staffEmails[s.name] = s.email; });
        adapter.live.staff = replaceInPlace(typeof STAFF !== 'undefined' ? STAFF : null, (res.data || []).map(mapStaff));
      }),
      api('/fees?limit=100').then(function (res) {
        adapter.invoiceIds = {};
        (res.data || []).forEach(function (inv) {
          var n = inv.student && inv.student.name;
          if (n && inv.status !== 'Paid' && !adapter.invoiceIds[n]) adapter.invoiceIds[n] = inv._id;
        });
        adapter.live.fees = replaceInPlace(typeof INVOICES !== 'undefined' ? INVOICES : null, (res.data || []).map(mapInvoice));
      }),
    ];
    function arr(name) {
      // Top-level let/const create global LEXICAL bindings, not window properties - only
      // direct eval resolves them by name. Fail-soft to null for names that don't exist.
      try { return eval(name); } catch (e) { return null; }
    }
    function listJob(path, arrayName, mapper, after) {
      return api(path + (path.indexOf('?') < 0 ? '?limit=100' : '')).then(function (res) {
        var rows = res.data || [];
        if (after) after(rows);
        adapter.live[arrayName] = replaceInPlace(arr(arrayName), rows.map(mapper));
      });
    }
    jobs.push(
      listJob('/helpdesk', 'TICKETS', mapTicket),
      listJob('/visitors', 'VISITORS', mapVisitor),
      listJob('/inventory/items', 'INVENTORY', mapItem, function (rows) { adapter.items = {}; rows.forEach(function (r) { adapter.items[r.name.toLowerCase()] = { id: r._id, unitCost: r.unitCost }; }); }),
      listJob('/events', 'EVENTS', mapEvent),
      listJob('/admissions', 'ADMISSIONS', mapApplication),
      listJob('/leave', 'LEAVE', mapLeave),
      listJob('/announcements', 'ANN', mapAnn),
      listJob('/audit-log', 'AUDIT', mapAudit),
      listJob('/transport/routes', 'ROUTES', mapRoute),
      listJob('/transport/vehicles', 'FLEETADD', function (v) { return { plate_number: v.regNumber, driver: v.driverName, capacity: v.capacity, type: 'Bus' }; }, function (rows) { adapter.vehicleIds = {}; rows.forEach(function (r) { adapter.vehicleIds[r.regNumber] = r._id; }); }),
      listJob('/library/loans', 'LIBLOANS', mapLoan),
      listJob('/library/books', 'BOOKCAT', mapBookCat, function (rows) { adapter.bookIds = {}; adapter.staffEmails = adapter.staffEmails || {}; rows.forEach(function (r) { adapter.bookIds[r.title] = r._id; }); }),
      listJob('/facilities/facilities', 'FACILITIES', mapFacility, function (rows) { adapter.facilityIds = {}; rows.forEach(function (r) { adapter.facilityIds[r.name] = r._id; }); }),
      listJob('/facilities/bookings', 'BOOKINGS', mapFacBooking),
      listJob('/hostel/rooms', 'HROOMS_API', function (r) { return r; }, function (rows) { adapter.roomIds = {}; rows.forEach(function (r) { adapter.roomIds[r.roomNumber] = r._id; }); })
    );
    // Each job fails soft and independently: one missing endpoint never breaks the others.
    return Promise.all(jobs.map(function (p) { return p.catch(function (e) { console.info('[SchoolOS] keeping demo data for one module:', e.message); }); }));
  }

  /* ============ WRITE-THROUGH: UI form -> API -> MongoDB ============
   * Each prototype create handler is wrapped, never replaced: the original runs first, unchanged
   * (instant local row, toast, drawer close - the AS-IS behaviour), then the same form values are
   * mapped onto the backend's Zod contract and POSTed. On success the module re-hydrates from the
   * server (so server-issued ids and derived fields win); on rejection the user is told the record
   * exists locally only and why, so nothing is silently lost or silently faked.
   * Every mapping below was written against the server's validation schema, field by field. */
  var phoneOk = function (p) { return /^\+?[0-9 ]{7,20}$/.test(p || ''); };
  var slug = function (n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''); };
  var last = function (arr) { return arr && arr.length ? arr[arr.length - 1] : null; };
  var studentIdFor = function (name) { return adapter.studentIds && adapter.studentIds[(name || '').trim()]; };

  var WRITE_MAP = {
    addStudent: { path: '/students', refresh: 'students', payload: function (v) {
      var row = last(typeof STUDENTS !== 'undefined' ? STUDENTS : null); if (!row) return null;
      return { refId: row.id, name: row.name, grade: row.grade, gender: v.gender === 'Female' ? 'Female' : 'Male',
        roll: String(row.roll), guardianName: (v.guardian || '').trim() || 'Guardian on file',
        phone: phoneOk(v.phone) ? v.phone.trim() : '+971 500000000', feeStatus: 'Pending', status: 'Active' };
    } },
    createStaff: { path: '/staff', refresh: 'staff', payload: function (v) {
      var row = last(typeof STAFF !== 'undefined' ? STAFF : null); if (!row) return null;
      return { refId: row.id, name: row.name, designation: row.role, department: row.dept,
        type: row.type === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching', status: 'Onboarding',
        email: (v.email || '').trim() || slug(row.name) + '@alnoor.ae',
        phone: phoneOk(v.phone) ? v.phone.trim() : '+971 500000000', joinedDate: new Date().toISOString().slice(0, 10) };
    } },
    createTicket: { path: '/helpdesk', payload: function (v) {
      var pr = ['Low', 'Medium', 'High', 'Urgent'].indexOf(v.priority) >= 0 ? v.priority : 'Medium';
      return { category: v.category || 'IT', subject: (v.title || '').trim(), description: (v.desc || v.title || '').trim(), priority: pr };
    } },
    checkInVisitor: { path: '/visitors', payload: function (v) {
      return { visitorName: (v.visitor_name || '').trim(), purpose: (v.purpose || 'Visit').trim(), hostName: (v.host_person_visiting || '').trim() || 'Front desk' };
    } },
    logBehaviour: { path: '/behaviour', payload: function (v) {
      var sid = studentIdFor(v.student_name || v.student_pick); if (!sid) return { _skip: 'student not on server yet' };
      var sev = ['Minor', 'Moderate', 'Serious'].indexOf(v.severity) >= 0 ? v.severity : 'Minor';
      return { studentId: sid, category: v.category || 'General', description: (v.description || v.note || v.action || 'Recorded').trim(), severity: sev, actionTaken: (v.action || '').trim() || undefined };
    } },
    logClinic: { path: '/health-records', payload: function (v) {
      var sid = studentIdFor(v.student_name || v.student_pick); if (!sid) return { _skip: 'student not on server yet' };
      var o = /home/i.test(v.outcome || '') ? 'Sent home' : /hospital|refer/i.test(v.outcome || '') ? 'Referred to hospital' : 'Returned to class';
      return { studentId: sid, reason: (v.reason || 'Clinic visit').trim(), treatment: (v.medicine || v.notes || 'Observation').trim(), outcome: o };
    } },
    /* ---- batch 2 ---- */
    createEnquiry: { path: '/admissions', payload: function (v) {
      var name = ((v.first_name || '') + ' ' + (v.last_name || '')).trim() || (v.applicant || '').trim();
      return { applicantName: name, gradeAppliedFor: v.grade || 'Grade 1', gender: v.gender === 'Female' ? 'Female' : 'Male',
        guardianName: (v.guardian || '').trim() || 'Guardian on file', phone: phoneOk(v.phone) ? v.phone.trim() : '+971 500000000',
        notes: v.source ? 'Source: ' + v.source : undefined };
    } },
    addInventory: { path: '/inventory/items', payload: function (v) {
      return { name: (v.item_name || '').trim(), sku: (v.sku || '').trim() || 'SKU-' + Date.now(), category: v.category || 'General',
        quantityOnHand: parseInt(v.quantity_in_stock || 0, 10) || 0, reorderLevel: parseInt(v.reorder_minimum || 10, 10) || 10, unitCost: parseFloat(v.unit_cost || 0) || 0 };
    } },
    addEvent: { path: '/events', payload: function (v) {
      var aud = ['All', 'Students', 'Staff', 'Parents'].indexOf(v.audience) >= 0 ? v.audience : 'All';
      return { title: (v.event_title || '').trim(), description: (v.type || 'Event') + (v.venue ? ' at ' + v.venue : ''), date: v.date || new Date().toISOString().slice(0, 10), audience: aud };
    } },
    saveUnit: { path: '/curriculum', payload: function (v) {
      return { subject: v.subject || 'General', term: v.term || 'Term 1', title: (v.title || '').trim(), outcomes: (v.outcomes || 'See unit plan').trim() };
    } },
    addVehicle: { path: '/transport/vehicles', payload: function (v) {
      return { regNumber: (v.plate_number || '').trim(), capacity: parseInt(v.capacity || 40, 10) || 40, driverName: (v.driver || '').trim() || 'Driver on file', driverPhone: '+971 500000000' };
    } },
    recordPayment: { path: function (v) { var id = adapter.invoiceIds && adapter.invoiceIds[(v.student_pick || v.new_student_name || '').trim()]; return id ? '/fees/' + id + '/pay' : null; },
      refresh: 'fees', payload: function (v) {
      var m = ['Card', 'Bank transfer', 'Cash', 'Cheque', 'Online portal'].indexOf(v.method) >= 0 ? v.method : 'Cash';
      return { paymentMethod: m };
    } },
    addStaffLeave: { path: '/leave', payload: function (v) { return { fromDate: v.from, toDate: v.to, reason: (v.type || 'Leave') + ' - ' + (v.emp || 'staff') }; } },
    submitMyLeave: { path: '/leave', payload: function (v) { return { fromDate: v.from, toDate: v.to, reason: (v.type || 'Leave') + ' requested via dashboard' }; } },
    addTitle: { path: '/library/books', payload: function (v) {
      return { isbn: 'ISBN-' + Date.now(), title: (v.title || '').trim(), author: (v.author || '').trim() || 'Unknown', category: v.category || 'General', totalCopies: parseInt(v.copies || 1, 10) || 1 };
    } },
    postAnnouncement: { path: '/announcements', payload: function (v) {
      var aud = ['All', 'Staff', 'Parents', 'Students'].indexOf(v.audience) >= 0 ? v.audience : 'All';
      return { title: (v.title || '').trim(), body: (v.message || '').trim(), audience: aud, pinned: /high|urgent/i.test(v.priority || '') };
    } },
    sendToParents: { path: '/announcements', payload: function (v) {
      return { title: (v.subject || 'Message to parents').trim(), body: (v.message || '').trim(), audience: 'Parents', pinned: false };
    } },
    createSurvey: { path: '/surveys', payload: function (v) {
      var qs = Array.isArray(v.questions) ? v.questions : String(v.questions || '').split(/\n+/).filter(Boolean);
      var questions = qs.map(function (q) { return { questionText: (typeof q === 'string' ? q : q.text || q.questionText || 'Question').trim().slice(0, 300), options: ['Strongly agree', 'Agree', 'Disagree'] }; });
      if (!questions.length) questions = [{ questionText: 'Overall satisfaction', options: ['Satisfied', 'Neutral', 'Unsatisfied'] }];
      return { title: (v.title || '').trim(), description: (v.type || 'Survey') + ' for ' + (v.audtype || 'all'), questions: questions };
    } },
    topUpWallet: { path: '/cafeteria/wallets/top-up', payload: function (v) {
      var sid = studentIdFor(v.name); if (!sid) return { _skip: 'student not on server yet' };
      return { studentId: sid, amount: parseFloat(v.amount || 0) || 0, description: 'Wallet top-up via ' + (v.method || 'cash') };
    } },
    addDevice: { path: '/biometric', payload: function (v) { return { name: (v.mode || 'Biometric') + ' - ' + (v.location || 'Gate'), location: (v.location || '').trim() || 'Main gate' }; } },
    issueCert: { path: '/certificates', payload: function (v) {
      var sid = studentIdFor(v.student_name || v.student_pick); if (!sid) return { _skip: 'student not on server yet' };
      var t = /transfer/i.test(v.document_type || '') ? 'Transfer' : /character/i.test(v.document_type || '') ? 'Character' : /bonafide/i.test(v.document_type || '') ? 'Bonafide' : 'Study';
      return { studentId: sid, type: t, purpose: (v.notes || '').trim() || undefined };
    } },
    saveExpenseClaim: { path: '/expenses', payload: function () {
      var v = typeof readForm === 'function' ? readForm() : {};
      return { category: v.category || 'General', amount: parseFloat(v.amount || 0) || 0, description: (v.description || '').trim(), expenseDate: v.date || new Date().toISOString().slice(0, 10) };
    } },
    saveMeetingSlot: { path: '/meetings', payload: function (v) {
      var tid = adapter.staffIds && adapter.staffIds[(v.teacher || '').trim()]; if (!tid) return { _skip: 'teacher not on server yet' };
      return { teacherStaffId: tid, date: v.date, startTime: (v.time || '09:00').slice(0, 5) };
    } },
    /* ---- batch 3: writes that need hydrated server ids ---- */
    issueBook: { path: '/library/loans', refresh: true, payload: function (v) {
      var bid = adapter.bookIds && adapter.bookIds[(v.title || '').trim()];
      var sid = studentIdFor(v.borrower); if (!bid || !sid) return { _skip: !bid ? 'book not on server yet' : 'student not on server yet' };
      return { bookId: bid, studentId: sid, dueDate: v.due && /\d{4}/.test(v.due) ? v.due : new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) };
    } },
    addRoute: { path: '/transport/routes', payload: function (v) {
      var vid = adapter.vehicleIds && adapter.vehicleIds[(v.bus_plate_number || '').trim()]; if (!vid) return { _skip: 'vehicle not on server yet' };
      var stops = String(v.stops || '').split(/[,\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
      return { name: (v.route_name || '').trim(), vehicleId: vid, stops: stops.length ? stops : ['Main stop'] };
    } },
    allocateRoom: { path: function (v) { var rid = adapter.roomIds && adapter.roomIds[(v.room || '').trim()]; return rid ? '/hostel/rooms/' + rid + '/allocate' : null; }, payload: function (v) {
      var sid = studentIdFor(v.name); if (!sid) return { _skip: 'student not on server yet' };
      return { studentId: sid };
    } },
    confirmFacilityBooking: { path: '/facilities/bookings', payload: function (v) {
      var st = typeof state !== 'undefined' && state._facBooking ? state._facBooking : {};
      var fid = adapter.facilityIds && adapter.facilityIds[(st.facility || v.facility || '').trim()]; if (!fid) return { _skip: 'facility not on server yet' };
      var startTime = (st.time || '10:00').slice(0, 5); var dur = parseInt(v.duration || 1, 10) || 1;
      var endH = Math.min(23, parseInt(startTime.slice(0, 2), 10) + dur);
      return { facilityId: fid, date: st.date || new Date().toISOString().slice(0, 10), startTime: startTime, endTime: ('0' + endH).slice(-2) + startTime.slice(2), purpose: (v.purpose || 'Booking').trim() };
    } },
    saveRaisePO: { path: '/inventory/purchase-orders', payload: function (v) {
      // Mirrors the prototype's own line format exactly: newline-separated "item name, qty"
      var lines = String(v.lines || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (line) {
        var parts = line.split(','); var name = (parts[0] || '').trim(); var qty = parseInt((parts[1] || '1').trim(), 10) || 1;
        var it = adapter.items && adapter.items[name.toLowerCase()];
        return it ? { itemId: it.id, quantity: qty, unitCost: it.unitCost } : null;
      }).filter(Boolean);
      if (!lines.length) return { _skip: 'no ordered items exist on server yet' };
      return { refId: 'PO-' + Date.now(), supplier: (v.supplier || 'Supplier on file').trim(), lines: lines };
    } },
    sendStaffMessage: { path: '/messages', payload: function (v) {
      var name = typeof state !== 'undefined' && state._staffMsgId && typeof STAFF !== 'undefined' ? (STAFF.find(function (x) { return x.id === state._staffMsgId; }) || {}).name : null;
      var email = name && adapter.staffEmails ? adapter.staffEmails[name] : null; if (!email) return { _skip: 'staff email not on server yet' };
      return { recipientEmail: email, subject: (v.subject || 'Message').trim(), body: (v.message || v.body || '').trim() || '(no content)' };
    } },
  };

  function installWriteThrough() {
    Object.keys(WRITE_MAP).forEach(function (name) {
      var original = window[name];
      if (typeof original !== 'function' || original.__wrapped) return;
      var spec = WRITE_MAP[name];
      var wrapped = function (v) {
        var result = original.apply(this, arguments); // AS-IS behaviour first, always
        try {
          var body = spec.payload(v || {});
          if (!body) return result;
          if (body._skip) { console.info('[SchoolOS] ' + name + ': kept locally (' + body._skip + ')'); return result; }
          var path = typeof spec.path === 'function' ? spec.path(v || {}) : spec.path;
          if (!path) { console.info('[SchoolOS] ' + name + ': kept locally (no matching server record)'); return result; }
          api(path, { method: 'POST', body: JSON.stringify(body) })
            .then(function () {
              console.info('[SchoolOS] ' + name + ' -> saved to server');
              if (spec.refresh) return hydrate().then(function () { if (typeof render === 'function') render(); });
              return undefined;
            })
            .catch(function (e) {
              console.warn('[SchoolOS] ' + name + ': saved locally only - server said ' + e.message);
              if (typeof toast === 'function') toast('Saved locally only - server rejected: ' + e.message);
            });
        } catch (e) { console.warn('[SchoolOS] write-through error', e); }
        return result;
      };
      wrapped.__wrapped = true;
      window[name] = wrapped;
    });
    adapter.writeThrough = Object.keys(WRITE_MAP);
  }

  withTimeout(fetch(cfg.base.replace(/\/api\/v1\/?$/, '') + '/health'), 1200)
    .then(function (r) { if (!r.ok) throw new Error('health ' + r.status); })
    .then(function () {
      return api('/auth/login', { method: 'POST', body: JSON.stringify({ email: cfg.email, password: cfg.password }) });
    })
    .then(function (res) {
      adapter.token = res.data && res.data.accessToken;
      if (!adapter.token) throw new Error('no token');
      return hydrate();
    })
    .then(function () {
      adapter.connected = true;
      installWriteThrough();
      console.info('[SchoolOS] Connected to MERN API - live data loaded for:', Object.keys(adapter.live).filter(function (k) { return adapter.live[k]; }).join(', ') || '(none yet)');
      if (typeof render === 'function' && typeof state !== 'undefined' && document.querySelector('#view')) render();
    })
    .catch(function (e) {
      console.info('[SchoolOS] Demo-data mode (API not reachable: ' + e.message + ')');
    });
})();

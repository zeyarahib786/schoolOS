/* ============ SCHOOLOS API CLIENT ============
 * Authenticates users, maps API entities to view models, and coordinates persisted UI actions.
 * Configuration: window.SCHOOLOS_API = { base:'http://localhost:4000/api/v1' }
 */
(function () {
  "use strict";

  var cfg = Object.assign(
    { base: "http://localhost:4000/api/v1" },
    window.SCHOOLOS_API || {},
  );
  var SESSION_KEY = "schoolos.client.session.v1";
  var refreshInFlight = null;

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, rej) {
        setTimeout(function () {
          rej(new Error("timeout"));
        }, ms);
      }),
    ]);
  }

  function errorMessage(payload, fallback) {
    return payload && payload.error && payload.error.message
      ? payload.error.message
      : fallback;
  }

  function saveSession() {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        accessToken: adapter.token,
        refreshToken: adapter.refreshToken,
        user: adapter.user,
      }),
    );
  }

  function clearSession() {
    adapter.token = null;
    adapter.refreshToken = null;
    adapter.user = null;
    adapter.connected = false;
    adapter.live = {};
    adapter.settings = null;
    state.schoolProfile = null;
    localStorage.removeItem(SESSION_KEY);
    if (typeof window.__CLEAR_REACT_SESSION === "function") {
      window.__CLEAR_REACT_SESSION();
    }
  }

  // React-owned module screens use their own Zustand store. Keep it synchronized
  // with the authenticated legacy adapter before either renderer is allowed to
  // render a protected page.
  function syncReactSession() {
    if (
      !adapter.user ||
      !adapter.token ||
      !adapter.refreshToken ||
      typeof window.__SYNC_REACT_SESSION !== "function"
    )
      return;
    window.__SYNC_REACT_SESSION(
      {
        id: adapter.user._id,
        name: adapter.user.name,
        email: adapter.user.email,
        role: adapter.user.role,
      },
      adapter.token,
      adapter.refreshToken,
    );
  }

  function refreshAccessToken() {
    if (!adapter.refreshToken)
      return Promise.reject(
        new Error("Your session has expired. Please sign in again."),
      );
    if (!refreshInFlight) {
      refreshInFlight = fetch(cfg.base + "/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: adapter.refreshToken }),
      })
        .then(function (r) {
          return r
            .json()
            .catch(function () {
              return null;
            })
            .then(function (body) {
              if (!r.ok)
                throw new Error(
                  errorMessage(
                    body,
                    "Your session has expired. Please sign in again.",
                  ),
                );
              adapter.token = body.data.accessToken;
              adapter.refreshToken = body.data.refreshToken;
              saveSession();
              return adapter.token;
            });
        })
        .finally(function () {
          refreshInFlight = null;
        });
    }
    return refreshInFlight;
  }

  function api(path, opts, retried) {
    opts = opts || {};
    opts.headers = Object.assign(
      { "Content-Type": "application/json" },
      opts.headers || {},
    );
    if (adapter.token) opts.headers.Authorization = "Bearer " + adapter.token;
    return fetch(cfg.base + path, opts).then(function (r) {
      if (
        r.status === 401 &&
        !retried &&
        adapter.refreshToken &&
        path !== "/auth/refresh"
      ) {
        return refreshAccessToken().then(function () {
          return api(path, opts, true);
        });
      }
      return r
        .json()
        .catch(function () {
          return null;
        })
        .then(function (body) {
          if (!r.ok)
            throw new Error(errorMessage(body, path + " -> " + r.status));
          return body;
        });
    });
  }

  function apiAll(path) {
    var separator = path.indexOf("?") >= 0 ? "&" : "?";
    function page(number, collected) {
      return api(path + separator + "page=" + number + "&limit=100").then(
        function (res) {
          var rows = res.data || [];
          var pagination = res.meta && res.meta.pagination;
          var all = collected.concat(rows);
          if (pagination && number < pagination.totalPages)
            return page(number + 1, all);
          return { data: all, meta: res.meta };
        },
      );
    }
    return page(1, []);
  }

  function apiBlob(path) {
    var headers = {};
    if (adapter.token) headers.Authorization = "Bearer " + adapter.token;
    return fetch(cfg.base + path, { headers: headers }).then(function (r) {
      if (!r.ok)
        return r
          .json()
          .catch(function () {
            return null;
          })
          .then(function (body) {
            throw new Error(errorMessage(body, "Download failed"));
          });
      return r.blob();
    });
  }

  function studentDocs(s) {
    var labels = {
      id: "Passport / Emirates ID",
      birth: "Birth certificate",
      photo: "Passport-size photo",
    };
    return Object.keys(labels).map(function (key) {
      var d = (s.documents || []).find(function (item) {
        return item.key === key;
      });
      return {
        key: key,
        label: labels[key],
        req: true,
        done: Boolean(d),
        file: d
          ? {
              name: d.filename,
              size: d.size,
              type: d.contentType,
              remote: true,
            }
          : null,
      };
    });
  }

  /* ---- mappers: API entity -> the EXACT row shape each module renders ---- */
  function mapStudent(s) {
    return {
      id: s.refId,
      mongoId: s._id,
      name: s.name,
      grade: s.grade,
      gender: s.gender === "Female" ? "F" : s.gender === "Male" ? "M" : "—",
      roll: parseInt(s.roll, 10) || 0,
      guardian: s.guardianName || "—",
      phone: s.phone || "—",
      dob: s.dateOfBirth ? String(s.dateOfBirth).slice(0, 10) : "",
      nationality: s.nationality || "",
      relationship: s.guardianRelationship || "",
      email: s.guardianEmail || "",
      emergency: s.emergencyContact || "",
      prefLanguage: s.preferredLanguage || "",
      address: s.address || "",
      previousSchool: s.previousSchool || "",
      previousGrade: s.previousGrade || "",
      languages: s.languages || "",
      bloodGroup: s.bloodGroup || "",
      allergies: s.allergies || "",
      medical: s.medicalNotes || "",
      transport: s.transportRequirement || "No",
      docs: studentDocs(s),
      fee: s.feeStatus === "Pending" ? "Due" : s.feeStatus || "Paid",
      att:
        typeof s.attendancePct === "number" ? Math.round(s.attendancePct) : 0,
      gpa: typeof s.gpa === "number" ? s.gpa : 0,
      attendanceRecords: s.attendanceRecords || 0,
      assessmentResults: s.assessmentResults || 0,
      invoiceRecords: s.invoiceRecords || 0,
      status: s.status || "Active",
    };
  }
  function mapStaff(s) {
    var labels = {
      id: "Passport / Emirates ID",
      degree: "Degree certificate",
      photo: "Passport-size photo",
      experience: "Experience / relieving letter",
      visa: "Visa / work permit",
      attestation: "Certificate attestation",
    };
    var stored = s.documents || [];
    var docs = Object.keys(labels).map(function (key) {
      var document = stored.find(function (item) {
        return item.key === key;
      });
      return {
        key: key,
        label: labels[key],
        req: key === "id" || key === "degree" || key === "photo",
        done: Boolean(document),
        file: document
          ? {
              name: document.filename,
              size: document.size,
              type: document.contentType,
              remote: true,
            }
          : null,
      };
    });
    var defaultTasks = [
      ["offer", "Offer letter accepted"],
      ["contract", "Employment contract signed"],
      ["documents", "Documents verified (passport, certificates)"],
      ["visa", "Visa / labour card processed"],
      ["account", "IT account & email setup"],
      ["induction", "Induction & orientation"],
    ].map(function (item) {
      return { key: item[0], label: item[1], done: false };
    });
    return {
      id: s.refId,
      mongoId: s._id,
      name: s.name,
      email: s.email || "",
      role: s.designation || "—",
      dept: s.department || "—",
      type: s.type || "Teaching",
      phone: s.phone || "—",
      status: s.status || "Active",
      joined: short(s.joinedDate),
      docs: docs,
      onboarding:
        s.onboarding && s.onboarding.length ? s.onboarding : defaultTasks,
      leaveBalance: s.annualLeaveRemaining,
    };
  }
  function mapInvoice(inv) {
    var due = "—";
    try {
      due = new Date(inv.dueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
    } catch (e) {
      /* keep dash */
    }
    return {
      id: inv.refId,
      student: (inv.student && inv.student.name) || inv.studentName || "—",
      studentId: (inv.student && inv.student._id) || inv.studentId || null,
      studentRef: (inv.student && inv.student.refId) || null,
      term: inv.term,
      amt: inv.amount,
      paid: inv.paidAmount || 0,
      balance:
        inv.balanceDue != null
          ? inv.balanceDue
          : Math.max(0, inv.amount - (inv.paidAmount || 0)),
      mongoId: inv._id,
      status: inv.status === "Pending" ? "Due" : inv.status,
      due: due,
    };
  }
  function mapFeePayment(p) {
    var invoice = p.invoice || {},
      student = p.student || {};
    return {
      id: p._id,
      receipt: "RCP-" + String(p._id).slice(-5).toUpperCase(),
      invoiceId: invoice._id || p.invoice,
      invoiceRef: invoice.refId || "—",
      student: student.name || "Unknown student",
      studentId: student._id || p.student,
      method: p.paymentMethod,
      amount: p.amount,
      paidAt: p.paidAt || p.createdAt,
      date: short(p.paidAt || p.createdAt),
      reference: p.reference || "",
    };
  }
  function mapCertificate(c) {
    var student = c.student || {};
    var issuer = c.issuedBy || {};
    var labels = {
      Bonafide: "Bonafide Letter",
      Transfer: "Transfer Certificate",
      Character: "Character Certificate",
      Study: "Study Certificate",
      ReportCard: "Report Card",
      Provisional: "Provisional Certificate",
    };
    return {
      studentId: student._id || c.student,
      name: student.name || "Unknown student",
      cls: student.grade || "—",
      type: labels[c.type] || c.type,
      kind: c.type,
      purpose: c.purpose || "",
      issuedBy: issuer.name || "",
      mongoId: c._id,
      ref: c.certNumber || c._id,
      date: short(c.issuedDate || c.createdAt),
      issuedAt: c.issuedDate || c.createdAt,
      status: c.status || "Issued",
    };
  }
  function mapAttendance(a) {
    var student = a.student || {};
    return {
      id: a._id,
      studentId: student._id || a.student,
      refId: student.refId || "",
      student: student.name || "Unknown student",
      grade: student.grade || "—",
      date: String(a.date || "").slice(0, 10),
      session: a.session,
      status: a.status,
      notes: a.notes || "",
    };
  }
  function mapStaffAttendance(a) {
    return {
      name: a.name || "Staff member",
      status: a.status,
      time: hhmm(a.markedAt || a.updatedAt || a.createdAt),
      role: a.role,
    };
  }
  function mapAbsenceRequest(r) {
    var student = r.student || {};
    var from = String(r.fromDate || "").slice(0, 10);
    var to = String(r.toDate || "").slice(0, 10);
    return {
      requestId: r._id,
      studentId: student.refId || String(student._id || r.student || ""),
      studentMongoId: student._id || r.student || null,
      studentName: student.name || "Unknown student",
      grade: student.grade || "—",
      by:
        (r.requestedBy && (r.requestedBy.name || r.requestedBy.role)) ||
        "Portal user",
      from: from,
      to: to,
      days: r.days || 1,
      type: r.type || "Other",
      note: r.note || "",
      status: r.status || "Pending",
    };
  }

  function short(d) {
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
    } catch (e) {
      return "—";
    }
  }
  function hhmm(d) {
    try {
      return new Date(d).toTimeString().slice(0, 5);
    } catch (e) {
      return "—";
    }
  }
  function mapTicket(t) {
    return {
      id: "TKT-" + String(t._id).slice(-4).toUpperCase(),
      mongoId: t._id,
      title: t.subject,
      cat: t.category,
      by: (t.raisedBy && t.raisedBy.name) || "—",
      priority: t.priority,
      status: t.status === "Assigned" ? "In progress" : t.status,
      date: short(t.createdAt),
      assignee: (t.assignedTo && t.assignedTo.name) || undefined,
      assignedToId: (t.assignedTo && t.assignedTo._id) || undefined,
    };
  }
  function mapVisitor(v) {
    return {
      id: v._id,
      name: v.visitorName,
      purpose: v.purpose,
      host: v.hostName,
      in: hhmm(v.checkedInAt),
      out: v.checkedOutAt ? hhmm(v.checkedOutAt) : "—",
      status: v.checkedOutAt ? "Checked out" : "On-site",
    };
  }
  function mapItem(i) {
    return {
      mongoId: i._id,
      sku: i.sku,
      item: i.name,
      cat: i.category,
      stock: i.quantityOnHand,
      min: i.reorderLevel,
      unitCost: i.unitCost,
      supplier: i.supplier || "—",
      location: i.location || "—",
      condition: i.condition || "Good",
      lastCounted: i.lastCounted ? short(i.lastCounted) : "—",
      warranty: "—",
      movements: (i.movements || [])
        .slice()
        .reverse()
        .map(function (m) {
          return {
            date: short(m.date),
            type: m.type,
            qty: m.quantityDelta,
            note: m.note || "",
          };
        }),
    };
  }
  function mapEvent(e) {
    var dt = new Date(e.date);
    return {
      d: String(dt.getDate()),
      mon: dt.toLocaleString("en-GB", { month: "short" }).toUpperCase(),
      t: e.title,
      tag: e.audience,
      c: "green",
      sub: e.description || "",
    };
  }
  function mapApplication(a) {
    var stages = {
      Applied: "Application",
      Shortlisted: "Assessment",
      Interviewed: "Interview",
      Accepted: "Offer",
      Enrolled: "Enrolled",
      Rejected: "Closed",
      Waitlisted: "Waitlisted",
    };
    var required = { id: true, birth: true, photo: true },
      labels = {
        id: "Passport / Emirates ID",
        birth: "Birth certificate",
        photo: "Passport-size photo",
        report: "Previous school report",
        immun: "Immunisation record",
        tc: "Transfer certificate",
      };
    var saved = {};
    (a.documents || []).forEach(function (d) {
      saved[d.key] = d;
    });
    var docs = Object.keys(labels).map(function (key) {
      var d = saved[key];
      return {
        key: key,
        label: labels[key],
        req: !!required[key],
        done: !!(d && (d.fileId || d.verifiedAt)),
        file:
          d && d.fileId
            ? { name: d.filename, size: d.size, type: d.contentType }
            : null,
      };
    });
    var previousStages = {
      Applied: "Application",
      Shortlisted: "Assessment",
      Interviewed: "Interview",
      Accepted: "Offer",
    };
    return {
      name: a.applicantName,
      mongoId: a._id,
      grade: a.gradeAppliedFor,
      stage: stages[a.status] || a.status,
      previousStage: previousStages[a.previousStatus] || "Application",
      prevStage: previousStages[a.previousStatus] || "Application",
      date: short(a.createdAt),
      src: a.source || "—",
      dob: a.dateOfBirth ? String(a.dateOfBirth).slice(0, 10) : "—",
      guardian: a.guardianName,
      phone: a.phone,
      email: a.guardianEmail || "",
      relationship: a.guardianRelationship || "",
      previousSchool: a.previousSchool || "",
      docs: docs,
      outcome:
        a.decisionOutcome || (a.status === "Rejected" ? "Rejected" : null),
      declineReason: a.decisionReason || "",
      hist: (a.history || [])
        .slice()
        .reverse()
        .map(function (h) {
          return [
            (h.outcome || h.to) + (h.reason ? " — " + h.reason : ""),
            short(h.at),
          ];
        }),
    };
  }
  function mapLeave(l) {
    var name = (l.staff && l.staff.name) || "—";
    var range =
      short(l.fromDate) +
      (l.toDate !== l.fromDate ? " – " + short(l.toDate) : "");
    return [
      name,
      l.reason || "Leave",
      range,
      (l.days || 1) + " day" + ((l.days || 1) > 1 ? "s" : ""),
      l.status === "Denied" ? "Rejected" : l.status,
      l.status === "Approved"
        ? "green"
        : l.status === "Denied"
          ? "red"
          : "amber",
      l._id,
      (l.staff && l.staff._id) || l.staff || null,
    ];
  }
  function mapAnn(a) {
    return {
      mongoId: a._id,
      t: a.title,
      by: (a.publishedBy && a.publishedBy.name) || "School Office",
      tm: short(a.createdAt),
      bd: a.body,
      ic: "comm",
      c: "green",
      aud: a.audience,
      status: a.status || "Published",
      priority: a.pinned ? "Urgent - pin to top" : "Normal",
    };
  }
  function mapAudit(a) {
    var zone = (adapter.settings && adapter.settings.timezone) || "UTC";
    var time = "—";
    try {
      time = new Date(a.createdAt).toLocaleString("en-GB", {
        timeZone: zone,
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      /* keep dash */
    }
    return {
      id: a._id,
      user: (a.performedBy && a.performedBy.name) || "Unknown user",
      action: a.action,
      module: a.module,
      severity: a.severity,
      createdAt: a.createdAt,
      time: time,
    };
  }
  function loadAudit() {
    if (
      !adapter.user ||
      ["Administrator", "Principal"].indexOf(adapter.user.role) < 0
    )
      return Promise.resolve();
    return apiAll("/audit-log").then(function (res) {
      var rows = (res.data || []).map(mapAudit);
      var total =
        res.meta && res.meta.pagination
          ? res.meta.pagination.total
          : rows.length;
      if (
        new Set(
          rows.map(function (row) {
            return row.id;
          }),
        ).size !== total
      ) {
        throw new Error(
          "Audit log changed during loading; refresh to get a consistent export",
        );
      }
      adapter.auditTotal = total;
      adapter.live.audit = replaceInPlace(
        typeof AUDIT !== "undefined" ? AUDIT : null,
        rows,
      );
    });
  }
  function mapRoute(r) {
    var veh = r.vehicle || {};
    var assigned = r.assignedStudents || [];
    return {
      id: r._id,
      mongoId: r._id,
      r: r.name,
      bus: veh.regNumber || "—",
      vehicleId: veh._id,
      driver: veh.driverName || "—",
      driverPhone: veh.driverPhone || "—",
      riders: assigned.length,
      studentRefs: assigned.map(function (s) {
        return { id: s.refId, name: s.name };
      }),
      cap: veh.capacity || 0,
      onTime: typeof r.onTimePct === "number" ? r.onTimePct : 100,
      status: r.status || "Depot",
      gpsId: r.gpsId || "—",
      stops: (r.stops || []).map(function (stop) {
        return typeof stop === "string"
          ? { name: stop, time: "—", lat: 25.2, lng: 55.27 }
          : {
              name: stop.name,
              address: stop.address || "-",
              pincode: stop.pincode || "-",
              time: stop.time || "—",
              lat: typeof stop.lat === "number" ? stop.lat : 25.2,
              lng: typeof stop.lng === "number" ? stop.lng : 55.27,
            };
      }),
    };
  }
  function mapTransportIncident(i) {
    var route = i.route || {};
    return {
      mongoId: i._id,
      route: route.name || "—",
      type: i.type,
      severity: i.severity,
      location: i.location || "-",
      desc: i.description,
      time: short(i.createdAt),
      status: i.status,
    };
  }
  function mapLoan(l) {
    return {
      id: l._id,
      studentId: (l.student && l.student._id) || l.student,
      title: (l.book && l.book.title) || "—",
      author: (l.book && l.book.author) || "—",
      borrower: (l.student && l.student.name) || "—",
      cls: (l.student && l.student.grade) || "—",
      due: short(l.dueDate),
      status: l.status === "Active" ? "On loan" : l.status,
    };
  }
  function mapBookCat(b) {
    return {
      title: b.title,
      author: b.author,
      cat: b.category,
      total: b.totalCopies,
      avail: b.availableCopies,
    };
  }
  function mapBookRequest(r) {
    var book = r.book || {};
    var student = r.student || {};
    var requester = r.requestedBy || {};
    return {
      id: r._id,
      title: book.title || "—",
      by: student.name || requester.name || "—",
      role: requester.role || "—",
      date: short(r.createdAt),
      status: r.status,
      note: r.note || "",
    };
  }
  function mapFacility(f) {
    return {
      name: f.name,
      type: f.type || "Facility",
      cap: f.capacity,
      status: "Available",
    };
  }
  function mapFacBooking(b) {
    return {
      facility: (b.facility && b.facility.name) || "—",
      by: (b.bookedBy && b.bookedBy.name) || "—",
      date: String(b.date).slice(0, 10),
      time: b.startTime + "-" + b.endTime,
      status: "Confirmed",
    };
  }
  function mapBiometricDevice(d) {
    var type = String(d.name || "Biometric").split(" - ")[0];
    return {
      id: d._id,
      loc: d.location,
      type: type,
      punches: 0,
      sync: d.lastSyncAt ? hhmm(d.lastSyncAt) : "Never",
      status: d.status,
    };
  }
  function mapSurvey(s, totalRespondents) {
    var audience =
      String(s.description || "")
        .split(" for ")
        .pop() || "All";
    return {
      id: s._id,
      title: s.title,
      audience: audience,
      questions: (s.questions || []).map(function (q) {
        return q.questionText;
      }),
      type: String(s.description || "Survey").split(" for ")[0],
      responses: totalRespondents || 0,
      sent: totalRespondents || 0,
      status: s.status === "Active" ? "Live" : s.status,
      c:
        s.status === "Active"
          ? "green"
          : s.status === "Closed" || s.status === "Scheduled"
            ? "blue"
            : "gray",
      schedDate: s.scheduledAt ? String(s.scheduledAt).slice(0, 10) : null,
      distribution: "Online link - shared via portal",
      surveyId: s._id,
      responseLink: window.location.origin + "/survey/" + s._id,
    };
  }
  function hostelFloor(roomNumber) {
    var match = String(roomNumber || "").match(/(\d)/);
    return match ? parseInt(match[1], 10) : 1;
  }
  function mapHostelRoom(r) {
    var occupants = r.occupants || [];
    return {
      no: r.roomNumber,
      block: r.block,
      floor: hostelFloor(r.roomNumber),
      type: r.capacity + "-bed",
      cap: r.capacity,
      occ: occupants.map(function (s) {
        return s.name || "Unknown student";
      }),
      status: occupants.length >= r.capacity ? "Full" : "Available",
    };
  }
  function mapHostelLeave(l) {
    var student = l.student || {},
      room = l.room || {},
      approver = l.approvedBy || {};
    return {
      id: l._id,
      name: student.name || "Unknown student",
      room: room.roomNumber || "—",
      type: l.type,
      from: short(l.fromDate),
      to: short(l.toDate),
      reason: l.reason,
      status: l.status,
      by: approver.name || "—",
    };
  }
  function mapHostelMaintenance(m) {
    var room = m.room || {},
      reporter = m.reportedBy || {};
    return {
      id: m.refId,
      room: room.roomNumber || "—",
      issue: m.issue,
      cat: m.category,
      prio: m.priority,
      by: reporter.name || "Warden",
      status: m.status,
      date: short(m.createdAt),
    };
  }
  function mapBehaviour(b) {
    var student = b.student || {},
      reporter = b.reportedBy || {};
    var type = b.type || "Incident";
    var points =
      typeof b.points === "number" ? b.points : type === "Merit" ? 5 : -2;
    return {
      mongoId: b._id,
      name: student.name || "Unknown student",
      cls: String(student.grade || "—")
        .replace("Grade ", "")
        .replace(" · ", "-"),
      type: type,
      note: b.description,
      pts: (points > 0 ? "+" : "") + points,
      date: short(b.createdAt),
      c: type === "Merit" ? "green" : type === "Detention" ? "amber" : "red",
      severity: b.severity,
      location: b.location || null,
      witness: b.witness || null,
      reporter: reporter.name || "School staff",
      status: b.status || "Logged",
      owner: b.status === "Escalated" ? "Safeguarding lead" : "Pastoral team",
    };
  }
  function mapClinicVisit(v) {
    var student = v.student || {},
      recorder = v.recordedBy || {};
    return {
      mongoId: v._id,
      name: student.name || "Unknown student",
      cls: String(student.grade || "—")
        .replace("Grade ", "")
        .replace(" · ", "-"),
      reason: v.reason,
      action: v.treatment,
      time: hhmm(v.createdAt),
      status: v.outcome === "Under observation" ? "Open" : "Resolved",
      outcome: v.outcome,
      severity: v.severity || "Routine",
      vitals: v.vitals || null,
      medicine: v.medicine || null,
      parentContacted: Boolean(v.parentContacted),
      contactTime: v.parentContactedAt ? hhmm(v.parentContactedAt) : null,
      staff: recorder.name || "Clinic staff",
      consent: true,
    };
  }
  function mapWallet(w) {
    var student = w.student || {};
    var previous =
      typeof WALLETS !== "undefined" &&
      WALLETS.find(function (item) {
        return item.name === student.name;
      });
    return {
      mongoId: w._id,
      name: student.name || "Unknown student",
      id: student.refId || String(student._id),
      grade: student.grade || "—",
      plan: previous ? previous.plan : "Standard · Lunch only",
      bal: w.balance,
      last: short(w.updatedAt),
    };
  }
  function mapCafeTransaction(t) {
    var wallet = t.wallet || {},
      student = wallet.student || {};
    return {
      mongoId: t._id,
      name: student.name || "Unknown student",
      item: t.description,
      amt: t.type === "Purchase" ? -t.amount : t.amount,
      type: t.type === "TopUp" ? "Top-up" : "Purchase",
      time: hhmm(t.createdAt),
      method: t.type === "Purchase" ? "Wallet" : "Account",
    };
  }
  function mapAllergyPlan(a) {
    var student = a.student || {};
    return {
      mongoId: a._id,
      name: student.name || "Unknown student",
      grade: student.grade || "—",
      allergens: a.allergens,
      sev: a.severity,
      plan: a.carePlan,
    };
  }
  function mapMenu(menu) {
    var previous =
      typeof MENU !== "undefined" &&
      MENU.find(function (row) {
        return row.day === menu.day;
      });
    function dish(value, fallback) {
      value = value || fallback || {};
      return {
        item: value.item || "Not scheduled",
        cal: value.calories != null ? value.calories : value.cal || 0,
        veg: value.vegetarian != null ? value.vegetarian : value.veg !== false,
        alg: value.allergens || value.alg || [],
      };
    }
    return {
      day: menu.day,
      b: dish(menu.breakfast, previous && previous.b),
      l: dish(menu.lunch, previous && previous.l),
      s: dish(menu.snack, previous && previous.s),
    };
  }
  function mapCurriculumUnit(unit) {
    return {
      mongoId: unit._id,
      subject: unit.subject,
      title: unit.title,
      term: unit.term,
      plannedDate: unit.plannedDate ? short(unit.plannedDate) : "TBC",
      completedDate: unit.completedDate ? short(unit.completedDate) : null,
      outcomes: String(unit.outcomes || "")
        .split(/\r?\n/)
        .filter(Boolean),
      framework: unit.framework || "School-defined",
      owner: unit.owner || "Subject coordinator",
      sequenceOrder: unit.sequenceOrder || 0,
    };
  }
  function mapClassSection(row) {
    return {
      mongoId: row._id,
      cls: row.className,
      rep:
        row.representativeStudentId && row.representativeStudentId.name
          ? row.representativeStudentId.name
          : "-",
      teacher:
        row.teacherStaffId && row.teacherStaffId.name
          ? row.teacherStaffId.name
          : "Unassigned",
      filled: row.filled || 0,
      cap: row.capacity,
      stream: row.stream,
    };
  }

  /* Replace a const array's contents in place - reassignment is impossible, mutation is the contract. */
  function replaceInPlace(target, rows) {
    if (!Array.isArray(target) || !Array.isArray(rows)) return false;
    target.length = 0;
    Array.prototype.push.apply(target, rows);
    return true;
  }

  var adapter = {
    token: null,
    refreshToken: null,
    user: null,
    connected: false,
    live: {},
    api: api,
    hydrate: hydrate,
  };
  window.SCHOOLOS_ADAPTER = adapter; // introspection hook for tests and debugging

  var baseEnterApp = window.enterApp;
  var baseLockApp = window.lockApp;
  var baseHostelActivity = window.hostelActivity;

  function setLoginBusy(busy, message) {
    var button = document.getElementById("lxEnter");
    var note = document.getElementById("lxNote");
    if (button) {
      button.disabled = busy;
      button.setAttribute("aria-busy", busy ? "true" : "false");
    }
    if (note && message) {
      note.textContent = message;
      note.setAttribute("role", "alert");
    }
  }

  function enterAuthenticatedApp() {
    if (!adapter.user || typeof baseEnterApp !== "function") return;
    syncReactSession();
    baseEnterApp(adapter.user.role);
    installLmsWorkflow();
    var name = document.querySelector(".sb-user .ut .n");
    var avatar = document.querySelector(".sb-user .ua");
    if (name) name.textContent = adapter.user.name;
    if (avatar)
      avatar.textContent = adapter.user.name
        .split(/\s+/)
        .map(function (x) {
          return x[0];
        })
        .join("")
        .slice(0, 2)
        .toUpperCase();
  }

  window.schoolOsGuestInfo = function () {
    setLoginBusy(
      false,
      "Guest mode is disabled for this live workspace. Sign in with an authorised account.",
    );
  };

  window.enterApp = function () {
    var email = (document.getElementById("lxEmail") || {}).value || "";
    var password = (document.getElementById("lxPass") || {}).value || "";
    if (!email.trim() || !password) {
      setLoginBusy(false, "Enter your email and password.");
      return;
    }
    setLoginBusy(true, "Signing in…");
    api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password: password }),
    })
      .then(function (res) {
        adapter.token = res.data.accessToken;
        adapter.refreshToken = res.data.refreshToken;
        adapter.user = res.data.user;
        saveSession();
        return hydrate();
      })
      .then(function () {
        installSettingsWorkflow();
        installAuditWorkflow();
        adapter.connected = true;
        installWriteThrough();
        installCertificateWorkflow();
        installAnnouncementWorkflow();
        installStudentDocuments();
        installAdmissionWorkflow();
        installStaffAndLeaveWorkflows();
        installAttendanceWorkflow();
        installFeesWorkflow();
        installExamWorkflow();
        installPayrollWorkflow();
        installTransportWorkflow();
        installInventoryWorkflow();
        installLibraryWorkflow();
        installVisitorWorkflow();
        installBiometricWorkflow();
        installHelpdeskWorkflow();
        installSurveyWorkflow();
        installHostelLeaveWorkflow();
        installHostelRollCallWorkflow();
        installHostelMaintenanceWorkflow();
        installHostelOverviewWorkflow();
        installBehaviourWorkflow();
        installHealthWorkflow();
        installCafeteriaWorkflow();
        installTimetableWorkflow();
        installCurriculumWorkflow();
        enterAuthenticatedApp();
        setLoginBusy(false, "");
      })
      .catch(function (e) {
        clearSession();
        setLoginBusy(false, e.message || "Unable to sign in.");
      });
  };

  window.lockApp = function () {
    var logout = adapter.token
      ? api("/auth/logout", { method: "POST" }).catch(function () {})
      : Promise.resolve();
    logout.finally(function () {
      clearSession();
      if (typeof baseLockApp === "function") baseLockApp();
    });
  };

  // A real account's role is authoritative; the old presentation-only role cycler must not elevate permissions.
  window.cycleRole = function () {
    if (typeof toast === "function")
      toast("Your role is managed by your administrator");
  };

  function hydrate() {
    adapter.live.settings = false;
    adapter.settings = null;
    state.schoolProfile = null;
    adapter.live.audit = false;
    replaceInPlace(typeof AUDIT !== "undefined" ? AUDIT : null, []);
    CFG.currency = "AED";
    CFG.previewCurrency = "AED";
    OPTIONAL.forEach(function (module) {
      state.modules[module.id] =
        ["hostel", "visitors", "cafeteria"].indexOf(module.id) < 0;
    });
    var studentJob = apiAll("/students").then(function (res) {
      adapter.studentIds = {};
      adapter.studentIdsByRef = {};
      (res.data || []).forEach(function (s) {
        // Name lookup is retained for existing cross-module forms; refId remains authoritative
        // when duplicate names exist in a real school roster.
        if (!adapter.studentIds[s.name]) adapter.studentIds[s.name] = s._id;
        adapter.studentIdsByRef[s.refId] = s._id;
      });
      adapter.live.students = replaceInPlace(
        typeof STUDENTS !== "undefined" ? STUDENTS : null,
        (res.data || []).map(mapStudent),
      );
    });
    var jobs = [
      api("/settings").then(function (res) {
        adapter.settings = res.data;
        adapter.live.settings = true;
        CFG.currency = res.data.currency || "AED";
        CFG.previewCurrency = CFG.currency;
        var disabled = Array.isArray(res.data.disabledModules)
          ? res.data.disabledModules
          : ["hostel", "visitors", "cafeteria"];
        OPTIONAL.forEach(function (module) {
          state.modules[module.id] = disabled.indexOf(module.id) < 0;
        });
        state.schoolProfile = {
          legalName: res.data.schoolName || "",
          license: res.data.license || "",
          principal: res.data.principal || "",
          address: res.data.address || "",
          academicYear: res.data.academicYear || "",
          timezone: res.data.timezone || "",
          currency: res.data.currency || "AED",
          defaultAnnualLeave: res.data.defaultAnnualLeave,
        };
      }),
      apiAll("/staff").then(function (res) {
        adapter.staffIds = {};
        adapter.staffEmails = {};
        (res.data || []).forEach(function (s) {
          adapter.staffIds[s.name] = s._id;
          if (s.email) adapter.staffEmails[s.name] = s.email;
        });
        adapter.live.staff = replaceInPlace(
          typeof STAFF !== "undefined" ? STAFF : null,
          (res.data || []).map(mapStaff),
        );
      }),
      apiAll("/fees").then(function (res) {
        adapter.invoiceIds = {};
        adapter.invoiceIdsByRef = {};
        (res.data || []).forEach(function (inv) {
          var n = inv.student && inv.student.name;
          if (n && inv.status !== "Paid" && !adapter.invoiceIds[n])
            adapter.invoiceIds[n] = inv._id;
          var ref = inv.student && inv.student.refId;
          if (ref && inv.status !== "Paid" && !adapter.invoiceIdsByRef[ref])
            adapter.invoiceIdsByRef[ref] = inv._id;
        });
        adapter.live.fees = replaceInPlace(
          typeof INVOICES !== "undefined" ? INVOICES : null,
          (res.data || []).map(mapInvoice),
        );
      }),
      apiAll("/fees/payments").then(function (res) {
        adapter.feePayments = (res.data || []).map(mapFeePayment);
        adapter.live.feePayments = true;
      }),
      apiAll("/certificates").then(function (res) {
        adapter.live.certificates = replaceInPlace(
          typeof CERTS !== "undefined" ? CERTS : null,
          (res.data || []).map(mapCertificate),
        );
      }),
      apiAll("/attendance").then(function (res) {
        var rows = (res.data || []).map(mapAttendance);
        adapter.attendance = rows;
        adapter.attendanceByKey = {};
        rows.forEach(function (row) {
          if (row.studentId && row.date && row.session)
            adapter.attendanceByKey[
              row.studentId + "|" + row.date + "|" + row.session
            ] = row;
        });
        adapter.live.attendance = true;
      }),
      api("/attendance/staff").then(function (res) {
        var store = null;
        try {
          store = eval("STAFF_ATTENDANCE");
        } catch (e) {
          store = null;
        }
        if (store) {
          Object.keys(store).forEach(function (key) {
            delete store[key];
          });
          (res.data || []).map(mapStaffAttendance).forEach(function (row) {
            store[row.name] = { status: row.status, time: row.time };
          });
          adapter.live.staffAttendance = true;
        }
      }),
      apiAll("/attendance/absence-requests").then(function (res) {
        var rows = (res.data || []).map(mapAbsenceRequest);
        adapter.absenceRequestIds = {};
        rows.forEach(function (row) {
          adapter.absenceRequestIds[row.requestId] = row.requestId;
        });
        try {
          var requests = eval("ABSENCE_REQUESTS");
          requests.length = 0;
          Array.prototype.push.apply(requests, rows);
          var excused = eval("EXCUSED_DATES");
          Object.keys(excused).forEach(function (key) {
            delete excused[key];
          });
          rows
            .filter(function (row) {
              return row.status === "Approved";
            })
            .forEach(function (row) {
              excused[row.studentId] = excused[row.studentId] || [];
              var d = new Date(row.from + "T00:00:00");
              var end = new Date(row.to + "T00:00:00");
              while (d <= end) {
                excused[row.studentId].push(d.toISOString().slice(0, 10));
                d.setDate(d.getDate() + 1);
              }
            });
          adapter.live.absenceRequests = true;
        } catch (e) {
          /* absence widgets not loaded on this shell */
        }
      }),
    ];
    function arr(name) {
      // Top-level let/const create global LEXICAL bindings, not window properties - only
      // direct eval resolves them by name. Fail-soft to null for names that don't exist.
      try {
        return eval(name);
      } catch (e) {
        return null;
      }
    }
    function listJob(path, arrayName, mapper, after) {
      var request =
        [
          "/inventory/items",
          "/admissions",
          "/announcements",
          "/library/loans",
          "/payroll",
          "/leave",
        ].indexOf(path) >= 0
          ? apiAll(path)
          : api(path + (path.indexOf("?") < 0 ? "?limit=100" : ""));
      return request.then(function (res) {
        var rows = res.data || [];
        if (after) after(rows);
        adapter.live[arrayName] = replaceInPlace(
          arr(arrayName),
          rows.map(mapper),
        );
      });
    }
    jobs.push(
      listJob("/helpdesk", "TICKETS", mapTicket),
      listJob("/behaviour", "BEHAVIOUR", mapBehaviour),
      api("/health-records?limit=100").then(function (res) {
        var rows = (res.data || []).map(mapClinicVisit);
        if (typeof CLINIC !== "undefined") {
          CLINIC.length = 0;
          Array.prototype.push.apply(CLINIC, rows);
          adapter.live.health = true;
        }
      }),
      api("/cafeteria/wallets?limit=100").then(function (res) {
        var rows = (res.data || []).map(mapWallet);
        if (typeof WALLETS !== "undefined") {
          WALLETS.length = 0;
          Array.prototype.push.apply(WALLETS, rows);
          adapter.live.cafeteriaWallets = true;
        }
      }),
      api("/cafeteria/transactions?limit=100").then(function (res) {
        var rows = (res.data || []).map(mapCafeTransaction);
        if (typeof CAFETXN !== "undefined") {
          CAFETXN.length = 0;
          Array.prototype.push.apply(CAFETXN, rows);
          adapter.live.cafeteriaTransactions = true;
        }
      }),
      api("/cafeteria/allergy-plans?limit=100").then(function (res) {
        var rows = (res.data || []).map(mapAllergyPlan);
        if (typeof CAFEALG !== "undefined") {
          CAFEALG.length = 0;
          Array.prototype.push.apply(CAFEALG, rows);
          adapter.live.cafeteriaAllergies = true;
        }
      }),
      listJob("/cafeteria/menu", "MENU", mapMenu),
      listJob("/visitors", "VISITORS", mapVisitor),
      listJob("/inventory/items", "INVENTORY", mapItem, function (rows) {
        adapter.items = {};
        rows.forEach(function (r) {
          adapter.items[r.name.toLowerCase()] = {
            id: r._id,
            unitCost: r.unitCost,
          };
        });
      }),
      listJob(
        "/inventory/purchase-orders",
        "PURCHASE_ORDERS",
        function (po) {
          return {
            id: po.refId,
            supplier: po.supplier,
            items: (po.lines || []).map(function (line) {
              var item = line.item || {};
              return {
                item: item.name || "Unknown item",
                qty: line.quantity,
                unitCost: line.unitCost,
              };
            }),
            expected: po.expectedDelivery ? short(po.expectedDelivery) : "TBC",
            status: po.status,
            date: short(po.createdAt),
            notes: po.notes || "",
          };
        },
        function (rows) {
          adapter.purchaseOrderIds = {};
          rows.forEach(function (po) {
            adapter.purchaseOrderIds[po.refId] = po._id;
          });
        },
      ),
      listJob("/events", "EVENTS", mapEvent),
      apiAll("/curriculum").then(function (res) {
        var rows = (res.data || []).map(mapCurriculumUnit);
        adapter.curriculumUnits = rows;
        replaceInPlace(arr("CURRIC_UNITS"), rows);
        var summaries = arr("CURRIC");
        if (summaries) {
          var defaults = summaries.slice();
          var grouped = {};
          rows.forEach(function (unit) {
            grouped[unit.subject] = grouped[unit.subject] || {
              units: 0,
              done: 0,
            };
            grouped[unit.subject].units += 1;
            if (unit.completedDate) grouped[unit.subject].done += 1;
          });
          var subjects = defaults.map(function (item) {
            return item.sub;
          });
          Object.keys(grouped).forEach(function (subject) {
            if (subjects.indexOf(subject) < 0) subjects.push(subject);
          });
          replaceInPlace(
            summaries,
            subjects.map(function (subject, index) {
              var old =
                defaults.find(function (item) {
                  return item.sub === subject;
                }) || {};
              var counts = grouped[subject] || { units: 0, done: 0 };
              return {
                sub: subject,
                grades: old.grades || "School-wide",
                units: counts.units,
                done: counts.done,
                c: old.c || (index % 2 ? "green" : "blue"),
              };
            }),
          );
        }
        adapter.live.curriculum = true;
      }),
      apiAll("/classes").then(function (res) {
        adapter.live.classes = replaceInPlace(
          arr("CLASSES"),
          (res.data || []).map(mapClassSection),
        );
      }),
      listJob("/admissions", "ADMISSIONS", mapApplication, function (rows) {
        adapter.admissionIds = {};
        adapter.admissionStatus = {};
        rows.forEach(function (r) {
          adapter.admissionIds[r.applicantName] = r._id;
          adapter.admissionStatus[r.applicantName] = r.status;
        });
      }),
      listJob("/leave", "LEAVE", mapLeave),
      listJob("/announcements", "ANN", mapAnn),
      loadAudit(),
      listJob("/biometric", "BIODEVICES", mapBiometricDevice),
      listJob("/transport/routes", "ROUTES", mapRoute, function (rows) {
        adapter.routeIds = {};
        rows.forEach(function (route) {
          adapter.routeIds[route.name] = route._id;
        });
      }),
      listJob(
        "/transport/vehicles",
        "FLEETADD",
        function (v) {
          return {
            plate: v.regNumber,
            mongoId: v._id,
            driver: v.driverName,
            capacity: v.capacity,
            cap: v.capacity,
            status: v.status || "Available",
            type: "Bus",
          };
        },
        function (rows) {
          adapter.vehicleIds = {};
          rows.forEach(function (r) {
            adapter.vehicleIds[r.regNumber] = r._id;
          });
        },
      ),
      listJob("/transport/incidents", "TRANS_INCIDENTS", mapTransportIncident),
      listJob("/library/loans", "LIBLOANS", mapLoan, function (rows) {
        adapter.loanIds = {};
        rows.forEach(function (loan) {
          var book = loan.book || {};
          var student = loan.student || {};
          adapter.loanIds[(book.title || "") + "::" + (student.name || "")] =
            loan._id;
        });
      }),
      listJob("/library/books", "BOOKCAT", mapBookCat, function (rows) {
        adapter.bookIds = {};
        adapter.staffEmails = adapter.staffEmails || {};
        rows.forEach(function (r) {
          adapter.bookIds[r.title] = r._id;
        });
      }),
      listJob("/library/requests", "LIBREQUESTS", mapBookRequest),
      listJob(
        "/payroll",
        "PAYRUN",
        function (p) {
          var staff = p.staff || {};
          return {
            id: p._id,
            month: p.month,
            name: staff.name || "Unknown employee",
            dept: staff.designation || "-",
            gross: p.basicSalary + p.allowances,
            ded: p.deductions,
            status: p.status,
          };
        },
        function (rows) {
          adapter.payslipIds = {};
          rows.forEach(function (p) {
            var staff = p.staff || {};
            if (staff.name) adapter.payslipIds[staff.name] = p._id;
          });
        },
      ),
      listJob(
        "/facilities/facilities",
        "FACILITIES",
        mapFacility,
        function (rows) {
          adapter.facilityIds = {};
          rows.forEach(function (r) {
            adapter.facilityIds[r.name] = r._id;
          });
        },
      ),
      listJob("/facilities/bookings", "BOOKINGS", mapFacBooking),
      api("/hostel/rooms?limit=100").then(function (res) {
        var rooms = res.data || [];
        adapter.roomIds = {};
        rooms.forEach(function (room) {
          adapter.roomIds[room.roomNumber] = room._id;
        });
        if (rooms.length && typeof HOSTEL !== "undefined") {
          var priorBlocks = HOSTEL.slice();
          var grouped = {};
          rooms.forEach(function (room) {
            if (!grouped[room.block])
              grouped[room.block] = {
                beds: 0,
                filled: 0,
                rooms: 0,
                floors: {},
              };
            var group = grouped[room.block];
            group.beds += room.capacity;
            group.filled += (room.occupants || []).length;
            group.rooms += 1;
            group.floors[hostelFloor(room.roomNumber)] = true;
          });
          var liveBlocks = Object.keys(grouped).map(function (block, index) {
            var old =
              priorBlocks.find(function (item) {
                return item.block === block;
              }) || {};
            var group = grouped[block];
            return {
              block: block,
              code: old.code || String(block).slice(0, 2).toUpperCase(),
              beds: group.beds,
              filled: group.filled,
              rooms: group.rooms,
              floors: Object.keys(group.floors).length,
              warden: old.warden || "Not assigned",
              assist: old.assist || "Not assigned",
              c: old.c || (index % 2 ? "green" : "blue"),
            };
          });
          HOSTEL.length = 0;
          Array.prototype.push.apply(HOSTEL, liveBlocks);
          adapter.live.hostelOverview = true;
        }
        var previousBoarders =
          typeof BOARDERS !== "undefined" ? BOARDERS.slice() : [];
        var boarders = [];
        rooms.forEach(function (room) {
          (room.occupants || []).forEach(function (student) {
            var previous =
              previousBoarders.find(function (b) {
                return b.name === student.name;
              }) || {};
            boarders.push({
              name: student.name || "Unknown student",
              id: student.refId || String(student._id),
              grade: student.grade || "—",
              room: room.roomNumber,
              block: room.block,
              guardian: previous.guardian || "—",
              phone: previous.phone || "—",
              fee: previous.fee || "Paid",
              medical: previous.medical || "—",
              joined: previous.joined || "Today",
              roll: previous.roll || "Present",
            });
          });
        });
        var date = new Date().toISOString().slice(0, 10);
        return api("/hostel/roll-call?date=" + date)
          .catch(function () {
            return { data: [] };
          })
          .then(function (rollRes) {
            var statuses = {};
            (rollRes.data || []).forEach(function (entry) {
              if (entry.student && entry.student.refId)
                statuses[entry.student.refId] = entry.status;
            });
            boarders.forEach(function (boarder) {
              if (statuses[boarder.id]) boarder.roll = statuses[boarder.id];
            });
            adapter.live.hostelRooms = replaceInPlace(
              typeof HROOMS !== "undefined" ? HROOMS : null,
              rooms.map(mapHostelRoom),
            );
            adapter.live.hostelBoarders = replaceInPlace(
              typeof BOARDERS !== "undefined" ? BOARDERS : null,
              boarders,
            );
          });
      }),
      listJob("/hostel/leave", "HLEAVE", mapHostelLeave, function (rows) {
        adapter.hostelLeaveIds = {};
        adapter.hostelLeaveActivity = rows.slice(0, 3).map(mapHostelLeave);
        rows.forEach(function (leave) {
          adapter.hostelLeaveIds[leave._id] = leave._id;
        });
      }),
      listJob(
        "/hostel/maintenance",
        "HMAINT",
        mapHostelMaintenance,
        function (rows) {
          adapter.hostelMaintenanceIds = {};
          adapter.hostelMaintenanceActivity = rows
            .slice(0, 3)
            .map(mapHostelMaintenance);
          rows.forEach(function (request) {
            adapter.hostelMaintenanceIds[request.refId] = request._id;
          });
        },
      ),
    );
    jobs.push(
      apiAll("/lms/submissions").then(function (res) {
        adapter.lmsSubmissions = res.data || [];
        adapter.live.lmsSubmissions = true;
      }),
    );
    jobs.push(
      apiAll("/lms/assignments").then(function (res) {
        var rows = res.data || [],
          courses = arr("COURSES") || [];
        adapter.lmsAssignments = rows;
        courses.forEach(function (c) {
          var m = String(c.cls || "").match(/^(\d+)-([A-Za-z]+)$/),
            grade = m
              ? "Grade " + m[1] + " · " + m[2]
              : String(c.cls || "").trim(),
            own = rows.filter(function (a) {
              return a.subject === c.t && a.grade === grade;
            });
          if (own.length)
            c._serverAssignments = own.map(function (a) {
              return {
                mongoId: a._id,
                title: a.title,
                type: "Assignment",
                due: short(a.dueDate),
                status: new Date(a.dueDate) > new Date() ? "Open" : "Closed",
                maxScore: a.maxScore,
                submissions: 0,
                total: 0,
                graded: 0,
                myStatus: "Not submitted",
                myGrade: null,
              };
            });
        });
        adapter.live.lmsAssignments = true;
      }),
    );
    jobs.push(
      apiAll("/timetable").then(function (res) {
        var slots = res.data || [];
        adapter.timetableSlots = slots;
        var store = arr("TTDATA");
        var classes = arr("TTCLASSES");
        var getData = arr("ttData");
        if (!store || !classes || typeof getData !== "function") return;

        slots.forEach(function (slot) {
          if (classes.indexOf(slot.grade) < 0) classes.push(slot.grade);
        });
        classes.forEach(function (grade) {
          var current = getData(grade);
          store[grade] = {
            status: "Draft",
            rows: current.rows.map(function (row) {
              return [
                row[0],
                row[1].map(function (cell) {
                  return cell === "BREAK" ? "BREAK" : "FREE";
                }),
              ];
            }),
          };
        });

        adapter.timetableIds = {};
        var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        var byGrade = {};
        slots.forEach(function (slot) {
          var timetable = store[slot.grade];
          if (!timetable) return;
          var period = 0;
          var rowIndex = -1;
          timetable.rows.some(function (row, index) {
            if (row[1][0] === "BREAK") return false;
            period += 1;
            if (period === slot.periodNumber) {
              rowIndex = index;
              return true;
            }
            return false;
          });
          var dayIndex = days.indexOf(slot.dayOfWeek);
          if (rowIndex < 0 || dayIndex < 0) return;
          timetable.rows[rowIndex][1][dayIndex] =
            slot.subject +
            "|" +
            slot.teacherName +
            (slot.isSubstitute ? " (sub)" : "") +
            "|" +
            (slot.room || "—");
          adapter.timetableIds[
            slot.grade + "|" + slot.dayOfWeek + "|" + slot.periodNumber
          ] = slot._id;
          byGrade[slot.grade] = byGrade[slot.grade] || [];
          byGrade[slot.grade].push(slot);
        });
        Object.keys(byGrade).forEach(function (grade) {
          store[grade].status = byGrade[grade].every(function (slot) {
            return slot.status === "Published";
          })
            ? "Published"
            : "Draft";
        });
        adapter.live.timetable = true;
      }),
    );
    jobs.push(
      studentJob
        .then(function () {
          return apiAll("/exams");
        })
        .then(function (res) {
          var exams = res.data || [];
          var familyRole =
            adapter.user &&
            ["Parent", "Student"].indexOf(adapter.user.role) >= 0;
          var targetStudent =
            familyRole && typeof STUDENTS !== "undefined" && STUDENTS[0];
          var candidates = familyRole
            ? exams.filter(function (row) {
                return row.locked;
              })
            : exams.slice(0, 1);
          function loadCandidate(index) {
            var candidate = candidates[index];
            if (!candidate) return Promise.resolve(null);
            return apiAll(
              "/exams/results?examId=" + encodeURIComponent(candidate._id),
            ).then(function (resultRes) {
              var rows = resultRes.data || [];
              var matching =
                targetStudent &&
                rows.some(function (row) {
                  var studentId =
                    row.student && (row.student._id || row.student);
                  return String(studentId) === String(targetStudent.mongoId);
                });
              if (familyRole && targetStudent && !matching) {
                if (index + 1 < candidates.length)
                  return loadCandidate(index + 1);
                return { exam: candidates[0], results: [] };
              }
              return { exam: candidate, results: rows };
            });
          }
          return loadCandidate(0).then(function (selected) {
            if (!selected) return;
            var exam = selected.exam;
            adapter.examId = exam._id;
            adapter.exam = exam;
            if (typeof EXAMSCHEMES !== "undefined" && EXAMSCHEMES[0]) {
              Object.assign(EXAMSCHEMES[0], {
                id: exam._id,
                name: exam.name,
                term: exam.term,
                subjects: exam.subjects.slice(),
                maxMarks: exam.maxMarks,
                passMark: exam.passMark,
                locked: Boolean(exam.locked),
                status: exam.locked ? "Published" : "Draft",
              });
            }
            var results = selected.results.map(function (result) {
              var student = result.student || {};
              var row = {
                studentId: student._id || result.student,
                name: student.name || "Unknown student",
                cls: student.grade || "-",
                grade: result.grade,
                rank: 0,
              };
              (result.scores || []).forEach(function (score) {
                row[subjKey(score.subject)] = score.marks;
              });
              return row;
            });
            results.sort(function (a, b) {
              return resultAvg(b) - resultAvg(a);
            });
            results.forEach(function (row, index) {
              row.rank = index + 1;
            });
            adapter.live.examResults = replaceInPlace(
              typeof EXAMRESULTS !== "undefined" ? EXAMRESULTS : null,
              results,
            );
          });
        }),
    );
    jobs.push(
      api("/surveys?limit=100").then(function (res) {
        var surveys = res.data || [];
        return Promise.all(
          surveys.map(function (survey) {
            return api("/surveys/" + survey._id + "/results")
              .then(function (result) {
                return mapSurvey(survey, result.data.totalRespondents);
              })
              .catch(function () {
                return mapSurvey(survey, 0);
              });
          }),
        ).then(function (rows) {
          adapter.live.surveys = replaceInPlace(
            typeof SURVEYS !== "undefined" ? SURVEYS : null,
            rows,
          );
        });
      }),
    );
    if (
      adapter.user &&
      ["Administrator", "Principal"].indexOf(adapter.user.role) >= 0
    ) {
      jobs.push(
        api("/reports/overview").then(function (res) {
          adapter.reportsOverview = res.data;
          adapter.live.reports = true;
        }),
      );
    }
    // A failed student roster must never display fictional student records to a real account.
    // Other module jobs remain independent, but the roster is mandatory before signing in.
    // Attach handlers immediately: an optional 403 can arrive before the roster request
    // finishes. Waiting to attach .catch until then creates an unhandled rejection.
    var optionalJobs = jobs.map(function (p) {
      return p.catch(function (e) {
        console.info("[SchoolOS] optional module unavailable:", e.message);
      });
    });
    return studentJob.then(function () {
      return Promise.all(optionalJobs);
    });
  }

  /* UI form -> validated API request -> MongoDB -> refreshed view model. */
  var phoneOk = function (p) {
    return /^\+?[0-9 ]{7,20}$/.test(p || "");
  };
  var slug = function (n) {
    return String(n || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.|\.$/g, "");
  };
  var studentIdFor = function (value) {
    var key = (value || "").trim();
    return (
      (adapter.studentIdsByRef && adapter.studentIdsByRef[key]) ||
      (adapter.studentIds && adapter.studentIds[key])
    );
  };

  var WRITE_MAP = {
    addStudent: {
      path: "/students",
      refresh: "students",
      payload: function (v) {
        var name =
          (
            (v.first_name || "").trim() +
            " " +
            (v.last_name || "").trim()
          ).trim() || (v.name || "").trim();
        var grade = v.grade || "Grade 1 · A";
        if (!name || !(v.guardian || "").trim())
          return { _skip: "student and guardian names are required" };
        if (!v.gender) return { _skip: "gender is required" };
        if (!phoneOk(v.phone))
          return { _skip: "enter a valid guardian phone number" };
        if (
          v.transport &&
          v.transport !== "No" &&
          (!v.route || !adapter.routeIds || !adapter.routeIds[v.route.trim()])
        ) {
          return { _skip: "select an existing transport route" };
        }
        var payload = {
          refId: (v.admission_no || "").trim() || nextNum(STUDENTS, "ANS"),
          name: name,
          grade: grade,
          gender: v.gender,
          roll: String(
            STUDENTS.filter(function (s) {
              return s.grade.split(" · ")[0] === grade.split(" · ")[0];
            }).length + 1,
          ),
          guardianName: (v.guardian || "").trim() || "Guardian on file",
          phone: v.phone.trim(),
          feeStatus: "Pending",
          status: "Active",
          transportRequirement: v.transport || "No",
        };
        var optional = {
          dob: "dateOfBirth",
          nationality: "nationality",
          relationship: "guardianRelationship",
          email: "guardianEmail",
          emergency: "emergencyContact",
          pref_language: "preferredLanguage",
          address: "address",
          prev_school: "previousSchool",
          prev_grade: "previousGrade",
          languages: "languages",
          blood_group: "bloodGroup",
          allergies: "allergies",
          medical: "medicalNotes",
        };
        Object.keys(optional).forEach(function (key) {
          var value = String(v[key] || "").trim();
          if (value) payload[optional[key]] = value;
        });
        return payload;
      },
      after: function (v, result) {
        var uploads =
          typeof DOC_BUFFER === "undefined"
            ? []
            : Object.keys(DOC_BUFFER).map(function (key) {
                var file = DOC_BUFFER[key];
                var comma = String(file.url || "").indexOf(",");
                var binary = atob(String(file.url || "").slice(comma + 1));
                var bytes = new Uint8Array(binary.length);
                for (var i = 0; i < binary.length; i += 1)
                  bytes[i] = binary.charCodeAt(i);
                return api(
                  "/students/" +
                    result.data._id +
                    "/documents/" +
                    encodeURIComponent(key),
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": file.type,
                      "X-File-Name": encodeURIComponent(file.name),
                    },
                    body: bytes,
                  },
                );
              });
        return Promise.all(uploads)
          .then(function () {
            if (!v.transport || v.transport === "No") return result;
            var routeId =
              adapter.routeIds && adapter.routeIds[(v.route || "").trim()];
            return api("/transport/routes/" + routeId + "/assign", {
              method: "POST",
              body: JSON.stringify({ studentId: result.data._id }),
            });
          })
          .catch(function (error) {
            return api("/students/" + result.data._id, { method: "DELETE" })
              .catch(function () {})
              .then(function () {
                throw error;
              });
          });
      },
    },
    saveStudentEdit: {
      path: function () {
        var row =
          typeof STUDENTS !== "undefined" &&
          STUDENTS.find(function (s) {
            return s.id === state._studentEditId;
          });
        return row && row.mongoId ? "/students/" + row.mongoId : null;
      },
      method: "PATCH",
      refresh: "students",
      payload: function (v) {
        var body = {
          name: String(v.name || "").trim(),
          grade: String(v.grade || "").trim(),
          roll: String(v.roll || "").trim(),
          gender: v.gender,
          status: v.status,
          guardianName: String(v.guardian || "").trim(),
          phone: String(v.phone || "").trim(),
          transportRequirement: v.transport || "No",
        };
        if (!body.name || !body.grade || !body.roll || !body.guardianName)
          return { _skip: "complete all required student fields" };
        if (!phoneOk(body.phone))
          return { _skip: "enter a valid guardian phone number" };
        if (String(v.email || "").trim())
          body.guardianEmail = String(v.email).trim();
        if (String(v.emergency || "").trim()) {
          if (!phoneOk(v.emergency))
            return { _skip: "enter a valid emergency contact" };
          body.emergencyContact = String(v.emergency).trim();
        }
        if (String(v.address || "").trim())
          body.address = String(v.address).trim();
        if (String(v.medical || "").trim())
          body.medicalNotes = String(v.medical).trim();
        return body;
      },
    },
    createStaff: {
      path: "/staff",
      refresh: "staff",
      payload: function (v) {
        var name =
          (
            (v.first_name || "").trim() +
            " " +
            (v.last_name || "").trim()
          ).trim() || (v.name || "").trim();
        return {
          refId: nextNum(STAFF, "EMP"),
          name: name,
          designation: v.role || "Staff",
          department: v.dept || "Administration",
          type: v.type === "Non-Teaching" ? "Non-Teaching" : "Teaching",
          status: "Onboarding",
          email: (v.email || "").trim() || slug(name) + "@alnoor.ae",
          phone: phoneOk(v.phone) ? v.phone.trim() : "+971 500000000",
          joinedDate: new Date().toISOString().slice(0, 10),
        };
      },
    },
    createTicket: {
      path: "/helpdesk",
      refresh: true,
      payload: function (v) {
        var pr =
          ["Low", "Medium", "High", "Urgent"].indexOf(v.priority) >= 0
            ? v.priority
            : "Medium";
        return {
          category: v.category || "IT",
          subject: (v.title || "").trim(),
          description: (v.desc || v.title || "").trim(),
          priority: pr,
        };
      },
    },
    checkInVisitor: {
      path: "/visitors",
      refresh: true,
      payload: function (v) {
        return {
          visitorName: (v.visitor_name || "").trim(),
          purpose: (v.purpose || "Visit").trim(),
          hostName: (v.host_person_visiting || "").trim() || "Front desk",
        };
      },
    },
    logBehaviour: {
      path: "/behaviour",
      refresh: true,
      payload: function (v) {
        var sid = studentIdFor(
          String(v.student_name || v.student_pick || "").split(" - ")[0],
        );
        if (!sid) return { _skip: "student not on server yet" };
        var sev =
          ["Minor", "Moderate", "Serious"].indexOf(v.severity) >= 0
            ? v.severity
            : "Minor";
        var type =
          ["Merit", "Incident", "Detention", "Pastoral note"].indexOf(v.type) >=
          0
            ? v.type
            : "Incident";
        var points = parseInt(v.pts, 10);
        if (isNaN(points)) points = type === "Merit" ? 5 : -2;
        return {
          studentId: sid,
          category: v.category || type,
          description: (
            v.description ||
            v.note ||
            v.action ||
            "Recorded"
          ).trim(),
          severity: sev,
          actionTaken: (v.action || "").trim() || undefined,
          type: type,
          points: points,
          location: (v.location || "").trim() || undefined,
          witness: (v.witness || "").trim() || undefined,
        };
      },
    },
    logClinic: {
      path: "/health-records",
      refresh: true,
      payload: function (v) {
        var sid = studentIdFor(
          String(v.student_name || v.student_pick || "").split(" - ")[0],
        );
        if (!sid) return { _skip: "student not on server yet" };
        var o = /home/i.test(v.outcome || "")
          ? "Sent home"
          : /hospital|refer/i.test(v.outcome || "")
            ? "Referred to hospital"
            : /observation/i.test(v.outcome || "")
              ? "Under observation"
              : "Returned to class";
        return {
          studentId: sid,
          reason: (v.reason || "Clinic visit").trim(),
          treatment: (
            v.action ||
            v.medicine ||
            v.notes ||
            "Observation"
          ).trim(),
          outcome: o,
          severity: v.severity || "Routine",
          vitals: (v.vitals || "").trim() || undefined,
          medicine: (v.medicine || "").trim() || undefined,
        };
      },
    },
    /* ---- batch 2 ---- */
    createEnquiry: {
      path: "/admissions",
      refresh: true,
      payload: function (v) {
        var name =
          ((v.first_name || "") + " " + (v.last_name || "")).trim() ||
          (v.applicant || "").trim();
        return {
          applicantName: name,
          gradeAppliedFor: v.grade || "Grade 1",
          gender: v.gender === "Female" ? "Female" : "Male",
          guardianName: (v.guardian || "").trim() || "Guardian on file",
          phone: phoneOk(v.phone) ? v.phone.trim() : "+971 500000000",
          dateOfBirth: v.dob || undefined,
          nationality: (v.nationality || "").trim() || undefined,
          guardianRelationship: v.relationship || undefined,
          guardianEmail: (v.email || "").trim() || undefined,
          source: v.source || "Website",
          previousSchool: (v.prev_school || "").trim() || undefined,
          notes: (v.notes || "").trim() || undefined,
        };
      },
      after: function (_v, result) {
        var app = result && result.data,
          files = typeof DOC_BUFFER !== "undefined" ? DOC_BUFFER : {};
        if (!app || !app._id) return Promise.resolve();
        return Object.keys(files).reduce(function (chain, key) {
          return chain.then(function () {
            var file = files[key],
              comma = String(file.url || "").indexOf(","),
              binary = atob(String(file.url || "").slice(comma + 1)),
              bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i += 1)
              bytes[i] = binary.charCodeAt(i);
            return api(
              "/admissions/" +
                app._id +
                "/documents/" +
                encodeURIComponent(key),
              {
                method: "PUT",
                headers: {
                  "Content-Type": file.type,
                  "X-File-Name": encodeURIComponent(file.name),
                },
                body: bytes,
              },
            );
          });
        }, Promise.resolve());
      },
    },
    addInventory: {
      path: "/inventory/items",
      refresh: true,
      payload: function (v) {
        return {
          name: (v.item_name || "").trim(),
          sku: (v.sku || "").trim() || "SKU-" + Date.now(),
          category: v.category || "General",
          quantityOnHand: parseInt(v.quantity_in_stock || 0, 10) || 0,
          reorderLevel: parseInt(v.reorder_minimum || 10, 10) || 10,
          unitCost: parseFloat(v.unit_cost || 0) || 0,
          supplier: (v.supplier || "").trim() || undefined,
          location: (v.location || "").trim() || undefined,
        };
      },
    },
    addEvent: {
      path: "/events",
      payload: function (v) {
        var aud =
          ["All", "Students", "Staff", "Parents"].indexOf(v.audience) >= 0
            ? v.audience
            : "All";
        return {
          title: (v.event_title || "").trim(),
          description: (v.type || "Event") + (v.venue ? " at " + v.venue : ""),
          date: v.date || new Date().toISOString().slice(0, 10),
          audience: aud,
        };
      },
    },
    saveUnit: {
      path: "/curriculum",
      refresh: true,
      payload: function (v) {
        return {
          subject: v.subject || "General",
          term: v.term || "Term 1",
          title: (v.title || "").trim(),
          outcomes: (v.outcomes || "See unit plan").trim(),
          plannedDate: v.date || undefined,
        };
      },
    },
    addClass: {
      path: "/classes",
      refresh: true,
      payload: function (v) {
        var teacher = String(v.teacher || "").trim();
        var teacherStaffId = adapter.staffIds && adapter.staffIds[teacher];
        return {
          grade: String(v.grade || "")
            .replace(/^KG([12])$/, "KG $1")
            .trim(),
          section: String(v.section || "")
            .trim()
            .toUpperCase(),
          stream: v.stream || "General",
          teacherStaffId: teacherStaffId || undefined,
          capacity: parseInt(v.cap || 30, 10) || 30,
        };
      },
    },
    addVehicle: {
      path: "/transport/vehicles",
      refresh: true,
      payload: function (v) {
        return {
          regNumber: (v.plate_number || "").trim(),
          capacity: parseInt(v.capacity || 40, 10) || 40,
          driverName: (v.driver || "").trim() || "Driver on file",
          driverPhone: "+971 500000000",
        };
      },
    },
    recordPayment: {
      path: "/fees/payments",
      refresh: true,
      payload: function (v) {
        var m =
          ["Card", "Bank transfer", "Cash", "Cheque", "Online portal"].indexOf(
            v.method,
          ) >= 0
            ? v.method
            : "Cash";
        var selected = (v.student_pick || v.new_student_name || "").trim();
        var ref = selected.split(" - ").pop();
        var sid =
          (adapter.studentIdsByRef && adapter.studentIdsByRef[ref]) ||
          studentIdFor(selected.split(" - ")[0]);
        var amount = parseFloat(v.amount_aed || 0) || 0;
        if (!sid) return { _skip: "student not on server yet" };
        if (!amount) return { _skip: "enter a payment amount" };
        return {
          studentId: sid,
          amount: amount,
          paymentMethod: m,
          reference: String(v.reference || "").trim() || undefined,
        };
      },
    },
    addStaffLeave: {
      path: "/leave",
      refresh: true,
      payload: function (v) {
        var employee = String(v.emp || "").trim();
        var staffId = adapter.staffIds && adapter.staffIds[employee];
        return {
          staffId: staffId || undefined,
          fromDate: v.from,
          toDate: v.to,
          reason:
            (v.type || "Leave") + " - " + (v.reason || employee || "staff"),
        };
      },
    },
    submitMyLeave: {
      path: "/leave",
      payload: function (v) {
        return {
          fromDate: v.from,
          toDate: v.to,
          reason: (v.type || "Leave") + " requested via dashboard",
        };
      },
    },
    addTitle: {
      path: "/library/books",
      payload: function (v) {
        return {
          isbn: "ISBN-" + Date.now(),
          title: (v.title || "").trim(),
          author: (v.author || "").trim() || "Unknown",
          category: v.category || "General",
          totalCopies: parseInt(v.copies || 1, 10) || 1,
        };
      },
    },
    postAnnouncement: {
      path: "/announcements",
      refresh: true,
      payload: function (v) {
        var aud =
          v.audience === "Staff only"
            ? "Staff"
            : v.audience === "All"
              ? "All"
              : null;
        if (!aud)
          return {
            _skip:
              "this audience cannot be targeted yet; choose All or Staff only",
          };
        if (v.lang && v.lang !== "English")
          return { _skip: "Arabic translation is not configured" };
        return {
          title: (v.title || "").trim(),
          body: (v.message || "").trim(),
          audience: aud,
          pinned: /high|urgent/i.test(v.priority || ""),
          status: v.action === "Save as draft" ? "Draft" : "Pending approval",
        };
      },
    },
    topUpWallet: {
      path: "/cafeteria/wallets/top-up",
      refresh: true,
      payload: function (v) {
        var sid = studentIdFor(v.name);
        if (!sid) return { _skip: "student not on server yet" };
        return {
          studentId: sid,
          amount: parseFloat(v.amount || 0) || 0,
          description: "Wallet top-up via " + (v.method || "cash"),
        };
      },
    },
    addAllergy: {
      path: "/cafeteria/allergy-plans",
      refresh: true,
      payload: function (v) {
        var name = String(v.name || "")
          .split(" - ")[0]
          .trim();
        var sid = studentIdFor(name);
        if (!sid) return { _skip: "student not on server yet" };
        return {
          studentId: sid,
          allergens: String(v.allergens || "").trim(),
          severity: v.sev || "Moderate",
          carePlan: String(v.plan || "Dietary substitution required").trim(),
        };
      },
    },
    addMenu: {
      path: "/cafeteria/menu/item",
      method: "PUT",
      refresh: true,
      payload: function (v) {
        return {
          day: v.day || "Sunday",
          meal: v.meal || "Breakfast",
          item: String(v.item || "").trim(),
          calories: parseInt(v.cal || 0, 10) || 0,
          vegetarian: (v.veg || "Yes") === "Yes",
          allergens: String(v.alg || "")
            .split(",")
            .map(function (item) {
              return item.trim();
            })
            .filter(Boolean),
        };
      },
    },
    addDevice: {
      path: "/biometric",
      refresh: true,
      payload: function (v) {
        return {
          name: (v.mode || "Biometric") + " - " + (v.location || "Gate"),
          location: (v.location || "").trim() || "Main gate",
        };
      },
    },
    issueCert: {
      path: "/certificates",
      refresh: true,
      payload: function (v) {
        var pick = String(v.student_pick || v.student_name || "").trim();
        var ref = pick.split(" - ").pop().trim();
        var sid = studentIdFor(ref) || studentIdFor(pick.split(" - ")[0]);
        if (!sid) return { _skip: "student not on server yet" };
        var t = /transfer/i.test(v.document_type || "")
          ? "Transfer"
          : /character/i.test(v.document_type || "")
            ? "Character"
            : /bonafide/i.test(v.document_type || "")
              ? "Bonafide"
              : /report card/i.test(v.document_type || "")
                ? "ReportCard"
                : /provisional/i.test(v.document_type || "")
                  ? "Provisional"
                  : "Study";
        return {
          studentId: sid,
          type: t,
          purpose: (v.notes || "").trim() || undefined,
          status: v.action === "Submit for approval" ? "Pending" : "Issued",
        };
      },
    },
    saveExpenseClaim: {
      path: "/expenses",
      payload: function () {
        var v = typeof readForm === "function" ? readForm() : {};
        return {
          category: v.category || "General",
          amount: parseFloat(v.amount || 0) || 0,
          description: (v.description || "").trim(),
          expenseDate: v.date || new Date().toISOString().slice(0, 10),
        };
      },
    },
    saveMeetingSlot: {
      path: "/meetings",
      payload: function (v) {
        var tid =
          adapter.staffIds && adapter.staffIds[(v.teacher || "").trim()];
        if (!tid) return { _skip: "teacher not on server yet" };
        return {
          teacherStaffId: tid,
          date: v.date,
          startTime: (v.time || "09:00").slice(0, 5),
        };
      },
    },
    /* ---- batch 3: writes that need hydrated server ids ---- */
    issueBook: {
      path: "/library/loans",
      refresh: true,
      payload: function (v) {
        var bid = adapter.bookIds && adapter.bookIds[(v.title || "").trim()];
        var sid = studentIdFor(v.borrower);
        if (!bid || !sid)
          return {
            _skip: !bid
              ? "book not on server yet"
              : "student not on server yet",
          };
        return {
          bookId: bid,
          studentId: sid,
          dueDate:
            v.due && /\d{4}/.test(v.due)
              ? v.due
              : new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
        };
      },
    },
    addRoute: {
      path: "/transport/routes",
      refresh: true,
      payload: function (v) {
        var vid =
          adapter.vehicleIds &&
          adapter.vehicleIds[(v.bus_plate_number || "").trim()];
        if (!vid) return { _skip: "vehicle not on server yet" };
        var stops = String(v.stops || "")
          .split("\n")
          .map(function (line) {
            var parts = line.split(",").map(function (value) {
              return value.trim();
            });
            return {
              name: parts[0] || "Stop",
              address: parts.length >= 4 ? parts[1] : undefined,
              pincode: parts.length >= 4 ? parts[2] : undefined,
              time: parts.length >= 2 ? parts[parts.length - 1] : undefined,
            };
          })
          .filter(function (stop) {
            return !!stop.name;
          });
        return {
          name: (v.route_name || "").trim(),
          vehicleId: vid,
          gpsId: (v.gps_id || "").trim() || undefined,
          stops: stops.length ? stops : [{ name: "Main stop" }],
        };
      },
    },
    allocateRoom: {
      path: function (v) {
        var rid = adapter.roomIds && adapter.roomIds[(v.room || "").trim()];
        return rid ? "/hostel/rooms/" + rid + "/allocate" : null;
      },
      refresh: true,
      payload: function (v) {
        var sid = studentIdFor(String(v.name || "").split(" - ")[0]);
        if (!sid) return { _skip: "student not on server yet" };
        return { studentId: sid };
      },
    },
    addHostelLeave: {
      path: "/hostel/leave",
      refresh: true,
      payload: function (v) {
        var name = String(v.name || "")
          .split(" - ")[0]
          .trim();
        var boarder =
          typeof BOARDERS !== "undefined" &&
          BOARDERS.find(function (b) {
            return b.name === name;
          });
        var sid = studentIdFor(name);
        var roomNumber = (v.room || (boarder && boarder.room) || "").trim();
        var rid = adapter.roomIds && adapter.roomIds[roomNumber];
        if (!sid || !rid)
          return {
            _skip: !sid
              ? "student not on server yet"
              : "allocated room not on server yet",
          };
        var today = new Date().toISOString().slice(0, 10);
        return {
          studentId: sid,
          roomId: rid,
          type: v.type || "Weekend leave",
          fromDate: v.from || today,
          toDate: v.to || v.from || today,
          reason: (v.reason || "Leave request").trim(),
        };
      },
    },
    addMaint: {
      path: "/hostel/maintenance",
      refresh: true,
      payload: function (v) {
        var roomNumber = String(v.room || "").trim();
        var rid = adapter.roomIds && adapter.roomIds[roomNumber];
        if (!rid) return { _skip: "hostel room not on server yet" };
        return {
          refId: nextNum(typeof HMAINT !== "undefined" ? HMAINT : [], "HM"),
          roomId: rid,
          issue: String(v.issue || "").trim(),
          category: v.cat || "Other",
          priority: v.prio || "Medium",
        };
      },
    },
    confirmFacilityBooking: {
      path: "/facilities/bookings",
      payload: function (v) {
        var st =
          typeof state !== "undefined" && state._facBooking
            ? state._facBooking
            : {};
        var fid =
          adapter.facilityIds &&
          adapter.facilityIds[(st.facility || v.facility || "").trim()];
        if (!fid) return { _skip: "facility not on server yet" };
        var startTime = (st.time || "10:00").slice(0, 5);
        var dur = parseInt(v.duration || 1, 10) || 1;
        var endH = Math.min(23, parseInt(startTime.slice(0, 2), 10) + dur);
        return {
          facilityId: fid,
          date: st.date || new Date().toISOString().slice(0, 10),
          startTime: startTime,
          endTime: ("0" + endH).slice(-2) + startTime.slice(2),
          purpose: (v.purpose || "Booking").trim(),
        };
      },
    },
    saveRaisePO: {
      path: "/inventory/purchase-orders",
      refresh: true,
      payload: function (v) {
        // Uses the product line format: newline-separated "item name, qty"
        var lines = String(v.lines || "")
          .split("\n")
          .map(function (l) {
            return l.trim();
          })
          .filter(Boolean)
          .map(function (line) {
            var parts = line.split(",");
            var name = (parts[0] || "").trim();
            var qty = parseInt((parts[1] || "1").trim(), 10) || 1;
            var it = adapter.items && adapter.items[name.toLowerCase()];
            return it
              ? { itemId: it.id, quantity: qty, unitCost: it.unitCost }
              : null;
          })
          .filter(Boolean);
        if (!lines.length)
          return { _skip: "no ordered items exist on server yet" };
        return {
          refId: "PO-" + Date.now(),
          supplier: (v.supplier || "Supplier on file").trim(),
          lines: lines,
          expectedDelivery: v.expected || undefined,
          notes: (v.notes || "").trim() || undefined,
        };
      },
    },
    sendStaffMessage: {
      path: "/messages",
      payload: function (v) {
        var name =
          typeof state !== "undefined" &&
          state._staffMsgId &&
          typeof STAFF !== "undefined"
            ? (
                STAFF.find(function (x) {
                  return x.id === state._staffMsgId;
                }) || {}
              ).name
            : null;
        var email =
          name && adapter.staffEmails ? adapter.staffEmails[name] : null;
        if (!email) return { _skip: "staff email not on server yet" };
        return {
          recipientEmail: email,
          subject: (v.subject || "Message").trim(),
          body: (v.message || v.body || "").trim() || "(no content)",
        };
      },
    },
    sendStudentGuardianMessage: {
      path: "/messages",
      payload: function (v) {
        var row =
          typeof STUDENTS !== "undefined" &&
          STUDENTS.find(function (s) {
            return s.id === state._studentMessageId;
          });
        var email = row && String(row.email || "").trim();
        if (!email)
          return { _skip: "guardian email is not recorded for this student" };
        return {
          recipientEmail: email,
          subject: String(v.subject || "").trim(),
          body: String(v.message || "").trim(),
        };
      },
    },
    submitAbsenceRequest: {
      path: "/attendance/absence-requests",
      refresh: true,
      payload: function (v) {
        var st =
          typeof myAbsenceStudent === "function" ? myAbsenceStudent() : null;
        var sid =
          st && (st.mongoId || studentIdFor(st.id) || studentIdFor(st.name));
        if (!sid) return { _skip: "student is not available on the server" };
        return {
          studentId: sid,
          fromDate: v.from,
          toDate: v.to,
          type: v.type || "Other",
          note: String(v.note || "").trim(),
        };
      },
    },
  };

  function installSettingsWorkflow() {
    var settingsSaving = false;
    window.toggleModule = function (id) {
      if (
        !adapter.live.settings ||
        !adapter.settings ||
        !Object.prototype.hasOwnProperty.call(state.modules, id)
      ) {
        toast("Not saved — settings are unavailable");
        return;
      }
      if (!adapter.user || adapter.user.role !== "Administrator") {
        toast("Only an Administrator can edit school settings");
        return;
      }
      if (settingsSaving) {
        toast("Wait for the current settings save to finish");
        return;
      }
      var disabled = OPTIONAL.filter(function (module) {
        return module.id === id ? state.modules[id] : !state.modules[module.id];
      }).map(function (module) {
        return module.id;
      });
      var next = Object.assign({}, adapter.settings, {
        disabledModules: disabled,
      });
      settingsSaving = true;
      api("/settings", { method: "PUT", body: JSON.stringify(next) })
        .then(function (res) {
          adapter.settings = res.data;
          state.modules[id] = !state.modules[id];
          if (!state.modules[id] && state.module === id)
            state.module = "dashboard";
          renderNav();
          render();
          toast(
            (
              OPTIONAL.find(function (module) {
                return module.id === id;
              }) || {}
            ).label + (state.modules[id] ? " enabled" : " disabled"),
          );
        })
        .catch(function (e) {
          render();
          toast("Not saved — " + e.message);
        })
        .finally(function () {
          settingsSaving = false;
        });
    };
    window.updateProfile = function (key, value) {
      var fields = {
        legalName: "schoolName",
        license: "license",
        principal: "principal",
        address: "address",
        academicYear: "academicYear",
        timezone: "timezone",
        currency: "currency",
        defaultAnnualLeave: "defaultAnnualLeave",
      };
      if (!fields[key] || !adapter.live.settings || !adapter.settings) {
        toast("Not saved — settings are unavailable");
        return;
      }
      if (!adapter.user || adapter.user.role !== "Administrator") {
        toast("Only an Administrator can edit school settings");
        return;
      }
      if (settingsSaving) {
        render();
        toast("Wait for the current settings save to finish");
        return;
      }
      var next = Object.assign({}, adapter.settings);
      next[fields[key]] =
        key === "defaultAnnualLeave"
          ? Number(value)
          : String(value || "").trim();
      settingsSaving = true;
      api("/settings", { method: "PUT", body: JSON.stringify(next) })
        .then(function (res) {
          adapter.settings = res.data;
          CFG.currency = res.data.currency || "AED";
          CFG.previewCurrency = CFG.currency;
          state.schoolProfile = {
            legalName: res.data.schoolName || "",
            license: res.data.license || "",
            principal: res.data.principal || "",
            address: res.data.address || "",
            academicYear: res.data.academicYear || "",
            timezone: res.data.timezone || "",
            currency: res.data.currency || "AED",
            defaultAnnualLeave: res.data.defaultAnnualLeave,
          };
          render();
          toast("Saved — " + key);
        })
        .catch(function (e) {
          render();
          toast("Not saved — " + e.message);
        })
        .finally(function () {
          settingsSaving = false;
        });
    };
  }

  function installAuditWorkflow() {
    window.refreshAuditLog = function () {
      if (
        !adapter.user ||
        ["Administrator", "Principal"].indexOf(adapter.user.role) < 0
      ) {
        toast("Audit log access required");
        return;
      }
      return loadAudit()
        .then(function () {
          render();
          toast("Audit log refreshed");
        })
        .catch(function (e) {
          adapter.live.audit = false;
          render();
          toast("Audit log unavailable — " + e.message);
        });
    };
  }

  function installAnnouncementWorkflow() {
    [
      ["submitAnnForApproval", "Pending approval"],
      ["approveAnn", "Published"],
      ["rejectAnn", "Draft"],
    ].forEach(function (entry) {
      window[entry[0]] = function (index) {
        var row = typeof ANN !== "undefined" && ANN[index];
        if (!row || !row.mongoId) {
          toast("Not saved — announcement is not available on the server");
          return false;
        }
        api("/announcements/" + encodeURIComponent(row.mongoId) + "/status", {
          method: "PATCH",
          body: JSON.stringify({ status: entry[1] }),
        })
          .then(function () {
            return hydrate();
          })
          .then(function () {
            closeDrawer();
            render();
            toast(
              entry[1] === "Published"
                ? "Announcement published in the portal"
                : entry[1] === "Draft"
                  ? "Returned to draft"
                  : "Sent for approval",
            );
          })
          .catch(function (error) {
            toast("Not saved — " + error.message);
          });
        return false;
      };
    });
  }

  function installCertificateWorkflow() {
    [
      ["approveCert", "Issued"],
      ["rejectCert", "Rejected"],
    ].forEach(function (entry) {
      var name = entry[0],
        decision = entry[1];
      if (window[name] && window[name].__apiBacked) return;
      var decide = function (ref) {
        var certificate =
          typeof CERTS !== "undefined" &&
          CERTS.find(function (row) {
            return row.ref === ref;
          });
        if (
          !certificate ||
          !certificate.mongoId ||
          certificate.status !== "Pending"
        ) {
          toast("Certificate request is not pending on the server");
          return false;
        }
        api(
          "/certificates/" +
            encodeURIComponent(certificate.mongoId) +
            "/decision",
          {
            method: "POST",
            body: JSON.stringify({ decision: decision }),
          },
        )
          .then(function () {
            return hydrate();
          })
          .then(function () {
            closeDrawer();
            render();
            toast(
              decision === "Issued"
                ? "Certificate request approved"
                : "Certificate request rejected",
            );
          })
          .catch(function (error) {
            toast("Not saved — " + error.message);
          });
        return false;
      };
      decide.__apiBacked = true;
      window[name] = decide;
    });
  }

  function installWriteThrough() {
    Object.keys(WRITE_MAP).forEach(function (name) {
      var original = window[name];
      if (typeof original !== "function" || original.__wrapped) return;
      var spec = WRITE_MAP[name];
      var wrapped = function (v) {
        var self = this;
        var args = arguments;
        try {
          var body = spec.payload(v || {});
          if (!body) return false;
          if (body._skip) {
            if (typeof toast === "function") toast("Not saved — " + body._skip);
            return false;
          }
          var path =
            typeof spec.path === "function" ? spec.path(v || {}) : spec.path;
          if (!path) {
            if (typeof toast === "function")
              toast("Not saved — no matching server record");
            return false;
          }
          api(path, {
            method: spec.method || "POST",
            body: JSON.stringify(body),
          })
            .then(function (result) {
              return spec.after
                ? Promise.resolve(spec.after(v || {}, result)).then(
                    function () {
                      return result;
                    },
                  )
                : result;
            })
            .then(function () {
              original.apply(self, args); // Preserve the exact existing UI interaction, but only after persistence succeeds.
              console.info("[SchoolOS] " + name + " -> saved to server");
              if (spec.refresh)
                return hydrate().then(function () {
                  if (typeof render === "function") render();
                });
              return undefined;
            })
            .catch(function (e) {
              console.warn(
                "[SchoolOS] " + name + ": server rejected: " + e.message,
              );
              if (typeof toast === "function")
                toast("Not saved — " + e.message);
            });
        } catch (e) {
          console.warn("[SchoolOS] write-through error", e);
        }
        return false;
      };
      wrapped.__wrapped = true;
      window[name] = wrapped;
    });
    adapter.writeThrough = Object.keys(WRITE_MAP);
  }

  function installStudentDocuments() {
    function row(id) {
      return (
        typeof STUDENTS !== "undefined" &&
        STUDENTS.find(function (s) {
          return s.id === id;
        })
      );
    }
    function upload(file, id, key) {
      var student = row(id);
      if (!student || !student.mongoId) {
        toast("Not saved — student is not available on the server");
        return;
      }
      var comma = String(file.url || "").indexOf(",");
      var binary = atob(String(file.url || "").slice(comma + 1));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i += 1)
        bytes[i] = binary.charCodeAt(i);
      api(
        "/students/" +
          student.mongoId +
          "/documents/" +
          encodeURIComponent(key),
        {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "X-File-Name": encodeURIComponent(file.name),
          },
          body: bytes,
        },
      )
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(studentProfile(id));
          toast("Document securely saved · " + file.name);
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
    }
    window.stuDocPick = function (input, id, key) {
      var f = input.files && input.files[0];
      docReadFile(f, function (file) {
        upload(file, id, key);
      });
    };
    window.stuDocDrop = function (event, id, key) {
      event.preventDefault();
      var f =
        event.dataTransfer &&
        event.dataTransfer.files &&
        event.dataTransfer.files[0];
      docReadFile(f, function (file) {
        upload(file, id, key);
      });
    };
    function fetchFile(id, key, action) {
      var student = row(id),
        doc = student && findStuDoc(id, key);
      if (!student || !student.mongoId || !doc || !doc.file) return;
      apiBlob(
        "/students/" +
          student.mongoId +
          "/documents/" +
          encodeURIComponent(key),
      )
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          action({
            name: doc.file.name,
            size: doc.file.size,
            type: doc.file.type,
            url: url,
          });
          setTimeout(function () {
            URL.revokeObjectURL(url);
          }, 60000);
        })
        .catch(function (e) {
          toast("Download failed — " + e.message);
        });
    }
    window.stuDocDownload = function (id, key) {
      fetchFile(id, key, function (file) {
        dlUrl(file.url, file.name);
      });
    };
    window.stuDocView = function (id, key) {
      fetchFile(id, key, docPreview);
    };
    window.stuDocRemove = function (id, key) {
      var student = row(id);
      if (!student || !student.mongoId) return;
      api(
        "/students/" +
          student.mongoId +
          "/documents/" +
          encodeURIComponent(key),
        { method: "DELETE" },
      )
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(studentProfile(id));
          toast("Document removed");
        })
        .catch(function (e) {
          toast("Not removed — " + e.message);
        });
    };
    window.stuDocMark = function () {
      toast(
        "Paper-only receipt is not stored digitally; upload the verified document",
      );
    };
  }

  function installAdmissionWorkflow() {
    var originalAdvance = window.advanceAdmission;
    var originalDecline = window.saveAdmDecline;
    var originalWaitlist = window.waitlistAdmission;
    var originalRestore = window.restoreAdmission;
    var originalMove = window.moveAdmissionTo;
    function row(name) {
      return (
        typeof ADMISSIONS !== "undefined" &&
        ADMISSIONS.find(function (a) {
          return a.name === name;
        })
      );
    }
    function upload(file, name, key) {
      var application = row(name);
      if (!application || !application.mongoId) {
        toast("Not saved — application is not available on the server");
        return;
      }
      var comma = String(file.url || "").indexOf(","),
        binary = atob(String(file.url || "").slice(comma + 1)),
        bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i += 1)
        bytes[i] = binary.charCodeAt(i);
      api(
        "/admissions/" +
          application.mongoId +
          "/documents/" +
          encodeURIComponent(key),
        {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "X-File-Name": encodeURIComponent(file.name),
          },
          body: bytes,
        },
      )
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(admissionDetail(name));
          toast("Document securely saved · " + file.name);
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
    }
    window.admDocPick = function (input, name, key) {
      var file = input.files && input.files[0];
      docReadFile(file, function (stored) {
        upload(stored, name, key);
      });
    };
    window.admDocDrop = function (event, name, key) {
      event.preventDefault();
      var file =
        event.dataTransfer &&
        event.dataTransfer.files &&
        event.dataTransfer.files[0];
      docReadFile(file, function (stored) {
        upload(stored, name, key);
      });
    };
    function fetchFile(name, key, action) {
      var application = row(name),
        doc = application && findAdmDoc(name, key);
      if (!application || !application.mongoId || !doc || !doc.file) return;
      apiBlob(
        "/admissions/" +
          application.mongoId +
          "/documents/" +
          encodeURIComponent(key),
      )
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          action({
            name: doc.file.name,
            size: doc.file.size,
            type: doc.file.type,
            url: url,
          });
          setTimeout(function () {
            URL.revokeObjectURL(url);
          }, 60000);
        })
        .catch(function (e) {
          toast("Download failed — " + e.message);
        });
    }
    window.admDocDownload = function (name, key) {
      fetchFile(name, key, function (file) {
        dlUrl(file.url, file.name);
      });
    };
    window.admDocView = function (name, key) {
      fetchFile(name, key, docPreview);
    };
    window.admDocRemove = function (name, key) {
      var application = row(name);
      if (!application || !application.mongoId) return;
      api(
        "/admissions/" +
          application.mongoId +
          "/documents/" +
          encodeURIComponent(key),
        { method: "DELETE" },
      )
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(admissionDetail(name));
          toast("Document removed");
        })
        .catch(function (e) {
          toast("Not removed — " + e.message);
        });
    };
    window.admDocMark = function (name, key) {
      var application = row(name);
      if (!application || !application.mongoId) return;
      api(
        "/admissions/" +
          application.mongoId +
          "/documents/" +
          encodeURIComponent(key) +
          "/mark-received",
        { method: "POST" },
      )
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(admissionDetail(name));
          toast("Document marked received");
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
    };
    if (typeof originalAdvance === "function" && !originalAdvance.__apiBacked) {
      var advance = function (name) {
        var id = adapter.admissionIds && adapter.admissionIds[name];
        var status = adapter.admissionStatus && adapter.admissionStatus[name];
        if (!id || !status) {
          toast("Not saved — application is not available on the server");
          return;
        }
        var next = {
          Applied: "Shortlisted",
          Shortlisted: "Interviewed",
          Interviewed: "Accepted",
        }[status];
        var path, body;
        if (status === "Accepted") {
          var local =
            typeof ADMISSIONS !== "undefined" &&
            ADMISSIONS.find(function (a) {
              return a.name === name;
            });
          path = "/admissions/" + id + "/enroll";
          body = {
            refId: nextNum(STUDENTS, "ANS"),
            roll: String(
              STUDENTS.filter(function (s) {
                return local && s.grade.split(" · ")[0] === local.grade;
              }).length + 1,
            ),
          };
        } else if (next) {
          path = "/admissions/" + id + "/transition";
          body = { status: next };
        } else {
          toast("This application cannot be advanced");
          return;
        }
        api(path, { method: "POST", body: JSON.stringify(body) })
          .then(function () {
            originalAdvance(name);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      advance.__apiBacked = true;
      window.advanceAdmission = advance;
    }
    if (typeof originalDecline === "function" && !originalDecline.__apiBacked) {
      var decline = function (values) {
        var name = typeof state !== "undefined" && state._admActive;
        var id = adapter.admissionIds && adapter.admissionIds[name];
        if (!id) {
          toast("Not saved — application is not available on the server");
          return false;
        }
        api("/admissions/" + id + "/transition", {
          method: "POST",
          body: JSON.stringify({
            status: "Rejected",
            reason: values.reason,
            outcome: values.outcome,
          }),
        })
          .then(function () {
            originalDecline(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
        return false;
      };
      decline.__apiBacked = true;
      window.saveAdmDecline = decline;
    }
    if (
      typeof originalWaitlist === "function" &&
      !originalWaitlist.__apiBacked
    ) {
      var waitlist = function (name) {
        var id = adapter.admissionIds && adapter.admissionIds[name];
        if (!id) {
          toast("Not saved — application is not available on the server");
          return;
        }
        api("/admissions/" + id + "/transition", {
          method: "POST",
          body: JSON.stringify({ status: "Waitlisted" }),
        })
          .then(function () {
            originalWaitlist(name);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      waitlist.__apiBacked = true;
      window.waitlistAdmission = waitlist;
    }
    if (typeof originalRestore === "function" && !originalRestore.__apiBacked) {
      var restore = function (name) {
        var id = adapter.admissionIds && adapter.admissionIds[name],
          application = row(name);
        var stages = {
            Application: "Applied",
            Assessment: "Shortlisted",
            Interview: "Interviewed",
            Offer: "Accepted",
          },
          target = application && stages[application.previousStage];
        if (!id || !target) {
          toast("Not saved — no saved pipeline stage");
          return;
        }
        api("/admissions/" + id + "/transition", {
          method: "POST",
          body: JSON.stringify({ status: target }),
        })
          .then(function () {
            originalRestore(name);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      restore.__apiBacked = true;
      window.restoreAdmission = restore;
    }
    if (typeof originalMove === "function" && !originalMove.__apiBacked) {
      var move = function (name, stage) {
        var application = row(name),
          id = adapter.admissionIds && adapter.admissionIds[name],
          targets = {
            Application: "Applied",
            Assessment: "Shortlisted",
            Interview: "Interviewed",
            Offer: "Accepted",
            Waitlisted: "Waitlisted",
            Closed: "Rejected",
          },
          status = targets[stage];
        if (!application || !id || (stage !== "Enrolled" && !status)) {
          toast("Not saved — application is not available on the server");
          return;
        }
        var requestPath = "/admissions/" + id + "/transition",
          body = { status: status };
        if (stage === "Enrolled") {
          requestPath = "/admissions/" + id + "/enroll";
          body = {
            refId: nextNum(STUDENTS, "ANS"),
            roll: String(
              STUDENTS.filter(function (s) {
                return s.grade.split(" · ")[0] === application.grade;
              }).length + 1,
            ),
          };
        }
        api(requestPath, { method: "POST", body: JSON.stringify(body) })
          .then(function () {
            originalMove(name, stage);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      move.__apiBacked = true;
      window.moveAdmissionTo = move;
    }
  }

  function installStaffAndLeaveWorkflows() {
    var originalActivate = window.activateStaff;
    if (
      typeof originalActivate === "function" &&
      !originalActivate.__apiBacked
    ) {
      var activate = function (refId) {
        var staff =
          typeof STAFF !== "undefined" &&
          STAFF.find(function (s) {
            return s.id === refId;
          });
        if (!staff) return;
        staffInitDocs(staff);
        if (!staffDocsDone(staff)) {
          toast("Attach all required documents first");
          openDrawer(staffProfile(refId));
          return;
        }
        if (
          staff.onboarding &&
          !staff.onboarding.every(function (task) {
            return task.done;
          })
        ) {
          toast("Complete all onboarding tasks first");
          return;
        }
        var id = adapter.staffIds && adapter.staffIds[staff.name];
        if (!id) {
          toast("Not saved — employee is not available on the server");
          return;
        }
        api("/staff/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status: "Active" }),
        })
          .then(function () {
            originalActivate(refId);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      activate.__apiBacked = true;
      window.activateStaff = activate;
    }

    function staffRow(refId) {
      return (
        typeof STAFF !== "undefined" &&
        STAFF.find(function (staff) {
          return staff.id === refId;
        })
      );
    }
    function uploadStaffDocument(file, refId, key) {
      var staff = staffRow(refId);
      if (!staff || !staff.mongoId) {
        toast("Not saved — employee is not available on the server");
        return;
      }
      var comma = String(file.url || "").indexOf(",");
      var binary = atob(String(file.url || "").slice(comma + 1));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i += 1)
        bytes[i] = binary.charCodeAt(i);
      api("/staff/" + staff.mongoId + "/documents/" + encodeURIComponent(key), {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: bytes,
      })
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(staffProfile(refId));
          toast("Document securely saved · " + file.name);
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
    }
    window.staffDocPick = function (input, refId, key) {
      var file = input.files && input.files[0];
      docReadFile(file, function (stored) {
        uploadStaffDocument(stored, refId, key);
      });
    };
    window.staffDocDrop = function (event, refId, key) {
      event.preventDefault();
      var file =
        event.dataTransfer &&
        event.dataTransfer.files &&
        event.dataTransfer.files[0];
      docReadFile(file, function (stored) {
        uploadStaffDocument(stored, refId, key);
      });
    };
    function getStaffFile(refId, key, action) {
      var staff = staffRow(refId),
        doc = staff && findStaffDoc(refId, key);
      if (!staff || !staff.mongoId || !doc || !doc.file) return;
      apiBlob(
        "/staff/" + staff.mongoId + "/documents/" + encodeURIComponent(key),
      )
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          action({
            name: doc.file.name,
            size: doc.file.size,
            type: doc.file.type,
            url: url,
          });
          setTimeout(function () {
            URL.revokeObjectURL(url);
          }, 60000);
        })
        .catch(function (e) {
          toast("Download failed — " + e.message);
        });
    }
    window.staffDocDownload = function (refId, key) {
      getStaffFile(refId, key, function (file) {
        dlUrl(file.url, file.name);
      });
    };
    window.staffDocView = function (refId, key) {
      getStaffFile(refId, key, docPreview);
    };
    window.staffDocRemove = function (refId, key) {
      var staff = staffRow(refId);
      if (!staff || !staff.mongoId) return;
      api("/staff/" + staff.mongoId + "/documents/" + encodeURIComponent(key), {
        method: "DELETE",
      })
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(staffProfile(refId));
          toast("Document removed");
        })
        .catch(function (e) {
          toast("Not removed — " + e.message);
        });
    };
    window.staffDocMark = function () {
      toast(
        "Paper-only receipt is not stored digitally; upload the verified document",
      );
    };

    window.toggleStaffTask = function (refId, index) {
      var staff = staffRow(refId),
        task = staff && staff.onboarding && staff.onboarding[index];
      if (!staff || !staff.mongoId || !task) return;
      api(
        "/staff/" +
          staff.mongoId +
          "/onboarding/" +
          encodeURIComponent(task.key) +
          "/toggle",
        { method: "POST" },
      )
        .then(function () {
          return hydrate();
        })
        .then(function () {
          openDrawer(staffProfile(refId));
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
    };

    [
      ["approveStaffLeave", "Approved"],
      ["rejectStaffLeave", "Denied"],
    ].forEach(function (entry) {
      var name = entry[0],
        decision = entry[1],
        original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var decide = function (index) {
        var row = typeof LEAVE !== "undefined" && LEAVE[index];
        var id = row && row[6];
        if (!id) {
          toast("Not saved — leave request is not available on the server");
          return;
        }
        api("/leave/" + id + "/decide", {
          method: "POST",
          body: JSON.stringify({ decision: decision }),
        })
          .then(function () {
            original(index);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      decide.__apiBacked = true;
      window[name] = decide;
    });
  }

  function installHostelLeaveWorkflow() {
    [
      ["approveLeave", "approve"],
      ["rejectLeave", "reject"],
      ["returnLeave", "return"],
    ].forEach(function (entry) {
      var name = entry[0],
        action = entry[1],
        original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var transition = function (id) {
        if (!adapter.hostelLeaveIds || !adapter.hostelLeaveIds[id]) {
          toast("Not saved — leave request is not available on the server");
          return;
        }
        api("/hostel/leave/" + id + "/transition", {
          method: "POST",
          body: JSON.stringify({ action: action }),
        })
          .then(function () {
            original(id);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      transition.__apiBacked = true;
      window[name] = transition;
    });
  }

  function installHostelRollCallWorkflow() {
    var originalCycle = window.cycleRoll;
    if (typeof originalCycle === "function" && !originalCycle.__apiBacked) {
      var cycle = function (refId) {
        var boarder =
          typeof BOARDERS !== "undefined" &&
          BOARDERS.find(function (b) {
            return b.id === refId;
          });
        var sid = boarder && studentIdFor(boarder.name);
        if (!boarder || !sid) {
          toast("Not saved — boarder is not available on the server");
          return;
        }
        var order = ["Present", "Late", "On leave", "Absent"];
        var status = order[(order.indexOf(boarder.roll) + 1) % order.length];
        api("/hostel/roll-call", {
          method: "PUT",
          body: JSON.stringify({
            studentId: sid,
            date: new Date().toISOString().slice(0, 10),
            status: status,
          }),
        })
          .then(function () {
            originalCycle(refId);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      cycle.__apiBacked = true;
      window.cycleRoll = cycle;
    }
    var originalAll = window.markAllRoll;
    if (typeof originalAll === "function" && !originalAll.__apiBacked) {
      var markAll = function () {
        api("/hostel/roll-call/all", {
          method: "PUT",
          body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
        })
          .then(function () {
            originalAll();
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      markAll.__apiBacked = true;
      window.markAllRoll = markAll;
    }
  }

  function installHostelMaintenanceWorkflow() {
    var original = window.resolveMaint;
    if (typeof original !== "function" || original.__apiBacked) return;
    var resolve = function (refId) {
      var id =
        adapter.hostelMaintenanceIds && adapter.hostelMaintenanceIds[refId];
      if (!id) {
        toast("Not saved — maintenance request is not available on the server");
        return;
      }
      api("/hostel/maintenance/" + id + "/resolve", { method: "POST" })
        .then(function () {
          original(refId);
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
    };
    resolve.__apiBacked = true;
    window.resolveMaint = resolve;
  }

  function installHostelOverviewWorkflow() {
    if (
      !adapter.live.hostelOverview ||
      typeof baseHostelActivity !== "function"
    )
      return;
    window.hostelActivity = function () {
      var activity = [];
      (adapter.hostelLeaveActivity || []).forEach(function (leave) {
        activity.push({
          t: leave.name + " — " + leave.type,
          sub: leave.room + " · " + leave.status,
          time: leave.from,
          c:
            leave.status === "Returned"
              ? "green"
              : leave.status === "Requested"
                ? "gray"
                : "amber",
          k: "cal",
        });
      });
      (adapter.hostelMaintenanceActivity || []).forEach(function (request) {
        activity.push({
          t: request.issue + " (" + request.room + ")",
          sub: request.priority + " priority · " + request.status,
          time: request.date,
          c:
            request.status === "Resolved"
              ? "green"
              : request.priority === "High"
                ? "red"
                : "amber",
          k: "helpdesk",
        });
      });
      return activity.length ? activity.slice(0, 4) : baseHostelActivity();
    };
  }

  function installBehaviourWorkflow() {
    [
      ["escalateBehaviour", "Escalated"],
      ["closeBehaviourCase", "Closed"],
    ].forEach(function (entry) {
      var name = entry[0],
        status = entry[1],
        original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var update = function (studentName, date) {
        var row =
          typeof BEHAVIOUR !== "undefined" &&
          BEHAVIOUR.find(function (item) {
            return item.name === studentName && item.date === date;
          });
        if (!row || !row.mongoId) {
          toast("Not saved — behaviour entry is not available on the server");
          return;
        }
        api("/behaviour/" + row.mongoId + "/status", {
          method: "PATCH",
          body: JSON.stringify({ status: status }),
        })
          .then(function () {
            original(studentName, date);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      update.__apiBacked = true;
      window[name] = update;
    });
  }

  function installHealthWorkflow() {
    [
      [
        "clinicMarkOutcome",
        function (outcome) {
          return { outcome: outcome };
        },
      ],
      [
        "clinicContactParent",
        function () {
          return { parentContacted: true };
        },
      ],
    ].forEach(function (entry) {
      var name = entry[0],
        payloadFor = entry[1],
        original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var update = function (studentName, time, outcome) {
        var row =
          typeof CLINIC !== "undefined" &&
          CLINIC.find(function (item) {
            return item.name === studentName && item.time === time;
          });
        if (!row || !row.mongoId) {
          toast("Not saved — clinic visit is not available on the server");
          return;
        }
        api("/health-records/" + row.mongoId, {
          method: "PATCH",
          body: JSON.stringify(payloadFor(outcome)),
        })
          .then(function () {
            original.apply(
              null,
              arguments.length
                ? [studentName, time, outcome]
                : [studentName, time],
            );
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      update.__apiBacked = true;
      window[name] = update;
    });
  }

  function installCafeteriaWorkflow() {
    var original = window.posSell;
    if (typeof original !== "function" || original.__apiBacked) return;
    var sell = function (name) {
      var allergy =
        typeof CAFEALG !== "undefined" &&
        CAFEALG.find(function (item) {
          return item.name === name;
        });
      if (allergy) {
        original(name);
        return;
      }
      var sid = studentIdFor(name);
      if (!sid) {
        toast("Not saved — student is not available on the server");
        return;
      }
      api("/cafeteria/wallets/purchase", {
        method: "POST",
        body: JSON.stringify({
          studentId: sid,
          amount: 15,
          description: "Lunch meal",
        }),
      })
        .then(function () {
          original(name);
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
    };
    sell.__apiBacked = true;
    window.posSell = sell;
  }

  function installTimetableWorkflow() {
    var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    function position(cls, ri, di) {
      if (typeof ttData !== "function") return null;
      var timetable = ttData(cls);
      if (
        !timetable ||
        !timetable.rows[ri] ||
        timetable.rows[ri][1][di] === "BREAK"
      )
        return null;
      var periodNumber = 0;
      for (var index = 0; index <= ri; index += 1) {
        if (timetable.rows[index][1][0] !== "BREAK") periodNumber += 1;
      }
      return { grade: cls, dayOfWeek: days[di], periodNumber: periodNumber };
    }

    function slotId(pos) {
      return (
        pos &&
        adapter.timetableIds &&
        adapter.timetableIds[
          pos.grade + "|" + pos.dayOfWeek + "|" + pos.periodNumber
        ]
      );
    }

    function refreshAfter(action) {
      return action
        .then(function () {
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
        })
        .catch(function (e) {
          if (typeof toast === "function") toast("Not saved — " + e.message);
        });
    }

    var originalSave = window.saveTTPeriod;
    if (typeof originalSave === "function" && !originalSave.__apiBacked) {
      var save = function (values) {
        var edit = state._tt || {};
        var pos = position(edit.cls, edit.ri, edit.di);
        if (!pos) {
          toast("Not saved — timetable period is unavailable");
          return false;
        }
        var id = slotId(pos);
        var request;
        if (values.clear === "Free period") {
          if (!id) {
            originalSave(values);
            return false;
          }
          request = api("/timetable/" + id, { method: "DELETE" });
        } else {
          var subject = values.subj || "Mathematics";
          var payload = {
            subject: subject,
            teacherName:
              values.teacher ||
              (typeof SUBJTEACH !== "undefined" && SUBJTEACH[subject]) ||
              "Staff",
            room: values.room || undefined,
            isSubstitute: false,
          };
          if (id)
            request = api("/timetable/" + id, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
          else
            request = api("/timetable", {
              method: "POST",
              body: JSON.stringify(Object.assign({}, pos, payload)),
            });
        }
        refreshAfter(
          request.then(function () {
            originalSave(values);
          }),
        );
        return false;
      };
      save.__apiBacked = true;
      window.saveTTPeriod = save;
    }

    var originalRoom = window.saveTTRoom;
    if (typeof originalRoom === "function" && !originalRoom.__apiBacked) {
      var saveRoom = function (values) {
        var edit = state._ttRoomEdit || {};
        var id = slotId(position(edit.cls, edit.ri, edit.di));
        if (!id) {
          toast("Not saved — timetable period is unavailable on the server");
          return false;
        }
        refreshAfter(
          api("/timetable/" + id, {
            method: "PATCH",
            body: JSON.stringify({ room: values.room }),
          }).then(function () {
            originalRoom(values);
          }),
        );
        return false;
      };
      saveRoom.__apiBacked = true;
      window.saveTTRoom = saveRoom;
    }

    var originalSubstitute = window.assignSub;
    if (
      typeof originalSubstitute === "function" &&
      !originalSubstitute.__apiBacked
    ) {
      var assignSubstitute = function (cls, ri, di) {
        var timetable = ttData(cls);
        var cell = timetable && timetable.rows[ri] && timetable.rows[ri][1][di];
        var id = slotId(position(cls, ri, di));
        if (!id || !cell || cell === "FREE") {
          toast("Not saved — timetable period is unavailable on the server");
          return;
        }
        var parts = cell.split("|");
        var pool = Object.values(SUBJTEACH).filter(function (name) {
          return name !== parts[1].replace(" (sub)", "");
        });
        var substitute = pool[(ri + di) % pool.length];
        refreshAfter(
          api("/timetable/" + id, {
            method: "PATCH",
            body: JSON.stringify({
              teacherName: substitute,
              isSubstitute: true,
            }),
          }).then(function () {
            originalSubstitute(cls, ri, di);
          }),
        );
      };
      assignSubstitute.__apiBacked = true;
      window.assignSub = assignSubstitute;
    }

    var originalPublish = window.publishTT;
    if (typeof originalPublish === "function" && !originalPublish.__apiBacked) {
      var publish = function (cls) {
        refreshAfter(
          api("/timetable/publish", {
            method: "POST",
            body: JSON.stringify({ grade: cls }),
          }).then(function () {
            originalPublish(cls);
          }),
        );
      };
      publish.__apiBacked = true;
      window.publishTT = publish;
    }

    var originalDrop = window.ttDrop;
    if (typeof originalDrop === "function" && !originalDrop.__apiBacked) {
      var drop = function (event, cls, ri, di) {
        event.preventDefault();
        var raw = "";
        try {
          raw = event.dataTransfer.getData("text/plain") || "";
        } catch (e) {
          return;
        }
        var source = raw.split("|");
        if (source.length < 3 || source[0] !== cls) return;
        var sourcePosition = position(cls, +source[1], +source[2]);
        var targetPosition = position(cls, ri, di);
        if (!sourcePosition || !targetPosition) return;
        if (
          sourcePosition.dayOfWeek === targetPosition.dayOfWeek &&
          sourcePosition.periodNumber === targetPosition.periodNumber
        )
          return;
        var replay = {
          preventDefault: function () {},
          dataTransfer: {
            getData: function () {
              return raw;
            },
          },
        };
        refreshAfter(
          api("/timetable/swap", {
            method: "POST",
            body: JSON.stringify({
              grade: cls,
              source: sourcePosition,
              target: targetPosition,
            }),
          }).then(function () {
            originalDrop(replay, cls, ri, di);
          }),
        );
      };
      drop.__apiBacked = true;
      window.ttDrop = drop;
    }
  }

  function installCurriculumWorkflow() {
    function unit(subject, title) {
      return (
        typeof CURRIC_UNITS !== "undefined" &&
        CURRIC_UNITS.find(function (row) {
          return row.subject === subject && row.title === title;
        })
      );
    }
    [
      [
        "markUnitDone",
        function () {
          return new Date().toISOString().slice(0, 10);
        },
      ],
      [
        "markUnitPlanned",
        function () {
          return null;
        },
      ],
    ].forEach(function (entry) {
      var name = entry[0],
        original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var wrapped = function (subject, title) {
        var row = unit(subject, title);
        if (!row || !row.mongoId) {
          toast("Not saved — curriculum unit is not available on the server");
          return;
        }
        return api("/curriculum/" + row.mongoId, {
          method: "PATCH",
          body: JSON.stringify({ completedDate: entry[1]() }),
        })
          .then(function () {
            original(subject, title);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (error) {
            toast("Not saved — " + error.message);
          });
      };
      wrapped.__apiBacked = true;
      window[name] = wrapped;
    });
  }

  function installLmsWorkflow() {
    var original = window.saveAssignment;
    if (typeof original !== "function" || original.__apiBacked) return;
    var saveAssignment = function (v) {
      var c =
        typeof COURSES !== "undefined" &&
        COURSES.find(function (row) {
          return row.t === state._lmsCourse;
        });
      if (!c) {
        toast("Not saved — course is not available");
        return false;
      }
      if (!v.due) {
        toast("Not saved — due date is required");
        return false;
      }
      var m = String(c.cls || "").match(/^(\d+)-([A-Za-z]+)$/),
        grade = m ? "Grade " + m[1] + " · " + m[2] : String(c.cls || "").trim();
      if (!grade) {
        toast("Not saved — course class is required");
        return false;
      }
      api("/lms/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: String(v.title || "").trim(),
          description: "Published from the existing LMS assignment workflow.",
          subject: c.t,
          grade: grade,
          dueDate: v.due,
          maxScore: 100,
        }),
      })
        .then(function () {
          return hydrate();
        })
        .then(function () {
          original(v);
        })
        .catch(function (e) {
          toast("Not saved — " + e.message);
        });
      return false;
    };
    saveAssignment.__apiBacked = true;
    window.saveAssignment = saveAssignment;
  }
  function installTransportWorkflow() {
    function route(name) {
      return (
        typeof ROUTES !== "undefined" &&
        ROUTES.find(function (row) {
          return row.r === name;
        })
      );
    }
    var originalDelay = window.toggleRouteDelay;
    if (typeof originalDelay === "function" && !originalDelay.__apiBacked) {
      var delay = function (name) {
        var row = route(name);
        if (!row || !row.mongoId) {
          toast("Not saved — route is not available on the server");
          return;
        }
        var status = row.status === "Delayed" ? "On road" : "Delayed";
        api("/transport/routes/" + row.mongoId + "/operational-status", {
          method: "PATCH",
          body: JSON.stringify({ status: status }),
        })
          .then(function () {
            originalDelay(name);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      delay.__apiBacked = true;
      window.toggleRouteDelay = delay;
    }
    var originalMaintenance = window.scheduleMaintenance;
    if (
      typeof originalMaintenance === "function" &&
      !originalMaintenance.__apiBacked
    ) {
      var maintenance = function (plate) {
        var id = adapter.vehicleIds && adapter.vehicleIds[plate];
        if (!id) {
          toast("Not saved — vehicle is not available on the server");
          return;
        }
        api("/transport/vehicles/" + id + "/maintenance", {
          method: "PATCH",
          body: JSON.stringify({ status: "Maintenance" }),
        })
          .then(function () {
            originalMaintenance(plate);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
      };
      maintenance.__apiBacked = true;
      window.scheduleMaintenance = maintenance;
    }
    var originalIncident = window.saveTransportIncident;
    if (
      typeof originalIncident === "function" &&
      !originalIncident.__apiBacked
    ) {
      var incident = function (values) {
        var name = typeof state !== "undefined" && state._transRoute,
          row = route(name);
        if (!row || !row.mongoId) {
          toast("Not saved — route is not available on the server");
          return false;
        }
        api("/transport/routes/" + row.mongoId + "/incidents", {
          method: "POST",
          body: JSON.stringify({
            type: values.type,
            severity: values.severity || "Minor",
            location: values.location || undefined,
            description: values.desc,
          }),
        })
          .then(function () {
            originalIncident(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            toast("Not saved — " + e.message);
          });
        return false;
      };
      incident.__apiBacked = true;
      window.saveTransportIncident = incident;
    }
  }

  function installAttendanceWorkflow() {
    var originalSubmit = window.submitRegister;
    if (typeof originalSubmit === "function" && !originalSubmit.__apiBacked) {
      var submit = function () {
        var rows = document.querySelectorAll(".seg2[data-i]");
        var entries = [];
        rows.forEach(function (row) {
          var index = parseInt(row.getAttribute("data-i"), 10);
          var student =
            typeof STUDENTS !== "undefined" ? STUDENTS[index] : null;
          var studentId = student && student.mongoId;
          if (!studentId) return;
          var status = row.querySelector(".A.on")
            ? "Absent"
            : row.querySelector(".L.on")
              ? "Late"
              : row.querySelector(".E.on")
                ? "Excused"
                : "Present";
          entries.push({ studentId: studentId, status: status });
        });

        if (!entries.length || entries.length !== rows.length) {
          if (typeof toast === "function")
            toast(
              "Not saved - one or more students are not available on the server",
            );
          return false;
        }

        api("/attendance/mark", {
          method: "PUT",
          body: JSON.stringify({
            date: state.attDate || new Date().toISOString().slice(0, 10),
            session: state.attSession === "PM" ? "PM" : "AM",
            entries: entries,
          }),
        })
          .then(function () {
            originalSubmit();
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
            console.info("[SchoolOS] attendance register -> saved to server");
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };

      submit.__apiBacked = true;
      window.submitRegister = submit;
    }

    var originalMarkMine = window.markMyAttendance;
    if (
      typeof originalMarkMine === "function" &&
      !originalMarkMine.__apiBacked
    ) {
      var markMine = function (status) {
        api("/attendance/staff/me", {
          method: "PUT",
          body: JSON.stringify({
            status: status,
            date: new Date().toISOString().slice(0, 10),
          }),
        })
          .then(function () {
            originalMarkMine(status);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
            console.info("[SchoolOS] staff attendance -> saved to server");
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      markMine.__apiBacked = true;
      window.markMyAttendance = markMine;
    }

    [
      ["cancelAbsenceRequest", "cancel"],
      ["approveAbsence", "Approved"],
      ["rejectAbsence", "Rejected"],
    ].forEach(function (entry) {
      var name = entry[0],
        decision = entry[1],
        original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var wrapped = function (index) {
        var row =
          typeof ABSENCE_REQUESTS !== "undefined" && ABSENCE_REQUESTS[index];
        if (!row || !row.requestId) {
          toast("Not saved - absence request is not available on the server");
          return false;
        }
        var path =
          "/attendance/absence-requests/" +
          row.requestId +
          (decision === "cancel" ? "/cancel" : "/decision");
        var body =
          decision === "cancel"
            ? undefined
            : JSON.stringify({ decision: decision });
        api(path, { method: "POST", body: body })
          .then(function () {
            original(index);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      wrapped.__apiBacked = true;
      window[name] = wrapped;
    });
  }

  function installFeesWorkflow() {
    var originalCollect = window.collectFee;
    if (typeof originalCollect === "function" && !originalCollect.__apiBacked) {
      var collect = function (refId) {
        var invoice =
          typeof INVOICES !== "undefined" &&
          INVOICES.find(function (i) {
            return i.id === refId;
          });
        var id =
          invoice &&
          ((adapter.invoiceIdsByRef && adapter.invoiceIdsByRef[refId]) ||
            invoice.mongoId);
        if (!id) {
          toast("Not saved - invoice is not available on the server");
          return false;
        }
        api("/fees/" + id + "/pay", {
          method: "POST",
          body: JSON.stringify({
            paymentMethod: "Cash",
            amount: invoice.balance || invoice.amt,
            reference: "Collected from invoice action",
          }),
        })
          .then(function () {
            originalCollect(refId);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      collect.__apiBacked = true;
      window.collectFee = collect;
    }

    var originalOne = window.sendFeeReminderOne;
    if (typeof originalOne === "function" && !originalOne.__apiBacked) {
      var remindOne = function (refId) {
        var invoice =
          typeof INVOICES !== "undefined" &&
          INVOICES.find(function (i) {
            return i.id === refId;
          });
        var id =
          invoice &&
          ((adapter.invoiceIdsByRef && adapter.invoiceIdsByRef[refId]) ||
            invoice.mongoId);
        if (!id) {
          toast("Not sent - invoice is not available on the server");
          return false;
        }
        api("/fees/reminders", {
          method: "POST",
          body: JSON.stringify({ invoiceIds: [id] }),
        })
          .then(function (res) {
            originalOne(refId);
            return hydrate().then(function () {
              return res;
            });
          })
          .then(function (res) {
            if (typeof toast === "function")
              toast(
                "Reminder sent: " +
                  res.data.sent +
                  " sent, " +
                  res.data.skipped +
                  " skipped",
              );
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not sent - " + e.message);
          });
        return false;
      };
      remindOne.__apiBacked = true;
      window.sendFeeReminderOne = remindOne;
    }

    var originalAll = window.sendFeeReminders;
    if (typeof originalAll === "function" && !originalAll.__apiBacked) {
      var remindAll = function () {
        api("/fees/reminders", { method: "POST", body: JSON.stringify({}) })
          .then(function (res) {
            originalAll();
            return hydrate().then(function () {
              return res;
            });
          })
          .then(function (res) {
            if (typeof toast === "function")
              toast(
                "Reminders processed: " +
                  res.data.sent +
                  " sent, " +
                  res.data.skipped +
                  " skipped",
              );
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not sent - " + e.message);
          });
        return false;
      };
      remindAll.__apiBacked = true;
      window.sendFeeReminders = remindAll;
    }
  }

  function installExamWorkflow() {
    var originalEnterMarks = window.enterMarks;
    var originalAddSubject = window.addExamSubject;
    var originalRemoveSubject = window.removeExamSubject;
    var originalLockScheme = window.lockScheme;
    var originalUnlockScheme = window.unlockScheme;
    var originalShareResult = window.shareResultWithGuardian;
    var originalGenerateReportCards = window.genReportCards;

    if (
      typeof originalEnterMarks === "function" &&
      !originalEnterMarks.__apiBacked
    ) {
      var enterMarks = function (values) {
        var name = ((values && values.student) || "").trim();
        var studentId = adapter.studentIds && adapter.studentIds[name];
        if (!adapter.examId || !studentId) {
          if (typeof toast === "function")
            toast("Not saved - exam or student is not available on the server");
          return false;
        }
        var subjects = (adapter.exam && adapter.exam.subjects) || [];
        var scores = subjects.map(function (subject) {
          return {
            subject: subject,
            marks: Number(values[subjKey(subject)] || 0),
          };
        });
        api("/exams/results", {
          method: "POST",
          body: JSON.stringify({
            examId: adapter.examId,
            studentId: studentId,
            scores: scores,
          }),
        })
          .then(function () {
            originalEnterMarks(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      enterMarks.__apiBacked = true;
      window.enterMarks = enterMarks;
    }

    if (
      typeof originalAddSubject === "function" &&
      !originalAddSubject.__apiBacked
    ) {
      var addSubject = function (values) {
        var subject = ((values && values.new_subject) || "").trim();
        if (!adapter.examId || !subject) return originalAddSubject(values);
        api("/exams/" + adapter.examId + "/subjects", {
          method: "POST",
          body: JSON.stringify({ subject: subject }),
        })
          .then(function () {
            originalAddSubject(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      addSubject.__apiBacked = true;
      window.addExamSubject = addSubject;
    }

    if (
      typeof originalRemoveSubject === "function" &&
      !originalRemoveSubject.__apiBacked
    ) {
      var removeSubject = function (subject) {
        if (!adapter.examId) {
          if (typeof toast === "function")
            toast("Not saved - exam is not available on the server");
          return;
        }
        api(
          "/exams/" +
            adapter.examId +
            "/subjects/" +
            encodeURIComponent(subject),
          { method: "DELETE" },
        )
          .then(function () {
            originalRemoveSubject(subject);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
      };
      removeSubject.__apiBacked = true;
      window.removeExamSubject = removeSubject;
    }

    if (
      typeof originalLockScheme === "function" &&
      !originalLockScheme.__apiBacked
    ) {
      var lockScheme = function () {
        if (!adapter.examId) {
          if (typeof toast === "function")
            toast("Exam is not available on the server");
          return;
        }
        api("/exams/" + adapter.examId + "/publish", { method: "POST" })
          .then(function (res) {
            originalLockScheme();
            return hydrate().then(function () {
              return res;
            });
          })
          .then(function (res) {
            if (typeof toast === "function")
              toast(
                "Marks locked and published" +
                  (res.data.notified
                    ? " — " +
                      res.data.notified +
                      " guardian notification(s) sent"
                    : ""),
              );
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function")
              toast("Not published - " + e.message);
          });
      };
      lockScheme.__apiBacked = true;
      window.lockScheme = lockScheme;
    }

    if (
      typeof originalUnlockScheme === "function" &&
      !originalUnlockScheme.__apiBacked
    ) {
      var unlockScheme = function () {
        if (!adapter.examId) {
          if (typeof toast === "function")
            toast("Exam is not available on the server");
          return;
        }
        api("/exams/" + adapter.examId + "/reopen", { method: "POST" })
          .then(function () {
            originalUnlockScheme();
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function")
              toast("Not reopened - " + e.message);
          });
      };
      unlockScheme.__apiBacked = true;
      window.unlockScheme = unlockScheme;
    }

    if (
      typeof originalShareResult === "function" &&
      !originalShareResult.__apiBacked
    ) {
      var shareResult = function (name) {
        var studentId = adapter.studentIds && adapter.studentIds[name];
        if (!adapter.examId || !studentId) {
          if (typeof toast === "function")
            toast("Result or student is not available on the server");
          return;
        }
        api(
          "/exams/" +
            adapter.examId +
            "/results/" +
            encodeURIComponent(studentId) +
            "/notify",
          { method: "POST" },
        )
          .then(function () {
            originalShareResult(name);
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not shared - " + e.message);
          });
      };
      shareResult.__apiBacked = true;
      window.shareResultWithGuardian = shareResult;
    }

    if (
      typeof originalGenerateReportCards === "function" &&
      !originalGenerateReportCards.__apiBacked
    ) {
      var generateReportCards = function (values) {
        if (!adapter.examId) {
          if (typeof toast === "function")
            toast("Exam is not available on the server");
          return false;
        }
        var cls = (values && values.cls) || "All classes";
        var payload = cls === "All classes" ? {} : { grade: cls };
        api("/exams/" + adapter.examId + "/report-cards", {
          method: "POST",
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            return hydrate().then(function () {
              return res;
            });
          })
          .then(function (res) {
            if (typeof closeDrawer === "function") closeDrawer();
            if (typeof render === "function") render();
            if (typeof toast === "function")
              toast(
                res.data.generated +
                  " report card(s) generated" +
                  (res.data.alreadyExisted
                    ? "; " + res.data.alreadyExisted + " already existed"
                    : ""),
              );
          })
          .catch(function (e) {
            if (typeof toast === "function")
              toast("Not generated - " + e.message);
          });
        return false;
      };
      generateReportCards.__apiBacked = true;
      window.genReportCards = generateReportCards;
    }
  }

  function installPayrollWorkflow() {
    var originalRun = window.runPayroll;
    if (typeof originalRun !== "function" || originalRun.__apiBacked) return;

    var run = function () {
      var month =
        (typeof PAYRUN !== "undefined" && PAYRUN[0] && PAYRUN[0].month) ||
        new Date().toISOString().slice(0, 7);
      var missing = [];
      var requests = (typeof PAYRUN !== "undefined" ? PAYRUN : [])
        .filter(function (row) {
          return row.status !== "Paid" && (!row.month || row.month === month);
        })
        .map(function (row) {
          var staffId = adapter.staffIds && adapter.staffIds[row.name];
          if (!staffId) {
            missing.push(row.name);
            return null;
          }
          return api("/payroll", {
            method: "POST",
            body: JSON.stringify({
              staffId: staffId,
              month: month,
              basicSalary: Number(row.gross || 0),
              allowances: 0,
              deductions: Number(row.ded || 0),
            }),
          });
        })
        .filter(Boolean);

      if (missing.length || !requests.length) {
        if (typeof toast === "function")
          toast("Not saved - payroll staff must exist on the server first");
        return false;
      }

      Promise.all(requests)
        .then(function () {
          originalRun();
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
          console.info("[SchoolOS] payroll run -> saved to server");
        })
        .catch(function (e) {
          if (typeof toast === "function") toast("Not saved - " + e.message);
        });
      return false;
    };

    run.__apiBacked = true;
    window.runPayroll = run;
  }

  function installInventoryWorkflow() {
    [
      ["sendPO", "send"],
      ["receivePO", "receive"],
      ["cancelPO", "cancel"],
    ].forEach(function (entry) {
      var name = entry[0];
      var transition = entry[1];
      var original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;

      var wrapped = function (refId) {
        var id = adapter.purchaseOrderIds && adapter.purchaseOrderIds[refId];
        if (!id) {
          if (typeof toast === "function")
            toast("Not saved - purchase order is not available on the server");
          return;
        }
        api("/inventory/purchase-orders/" + id + "/" + transition, {
          method: "POST",
        })
          .then(function () {
            original(refId);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
      };
      wrapped.__apiBacked = true;
      window[name] = wrapped;
    });

    var originalAdjustment = window.saveStockAdjustment;
    if (
      typeof originalAdjustment === "function" &&
      !originalAdjustment.__apiBacked
    ) {
      var saveStockAdjustment = function (values) {
        var item =
          typeof INVENTORY !== "undefined" &&
          INVENTORY.find(function (row) {
            return row.item === state._invAdjItem;
          });
        var quantityDelta = parseInt(values.qty, 10);
        if (!item || !item.mongoId) {
          if (typeof toast === "function")
            toast("Not saved - inventory item is not available on the server");
          return false;
        }
        if (!quantityDelta) {
          if (typeof toast === "function") toast("Enter a non-zero quantity");
          return false;
        }
        api("/inventory/items/" + item.mongoId + "/adjust", {
          method: "POST",
          body: JSON.stringify({
            quantityDelta: quantityDelta,
            type: values.type || "Adjustment",
            note: values.note || undefined,
          }),
        })
          .then(function () {
            originalAdjustment(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      saveStockAdjustment.__apiBacked = true;
      window.saveStockAdjustment = saveStockAdjustment;
    }
  }

  function installLibraryWorkflow() {
    var originalReturn = window.returnBook;
    if (typeof originalReturn !== "function" || originalReturn.__apiBacked)
      return;

    var returnBook = function (title, borrower) {
      var id = adapter.loanIds && adapter.loanIds[title + "::" + borrower];
      if (!id) {
        if (typeof toast === "function")
          toast("Not saved - loan is not available on the server");
        return;
      }
      api("/library/loans/" + id + "/return", { method: "POST" })
        .then(function () {
          originalReturn(title, borrower);
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
        })
        .catch(function (e) {
          if (typeof toast === "function") toast("Not saved - " + e.message);
        });
    };
    returnBook.__apiBacked = true;
    window.returnBook = returnBook;

    var originalRequest = window.submitBookRequest;
    if (typeof originalRequest === "function") {
      var submitBookRequest = function (values) {
        var title = String(values.title || "")
          .split(" (")[0]
          .trim();
        var bookId = adapter.bookIds && adapter.bookIds[title];
        if (!bookId) {
          if (typeof toast === "function")
            toast("Not saved - book is not available on the server");
          return false;
        }
        api("/library/requests", {
          method: "POST",
          body: JSON.stringify({
            bookId: bookId,
            note: values.note || undefined,
          }),
        })
          .then(function () {
            originalRequest(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      submitBookRequest.__apiBacked = true;
      window.submitBookRequest = submitBookRequest;
    }

    var originalFulfill = window.fulfillBookRequest;
    if (typeof originalFulfill === "function") {
      var fulfillBookRequest = function (index) {
        var row = typeof LIBREQUESTS !== "undefined" && LIBREQUESTS[index];
        if (!row || !row.id) {
          if (typeof toast === "function")
            toast("Not saved - request is not available on the server");
          return;
        }
        api("/library/requests/" + row.id + "/fulfill", { method: "POST" })
          .then(function () {
            originalFulfill(index);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
      };
      fulfillBookRequest.__apiBacked = true;
      window.fulfillBookRequest = fulfillBookRequest;
    }

    function sendReminders(loans) {
      var ids = loans
        .map(function (loan) {
          return loan.id;
        })
        .filter(Boolean);
      if (!ids.length) {
        if (typeof toast === "function")
          toast("No server-backed overdue loans to notify");
        return;
      }
      api("/library/reminders", {
        method: "POST",
        body: JSON.stringify({ loanIds: ids }),
      })
        .then(function (res) {
          if (typeof closeDrawer === "function") closeDrawer();
          var result = res.data || {};
          var message =
            (result.sent || 0) +
            " portal reminder" +
            ((result.sent || 0) === 1 ? "" : "s") +
            " sent";
          if (result.skipped)
            message +=
              "; " +
              result.skipped +
              " recipient" +
              (result.skipped === 1 ? "" : "s") +
              " need a linked portal account";
          if (typeof toast === "function") toast(message);
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
        })
        .catch(function (e) {
          if (typeof toast === "function") toast("Not sent - " + e.message);
        });
    }
    window.notifyAllOverdue = function () {
      sendReminders(
        (typeof LIBLOANS === "undefined" ? [] : LIBLOANS).filter(
          function (loan) {
            return loan.status === "Overdue";
          },
        ),
      );
    };
    window.notifyByDueDate = function (due) {
      sendReminders(
        (typeof LIBLOANS === "undefined" ? [] : LIBLOANS).filter(
          function (loan) {
            return loan.status === "Overdue" && loan.due === due;
          },
        ),
      );
    };
    window.notifyOneOverdue = function (title, borrower) {
      sendReminders(
        (typeof LIBLOANS === "undefined" ? [] : LIBLOANS)
          .filter(function (loan) {
            return (
              loan.status === "Overdue" &&
              loan.title === title &&
              loan.borrower === borrower
            );
          })
          .slice(0, 1),
      );
    };
  }

  function installVisitorWorkflow() {
    var originalCheckOut = window.checkOutVisitor;
    if (typeof originalCheckOut !== "function" || originalCheckOut.__apiBacked)
      return;

    var checkOut = function (name) {
      var visitor =
        typeof VISITORS !== "undefined" &&
        VISITORS.find(function (row) {
          return row.name === name && row.status === "On-site";
        });
      if (!visitor || !visitor.id) {
        if (typeof toast === "function")
          toast("Not saved - active visitor is not available on the server");
        return;
      }
      api("/visitors/" + visitor.id + "/checkout", { method: "POST" })
        .then(function () {
          originalCheckOut(name);
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
        })
        .catch(function (e) {
          if (typeof toast === "function") toast("Not saved - " + e.message);
        });
    };
    checkOut.__apiBacked = true;
    window.checkOutVisitor = checkOut;
  }

  function installBiometricWorkflow() {
    function syncDevice(loc, original) {
      var device =
        typeof BIODEVICES !== "undefined" &&
        BIODEVICES.find(function (row) {
          return row.loc === loc;
        });
      if (!device || !device.id) {
        if (typeof toast === "function")
          toast("Not saved - device is not available on the server");
        return;
      }
      api("/biometric/" + device.id + "/sync", { method: "POST" })
        .then(function () {
          original(loc);
          return hydrate();
        })
        .then(function () {
          if (typeof render === "function") render();
        })
        .catch(function (e) {
          if (typeof toast === "function") toast("Not saved - " + e.message);
        });
    }

    [["syncOneDevice"], ["reconnectDevice"]].forEach(function (entry) {
      var name = entry[0];
      var original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var wrapped = function (loc) {
        syncDevice(loc, original);
      };
      wrapped.__apiBacked = true;
      window[name] = wrapped;
    });

    var originalSyncAll = window.syncBio;
    if (typeof originalSyncAll === "function" && !originalSyncAll.__apiBacked) {
      var syncAll = function () {
        var devices = typeof BIODEVICES !== "undefined" ? BIODEVICES : [];
        if (
          !devices.length ||
          devices.some(function (device) {
            return !device.id;
          })
        ) {
          if (typeof toast === "function")
            toast("Not saved - all devices must be available on the server");
          return;
        }
        Promise.all(
          devices.map(function (device) {
            return api("/biometric/" + device.id + "/sync", { method: "POST" });
          }),
        )
          .then(function () {
            originalSyncAll();
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
      };
      syncAll.__apiBacked = true;
      window.syncBio = syncAll;
    }
  }

  function installHelpdeskWorkflow() {
    var originalAssign = window.saveTicketAssign;
    if (typeof originalAssign === "function" && !originalAssign.__apiBacked) {
      var assign = function (values) {
        var ticket =
          typeof TICKETS !== "undefined" &&
          TICKETS.find(function (row) {
            return row.id === state._ticketAssign;
          });
        var staffId =
          adapter.staffIds && adapter.staffIds[values && values.assignee];
        if (!ticket || !ticket.mongoId || !staffId) {
          if (typeof toast === "function")
            toast(
              "Not saved - ticket or assignee is not available on the server",
            );
          return false;
        }
        api("/helpdesk/" + ticket.mongoId + "/transition", {
          method: "POST",
          body: JSON.stringify({ status: "Assigned", assignedTo: staffId }),
        })
          .then(function () {
            originalAssign(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      assign.__apiBacked = true;
      window.saveTicketAssign = assign;
    }

    var originalAdvance = window.advanceTicket;
    if (typeof originalAdvance === "function" && !originalAdvance.__apiBacked) {
      var advance = function (refId) {
        var ticket =
          typeof TICKETS !== "undefined" &&
          TICKETS.find(function (row) {
            return row.id === refId;
          });
        if (!ticket || !ticket.mongoId) {
          if (typeof toast === "function")
            toast("Not saved - ticket is not available on the server");
          return;
        }
        if (ticket.status === "Open") {
          if (typeof toast === "function")
            toast("Assign the ticket before starting work");
          return;
        }
        var next = ticket.status === "In progress" ? "Resolved" : null;
        if (!next) return;
        api("/helpdesk/" + ticket.mongoId + "/transition", {
          method: "POST",
          body: JSON.stringify({
            status: next,
            resolutionNotes: "Resolved via SchoolOS helpdesk",
          }),
        })
          .then(function () {
            originalAdvance(refId);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
      };
      advance.__apiBacked = true;
      window.advanceTicket = advance;
    }

    var originalReopen = window.reopenTicket;
    if (typeof originalReopen === "function" && !originalReopen.__apiBacked) {
      var reopen = function (refId) {
        var ticket =
          typeof TICKETS !== "undefined" &&
          TICKETS.find(function (row) {
            return row.id === refId;
          });
        if (!ticket || !ticket.mongoId) {
          if (typeof toast === "function")
            toast("Not saved - ticket is not available on the server");
          return;
        }
        api("/helpdesk/" + ticket.mongoId + "/transition", {
          method: "POST",
          body: JSON.stringify({ status: "Assigned" }),
        })
          .then(function () {
            originalReopen(refId);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
      };
      reopen.__apiBacked = true;
      window.reopenTicket = reopen;
    }
  }

  function installSurveyWorkflow() {
    var originalCreate = window.createSurvey;
    if (typeof originalCreate === "function" && !originalCreate.__apiBacked) {
      var createSurvey = function (values) {
        var qs = String((values && values.questions) || "")
          .split(/\n+/)
          .map(function (q) {
            return q.trim();
          })
          .filter(Boolean);
        var questions = qs.map(function (question) {
          return {
            questionText: question.slice(0, 300),
            options: ["Strongly agree", "Agree", "Disagree"],
          };
        });
        if (!questions.length)
          questions = [
            {
              questionText: "Overall satisfaction",
              options: ["Satisfied", "Neutral", "Unsatisfied"],
            },
          ];
        var payload = {
          title: String((values && values.title) || "").trim(),
          description:
            ((values && values.type) || "Survey") +
            " for " +
            ((values && values.audtype) || "all"),
          questions: questions,
        };
        if (
          values &&
          values.sendplan === "Schedule for later" &&
          values.schedDate
        )
          payload.scheduledAt = values.schedDate;
        api("/surveys", { method: "POST", body: JSON.stringify(payload) })
          .then(function (result) {
            if (values && values.sendplan === "Send immediately") {
              return api("/surveys/" + result.data._id + "/activate", {
                method: "POST",
              });
            }
            return result;
          })
          .then(function () {
            originalCreate(values);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
        return false;
      };
      createSurvey.__apiBacked = true;
      window.createSurvey = createSurvey;
    }

    [
      ["launchSurvey", "activate"],
      ["closeSurvey", "close"],
    ].forEach(function (entry) {
      var name = entry[0];
      var action = entry[1];
      var original = window[name];
      if (typeof original !== "function" || original.__apiBacked) return;
      var wrapped = function (title) {
        var survey =
          typeof SURVEYS !== "undefined" &&
          SURVEYS.find(function (row) {
            return row.title === title;
          });
        if (!survey || !survey.id) {
          if (typeof toast === "function")
            toast("Not saved - survey is not available on the server");
          return;
        }
        api("/surveys/" + survey.id + "/" + action, { method: "POST" })
          .then(function () {
            original(title);
            return hydrate();
          })
          .then(function () {
            if (typeof render === "function") render();
          })
          .catch(function (e) {
            if (typeof toast === "function") toast("Not saved - " + e.message);
          });
      };
      wrapped.__apiBacked = true;
      window[name] = wrapped;
    });
  }

  Promise.resolve()
    .then(function () {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      adapter.token = saved.accessToken;
      adapter.refreshToken = saved.refreshToken;
      adapter.user = saved.user;
      return withTimeout(api("/auth/me"), 3000);
    })
    .then(function (res) {
      if (!res) return null;
      adapter.user = res.data.user;
      saveSession();
      return hydrate();
    })
      .then(function () {
        if (!adapter.user) return;
        syncReactSession();
        adapter.connected = true;
      installSettingsWorkflow();
      installAuditWorkflow();
      installWriteThrough();
      installAnnouncementWorkflow();
      installStudentDocuments();
      installAdmissionWorkflow();
      installStaffAndLeaveWorkflows();
      installAttendanceWorkflow();
      installExamWorkflow();
      installPayrollWorkflow();
      installTransportWorkflow();
      installInventoryWorkflow();
      installLibraryWorkflow();
      installVisitorWorkflow();
      installBiometricWorkflow();
      installHelpdeskWorkflow();
      installSurveyWorkflow();
      installHostelLeaveWorkflow();
      installHostelRollCallWorkflow();
      installHostelMaintenanceWorkflow();
      installHostelOverviewWorkflow();
      installBehaviourWorkflow();
      installHealthWorkflow();
      installCafeteriaWorkflow();
      installTimetableWorkflow();
      installCurriculumWorkflow();
      enterAuthenticatedApp();
    })
    .catch(function (e) {
      clearSession();
      if (typeof baseLockApp === "function") baseLockApp();
      setLoginBusy(
        false,
        e.message || "Unable to restore your session. Please sign in again.",
      );
    });
})();

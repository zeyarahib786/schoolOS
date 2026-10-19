/* Fees: persisted invoices, exact balances and explicit manual collection. */
function feeManager() {
  return ["Administrator", "Principal", "Accountant"].includes(state.role);
}
function feeAllowed() {
  return feeManager() || ["Parent", "Student"].includes(state.role);
}
function feeMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(typeof schoolLocale==='function'?schoolLocale():"en-GB", {
      style: "currency",
      currency: currency || SCHOOLOS_ADAPTER.settings?.currency || "AED",
    }).format(amount);
  } catch (e) {
    return String(amount) + " " + String(currency || "");
  }
}
function feeTotals(rows, key) {
  const currencies = [
    ...new Set(
      rows.map(
        (r) => r.currency || SCHOOLOS_ADAPTER.settings?.currency || "AED",
      ),
    ),
  ];
  return (
    currencies.length
      ? currencies
      : [SCHOOLOS_ADAPTER.settings?.currency || "AED"]
  )
    .map((c) =>
      feeMoney(
        feeSum(
          rows.filter(
            (r) =>
              (r.currency || SCHOOLOS_ADAPTER.settings?.currency || "AED") ===
              c,
          ),
          key,
        ),
        c,
      ),
    )
    .join(" · ");
}
function feeSum(rows, key) {
  return (
    rows.reduce((n, r) => n + Math.round(Number(r[key] || 0) * 100), 0) / 100
  );
}
function feeFilters() {
  return (
    state.feeFilters ||
    (state.feeFilters = { q: "", status: "", student: "", page: 1 })
  );
}
function feeSetFilter(key, value) {
  feeFilters()[key] = value;
  feeFilters().page = 1;
  feeRenderRows();
}
function feeRows() {
  const f = feeFilters();
  return INVOICES.filter(
    (i) =>
      (!f.status || i.status === f.status) &&
      (!f.student || i.studentId === f.student) &&
      [i.id, i.student, i.studentRef, i.term]
        .join(" ")
        .toLowerCase()
        .includes(f.q.toLowerCase()),
  ).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}
function feeStudentOptions() {
  return [
    ...new Map(
      INVOICES.map((i) => [
        i.studentId,
        { id: i.studentId, name: i.student, ref: i.studentRef },
      ]),
    ).values(),
  ];
}
M.fees = () => {
  if (!feeAllowed())
    return '<div class="card pad">Fees access is restricted to finance staff and linked families.</div>';
  const rows = feeRows(),
    tab = getSubTab("fees-v", "invoices");
  return `<div class="page-head"><div class="ph-l"><h2>${feeManager() ? "Fees & Invoicing" : "My family fees"}</h2><p>Saved invoices, outstanding balances and recorded receipts. Recording a payment documents money already received; it does not charge a bank or card.</p></div><div class="ph-r"><button class="btn" onclick="feeExport()">Export invoices</button>${feeManager() ? '<button class="btn" onclick="feeInvoiceForm()">New invoice</button><button class="btn primary" onclick="recordPaymentForm()">Record payment</button>' : ""}</div></div><div class="grid cols-4 finance-kpis" style="margin-bottom:16px">${kpi("fees", "#17A24A", "Billed", feeTotals(rows, "amt"), null)}${kpi("fees", "#17A24A", "Collected", feeTotals(rows, "paid"), null)}${kpi("fees", "#E2920C", "Outstanding", feeTotals(rows, "balance"), null)}${kpi(
    "fees",
    "#E11D2A",
    "Overdue",
    feeTotals(
      rows.filter((i) => i.status === "Overdue"),
      "balance",
    ),
    null,
  )}</div>${subTabs("fees-v", [["invoices", "Invoices", "fees"], ["collections", "Receipts & collections", "cert"], ...(feeManager() ? [["structure", "Fee structure", "reports"]] : [])])}${tab === "structure" && feeManager() ? feeStructure() : feeControls() + (tab === "collections" ? feeCollections() : feeInvoices())}`;
};
function feeControls() {
  const f = feeFilters();
  return `<div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:10px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:160px"><input id="feeSearch" aria-label="Search fees" value="${studentEscape(f.q)}" placeholder="Invoice, student or description" oninput="feeSetFilter('q',this.value)"></div><div class="field sel"><select aria-label="Invoice status" onchange="feeSetFilter('status',this.value)">${["", "Due", "Overdue", "Paid"].map((v) => `<option value="${v}" ${f.status === v ? "selected" : ""}>${v || "All statuses"}</option>`).join("")}</select></div><div class="field sel"><select aria-label="Fee student" onchange="feeSetFilter('student',this.value)"><option value="">All visible students</option>${feeStudentOptions()
    .map(
      (s) =>
        `<option value="${s.id}" ${f.student === s.id ? "selected" : ""}>${studentEscape(s.ref + " · " + s.name)}</option>`,
    )
    .join("")}</select></div></div></div>`;
}
function feeInvoices() {
  return `<div id="feeInvoiceBody">${feeInvoiceTable()}</div>`;
}
function feeInvoiceTable() {
  const all = feeRows(),
    f = feeFilters(),
    pages = Math.max(1, Math.ceil(all.length / 20));
  f.page = Math.min(f.page, pages);
  const rows = all.slice((f.page - 1) * 20, f.page * 20);
  return `<div class="card pad"><div class="flex ac jb" style="gap:10px;flex-wrap:wrap"><h3>${all.length} invoices</h3>${feeManager() ? '<button class="btn" onclick="sendFeeReminders()">Preview reminders</button>' : ""}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Invoice / description</th><th>Student</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Due / status</th><th>Action</th></tr></thead><tbody>${rows.map((i) => `<tr><td><strong>${studentEscape(i.id)}</strong><div class="muted">${studentEscape(i.term)}</div></td><td>${studentEscape(i.student)}<div class="muted">${studentEscape(i.studentRef)}</div></td><td class="num">${feeMoney(i.amt, i.currency)}</td><td class="num">${feeMoney(i.paid, i.currency)}</td><td class="num">${feeMoney(i.balance, i.currency)}</td><td>${studentEscape(i.dueDate)}<div>${chip(i.status, i.status === "Paid" ? "green" : i.status === "Overdue" ? "red" : "amber")}</div></td><td><button class="btn sm" onclick="${studentClick("feeOpenInvoice", i.id)}">View ledger</button>${feeManager() && i.balance > 0 ? ` <button class="btn sm" onclick="${studentClick("feePayForm", i.id)}">Collect</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7">No invoices match. Clear filters or raise an invoice.</td></tr>'}</tbody></table></div><div class="flex ac jb" style="margin-top:12px"><button class="btn sm" onclick="feePage(-1)" ${f.page === 1 ? "disabled" : ""}>Previous</button><span class="muted">Page ${f.page} of ${pages}</span><button class="btn sm" onclick="feePage(1)" ${f.page === pages ? "disabled" : ""}>Next</button></div></div>`;
}
function feePage(delta) {
  feeFilters().page += delta;
  feeRenderRows();
}
function feeRenderRows() {
  const input = document.getElementById("feeSearch");
  const pos = input?.selectionStart;
  render();
  const next = document.getElementById("feeSearch");
  if (next && pos !== null && pos !== undefined) {
    next.focus();
    next.setSelectionRange(pos, pos);
  }
  return;
}
function feeOpenInvoice(id) {
  if (feeAllowed()) openDrawer(invoiceDetail(id));
}
function invoiceDetail(id) {
  const i = INVOICES.find((i) => i.id === id);
  if (!i || !feeAllowed()) return "";
  const payments = (SCHOOLOS_ADAPTER.feePayments || []).filter(
    (p) => p.invoiceId === i.mongoId,
  );
  return detailDrawer({
    title: studentEscape(i.id),
    sub: studentEscape(i.student + " · " + i.term),
    color: "#17A24A",
    badge: ic("fees", 18),
    sections: [
      {
        h: "Invoice",
        html: studentInfoRows([
          ["Student ID", i.studentRef],
          ["Billed", feeMoney(i.amt, i.currency)],
          ["Collected", feeMoney(i.paid, i.currency)],
          ["Balance due", feeMoney(i.balance, i.currency)],
          ["Due date", i.dueDate],
          ["Status", i.status],
        ]),
      },
      {
        h: "Actual payment history",
        html:
          payments
            .map(
              (p) =>
                `<div class="card pad" style="margin-bottom:10px;overflow-wrap:anywhere"><strong>${studentEscape(p.receipt)}</strong><p>${feeMoney(p.amount, p.currency)} · ${studentEscape(p.method)} · ${studentEscape(p.date)}</p><p>Reference: ${studentEscape(p.reference || "Not recorded")}</p><button class="btn sm" onclick="${studentClick("feeReceipt", p.id)}">Download receipt record</button></div>`,
            )
            .join("") || "<p>No payment records yet.</p>",
      },
    ],
    footer: [
      ...(feeManager() && i.balance > 0
        ? [["Record payment", studentClick("feePayForm", i.id), true]]
        : []),
      ["Export invoice", studentClick("feeInvoiceExport", i.id)],
    ],
  });
}
function feePayForm(id) {
  if (!feeManager() || state.feeSaving) return;
  const invoice = id ? INVOICES.find((i) => i.id === id) : null;
  state.feePaymentKey = crypto.randomUUID();
  state.feePaymentFingerprint = null;
  studentFormDrawer(
    "Record received payment",
    "Select the exact invoice. A confirmation will show amount and balance before saving.",
    [
      {
        label: "Invoice",
        key: "invoice",
        opts: INVOICES.filter((i) => i.balance > 0).map(
          (i) => i.id + " · " + i.studentRef + " · " + i.student,
        ),
        val: invoice
          ? invoice.id + " · " + invoice.studentRef + " · " + invoice.student
          : undefined,
        req: true,
      },
      {
        label: "Amount",
        key: "amount",
        type: "number",
        val: invoice ? String(invoice.balance) : "",
        req: true,
      },
      {
        label: "Method",
        key: "method",
        opts: ["Cash", "Bank transfer", "Card", "Cheque", "Online portal"],
      },
      {
        label: "Transaction / receipt reference",
        key: "reference",
        ph: "Reference for bank transfer or cheque",
      },
    ],
    "Review & record",
    "",
    "feePaymentSave",
  );
}
function recordPaymentForm() {
  feePayForm();
}
window.feePaymentSave = async function (v) {
  if (!feeManager() || state.feeSaving) return false;
  const invoice = INVOICES.find(
      (i) => i.id + " · " + i.studentRef + " · " + i.student === v.invoice,
    ),
    amount = Number(v.amount);
  if (
    !invoice ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 ||
    amount > invoice.balance
  ) {
    toast("Enter a valid amount within the selected invoice balance");
    return false;
  }
  if (["Bank transfer", "Cheque"].includes(v.method) && !v.reference) {
    toast("Record the transaction or cheque reference");
    return false;
  }
  const payload = {
    amount,
    paymentMethod: v.method,
    reference: v.reference || undefined,
  };
  const fingerprint = JSON.stringify([invoice.mongoId, payload]);
  if (
    state.feePaymentFingerprint &&
    state.feePaymentFingerprint !== fingerprint
  ) {
    toast(
      "Details changed after a save attempt. Reload the invoice before starting a new payment",
    );
    return false;
  }
  if (
    !confirm(
      "Record " +
        feeMoney(amount, invoice.currency) +
        " received for " +
        invoice.id +
        " (" +
        invoice.student +
        ")? Remaining balance: " +
        feeMoney(
          Math.round((invoice.balance - amount) * 100) / 100,
          invoice.currency,
        ),
    )
  )
    return false;
  state.feePaymentFingerprint = fingerprint;
  state.feeSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/fees/" + invoice.mongoId + "/pay", {
      method: "POST",
      body: JSON.stringify({ ...payload, idempotencyKey: state.feePaymentKey }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Payment recorded; ledger updated");
  } catch (e) {
    toast(
      "Not confirmed — " +
        e.message +
        ". Retry the same details or reload the invoice",
    );
  } finally {
    state.feeSaving = false;
  }
  return false;
};
function feeInvoiceForm() {
  if (!feeManager() || state.feeSaving) return;
  studentFormDrawer(
    "Raise invoice",
    "Uses the configured school currency. Fee-head prices are reference amounts, not automatic student charges.",
    [
      { label: "Invoice reference", key: "ref", req: true, ph: "INV-2026-001" },
      {
        label: "Student",
        key: "student",
        opts: STUDENTS.filter((s) => s.status === "Active").map(
          (s) => s.id + " · " + s.name,
        ),
        req: true,
      },
      {
        label: "Term / charge description",
        key: "term",
        req: true,
        ph: "Term 1 tuition",
      },
      { label: "Amount", key: "amount", type: "number", req: true },
      { label: "Due date", key: "due", type: "date", req: true },
    ],
    "Raise invoice",
    "",
    "feeInvoiceSave",
  );
}
window.feeInvoiceSave = async function (v) {
  if (!feeManager() || state.feeSaving) return false;
  const student = STUDENTS.find((s) => s.id + " · " + s.name === v.student);
  if (!student || !v.ref || !v.term || !v.due || !v.amount) {
    toast("Complete all required invoice fields");
    return false;
  }
  state.feeSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/fees", {
      method: "POST",
      body: JSON.stringify({
        refId: v.ref,
        studentId: student.mongoId,
        term: v.term,
        amount: Number(v.amount),
        dueDate: v.due,
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Invoice raised");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.feeSaving = false;
  }
  return false;
};
function feeCollections() {
  return `<div id="feeCollectionsBody">${feeCollectionsInner()}</div>`;
}
function feeCollectionRows() {
  const ids = new Set(feeRows().map((i) => i.mongoId));
  return (SCHOOLOS_ADAPTER.feePayments || []).filter((p) =>
    ids.has(p.invoiceId),
  );
}
function feeCollectionsInner() {
  const rows = feeCollectionRows(),
    by = {};
  rows.forEach(
    (p) =>
      (by[p.method + "|" + p.currency] =
        Math.round(((by[p.method + "|" + p.currency] || 0) + p.amount) * 100) /
        100),
  );
  return `<div class="card pad"><div class="flex ac jb"><h3>Recorded collections</h3><button class="btn" onclick="feePaymentsExport()">Export payments</button></div><p class="muted">${rows.length} <span>actual payments for the filtered invoices. No estimated receipts or demo trends.</span></p><div class="flex" style="gap:12px;flex-wrap:wrap;margin-bottom:16px">${Object.entries(
    by,
  )
    .map(
      ([method, total]) =>
        `<span>${studentEscape(method.split("|")[0])} · ${feeMoney(total, method.split("|")[1])}</span>`,
    )
    .join(
      "",
    )}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Receipt / invoice</th><th>Student</th><th>Amount / method</th><th>Date</th><th></th></tr></thead><tbody>${rows.map((p) => `<tr><td style="overflow-wrap:anywhere">${studentEscape(p.receipt)}<div class="muted">${studentEscape(p.invoiceRef)}</div></td><td>${studentEscape(p.student)}</td><td>${feeMoney(p.amount, p.currency)}<div class="muted">${studentEscape(p.method)}</div></td><td>${studentEscape(p.date)}</td><td><button class="btn sm" onclick="${studentClick("feeReceipt", p.id)}">Receipt CSV</button></td></tr>`).join("") || '<tr><td colspan="5">No saved payments for this selection.</td></tr>'}</tbody></table></div></div>`;
}
function feeStructure() {
  return `<div class="card pad"><div class="flex ac jb"><h3>Configured fee heads</h3><button class="btn" onclick="feeHeadForm()">Add fee head</button></div><p class="muted">Reference prices in the school currency. No discounts, scholarships or instalments are assumed.</p>${(SCHOOLOS_ADAPTER.feeHeads || []).map((h) => `<div class="card pad" style="margin:12px 0"><strong>${studentEscape(h.name)}</strong> ${chip(h.status, h.status === "Active" ? "green" : "gray")}<p>${studentEscape(h.appliesTo)} · ${studentEscape(h.frequency)} · ${feeMoney(h.amount, h.currency)}</p><button class="btn sm" onclick="${studentClick("feeHeadForm", h._id)}">Edit / archive</button></div>`).join("") || "<p>No fee heads configured. Add your school’s approved prices.</p>"}</div>`;
}
function feeHeadForm(id) {
  if (!feeManager() || state.feeSaving) return;
  const h = (SCHOOLOS_ADAPTER.feeHeads || []).find((h) => h._id === id);
  state.feeHead = h || null;
  studentFormDrawer(
    h ? "Edit fee head" : "Add fee head",
    "Changes affect reference prices; existing invoices retain their original amounts.",
    [
      { label: "Fee head", key: "name", val: h?.name || "", req: true },
      {
        label: "Applies to",
        key: "appliesTo",
        val: h?.appliesTo || "All grades",
        req: true,
      },
      {
        label: "Amount",
        key: "amount",
        type: "number",
        val: String(h?.amount || ""),
        req: true,
      },
      {
        label: "Frequency",
        key: "frequency",
        opts: ["Term", "Annual", "One-time"],
        val: h?.frequency || "Term",
      },
      ...(h
        ? [
            {
              label: "Status",
              key: "status",
              opts: ["Active", "Archived"],
              val: h.status,
            },
          ]
        : []),
    ],
    "Save fee head",
    "",
    "feeHeadSave",
  );
}
window.feeHeadSave = async function (v) {
  if (!feeManager() || state.feeSaving) return false;
  const h = state.feeHead;
  state.feeSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/fees/heads" + (h ? "/" + h._id : ""), {
      method: h ? "PATCH" : "POST",
      body: JSON.stringify({
        ...v,
        amount: Number(v.amount),
        status: v.status || "Active",
        ...(h ? { expectedUpdatedAt: h.updatedAt } : {}),
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Fee head saved");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.feeSaving = false;
  }
  return false;
};
function feeReminderPreview() {
  if (!feeManager()) return;
  const rows = feeRows()
    .filter((i) => i.balance > 0)
    .slice(0, 100);
  state.feeReminderIds = rows.map((i) => i.mongoId);
  openDrawer(
    detailDrawer({
      title: "Review fee reminders",
      sub: rows.length + " filtered invoices · in-app only",
      color: "#2563EB",
      badge: ic("comm", 18),
      sections: [
        {
          h: "Recipients",
          html:
            "<p>Messages go to active, unsuspended linked Parent accounts. Unlinked accounts are skipped. This batch includes up to 100 invoices.</p>" +
            rows
              .map(
                (i) =>
                  `<p>${studentEscape(i.id + " · " + i.student)} · ${feeMoney(i.balance, i.currency)}</p>`,
              )
              .join(""),
        },
      ],
      footer: [
        ["Cancel", "closeDrawer()"],
        ["Confirm reminders", "feeRemindersConfirm()", true],
      ],
    }),
  );
}
async function feeRemindersConfirm() {
  if (!feeManager() || state.feeSaving) return;
  state.feeSaving = true;
  try {
    const res = await SCHOOLOS_ADAPTER.api("/fees/reminders", {
      method: "POST",
      body: JSON.stringify({ invoiceIds: state.feeReminderIds || [] }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast(
      res.data.sent +
        " in-app reminders saved; " +
        res.data.skipped +
        " skipped",
    );
  } catch (e) {
    toast("Not sent — " + e.message);
  } finally {
    state.feeSaving = false;
  }
}
function feeCSV(rows) {
  return [
    [
      "Invoice",
      "Student ID",
      "Student",
      "Description",
      "Currency",
      "Billed",
      "Paid",
      "Balance",
      "Due",
      "Status",
    ],
    ...rows.map((i) => [
      i.id,
      i.studentRef,
      i.student,
      i.term,
      i.currency,
      i.amt,
      i.paid,
      i.balance,
      i.dueDate,
      i.status,
    ]),
  ];
}
function feeExport() {
  studentDownloadCSV("fee-invoices.csv", feeCSV(feeRows()));
}
function feeInvoiceExport(id) {
  studentDownloadCSV(
    "invoice-" + id.replace(/[^a-z0-9-]/gi, "") + ".csv",
    feeCSV(INVOICES.filter((i) => i.id === id)),
  );
}
function feePaymentsExport() {
  studentDownloadCSV("fee-payments.csv", [
    [
      "Receipt",
      "Invoice",
      "Student",
      "Currency",
      "Amount",
      "Method",
      "Reference",
      "Paid at",
    ],
    ...feeCollectionRows().map((p) => [
      p.receipt,
      p.invoiceRef,
      p.student,
      p.currency,
      p.amount,
      p.method,
      p.reference,
      p.paidAt,
    ]),
  ]);
}
function feeReceipt(id) {
  const p = (SCHOOLOS_ADAPTER.feePayments || []).find((p) => p.id === id);
  if (p)
    studentDownloadCSV("receipt-" + p.id + ".csv", [
      [
        "Receipt",
        "Invoice",
        "Student",
        "Currency",
        "Amount received",
        "Method",
        "Reference",
        "Paid at",
      ],
      [
        p.receipt,
        p.invoiceRef,
        p.student,
        p.currency,
        p.amount,
        p.method,
        p.reference,
        p.paidAt,
      ],
    ]);
}
window.collectFee = feePayForm;
window.collectFee.__apiBacked = true;
window.sendFeeReminders = feeReminderPreview;
window.sendFeeReminders.__apiBacked = true;

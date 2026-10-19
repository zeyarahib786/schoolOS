/* Payroll: versioned actual figures, immutable paid periods and payment acknowledgements. */
function payrollManage() {
  return ["Administrator", "Principal", "Accountant"].includes(state.role);
}
function payrollState() {
  const id = commUserId();
  if (state.payrollWorkspace?.userId !== id)
    state.payrollWorkspace = {
      userId: id,
      rows: [],
      staff: [],
      loaded: false,
      loading: false,
      error: "",
      q: "",
      month: "All",
      status: "All",
      page: 1,
    };
  return state.payrollWorkspace;
}
window.payrollLoad = async function () {
  const p = payrollState();
  if (p.loading) return;
  p.loading = true;
  p.error = "";
  try {
    const [rows, staff] = await Promise.all([
      SCHOOLOS_ADAPTER.apiAll("/payroll"),
      SCHOOLOS_ADAPTER.apiAll("/staff"),
    ]);
    p.rows = rows.data || [];
    p.staff = staff.data || [];
    p.loaded = true;
  } catch (e) {
    p.error = e.message;
  } finally {
    p.loading = false;
    if (state.module === "payroll") render();
  }
};
function payrollFiltered() {
  const p = payrollState();
  return p.rows.filter(
    (r) =>
      (p.month === "All" || r.month === p.month) &&
      (p.status === "All" || r.status === p.status) &&
      (!p.q ||
        [r.employeeSnapshot?.name || r.staff?.name, r.staff?.refId, r.month]
          .join(" ")
          .toLowerCase()
          .includes(p.q.toLowerCase())),
  );
}
window.payrollSearch = function (q) {
  payrollState().q = q;
  payrollState().page = 1;
  render();
  const el = document.getElementById("payrollSearch");
  if (el) {
    el.focus();
    el.setSelectionRange(q.length, q.length);
  }
};
M.payroll = () => {
  const p = payrollState();
  if (!p.loaded && !p.loading && !p.error) setTimeout(payrollLoad, 0);
  const rows = payrollFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 15));
  p.page = Math.min(p.page, pages);
  const currencies = [...new Set(rows.map((r) => r.currency || "AED"))],
    total =
      currencies.length === 1
        ? feeMoney(
            rows.reduce((a, r) => a + Math.round(r.netPay * 100), 0) / 100,
            currencies[0],
          )
        : rows.length
          ? "Multiple currencies"
          : feeMoney(0);
  return `<div class="page-head"><div class="ph-l"><h2>Payroll</h2><p>Saved payslips, protected corrections and recorded payment references.</p></div><div class="ph-r">${payrollManage() ? '<button class="btn" onclick="payrollExport()">Export filtered CSV</button><button class="btn primary" onclick="payrollForm()">Generate payslip</button>' : ""}</div></div><div class="grid cols-4" style="margin-bottom:18px">${kpi("payroll", "#17A24A", "Filtered net total", p.loaded ? total : "—", null)}${kpi("staff", "#2563EB", "Employees in view", String(new Set(rows.map((r) => r.staff?._id || r.staff)).size), null)}${kpi("expense", "#E2920C", "Processed / unpaid", String(rows.filter((r) => r.status === "Processed").length), null)}${kpi("reports", "#0E7C39", "Paid records", String(rows.filter((r) => r.status === "Paid").length), null)}</div><div class="card pad"><p class="muted">Recording Paid confirms an external payment already made. This screen does not transfer money. Bank WPS exports require the school's banking setup.</p><div class="flex" style="gap:12px;flex-wrap:wrap;margin-bottom:14px"><div class="field" style="flex:1;min-width:180px"><input id="payrollSearch" aria-label="Search payroll" placeholder="Search employee or period" value="${studentEscape(p.q)}" oninput="payrollSearch(this.value)"></div>${[
    ["month", ["All", ...new Set(p.rows.map((r) => r.month))]],
    ["status", ["All", "Processed", "Paid", "Draft"]],
  ]
    .map(
      ([key, options]) =>
        `<div class="field sel"><select aria-label="Payroll ${key}" onchange="payrollState().${key}=this.value;payrollState().page=1;render()">${options.map((v) => `<option ${p[key] === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>`,
    )
    .join(
      "",
    )}<button class="btn" onclick="payrollLoad()">Refresh</button></div>${p.error ? `<p role="alert">${studentEscape(p.error)}</p><button class="btn" onclick="payrollLoad()">Retry</button>` : p.loading ? "<p>Loading payslips…</p>" : ""}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Period</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net</th><th>Status</th><th></th></tr></thead><tbody>${
    rows
      .slice((p.page - 1) * 15, p.page * 15)
      .map(
        (r) =>
          `<tr><td>${cellUser(studentEscape(r.employeeSnapshot?.name || r.staff?.name || "Employee"), "")}<small>${studentEscape(r.employeeSnapshot?.refId || r.staff?.refId)}</small></td><td>${r.month}</td><td class="num">${feeMoney(r.basicSalary, r.currency)}</td><td class="num">${feeMoney(r.allowances, r.currency)}</td><td class="num">${feeMoney(r.deductions, r.currency)}</td><td class="num">${feeMoney(r.netPay, r.currency)}</td><td>${chip(r.status, r.status === "Paid" ? "green" : "amber")}</td><td><button class="btn sm" onclick="${studentClick("payrollDetailRecord", r._id)}">View</button></td></tr>`,
      )
      .join("") || '<tr><td colspan="8">No payslips match this view.</td></tr>'
  }</tbody></table></div><div class="flex ac jb"><button class="btn" ${p.page <= 1 ? "disabled" : ""} onclick="payrollState().page--;render()">Previous</button><span>${rows.length} records · Page ${p.page} / ${pages}</span><button class="btn" ${p.page >= pages ? "disabled" : ""} onclick="payrollState().page++;render()">Next</button></div></div>`;
};
window.payrollForm = function (id) {
  if (!payrollManage()) return;
  const p = payrollState(),
    r = id ? p.rows.find((r) => r._id === id) : null;
  if (r?.status === "Paid")
    return toast("Paid payslips cannot be recalculated");
  p.edit = r ? { id, version: r.updatedAt } : null;
  p.choices = p.staff
    .filter(
      (s) =>
        ["Active", "On Leave"].includes(s.status) &&
        (!r || s._id === (r.staff?._id || r.staff)),
    )
    .map((s) => ({ label: s.refId + " — " + s.name, id: s._id }));
  studentFormDrawer(
    r ? "Correct payslip" : "Generate payslip",
    "Actual currency amounts with two decimal places. Paid periods are locked.",
    [
      {
        key: "employee",
        label: "Employee",
        opts: p.choices.map((s) => s.label),
        req: true,
      },
      {
        key: "month",
        label: "Payroll month",
        type: "month",
        val: r?.month || healthDay().slice(0, 7),
        req: true,
      },
      {
        key: "basicSalary",
        label: "Basic salary",
        type: "number",
        val: String(r?.basicSalary || ""),
        req: true,
      },
      {
        key: "allowances",
        label: "Allowances",
        type: "number",
        val: String(r?.allowances || 0),
      },
      {
        key: "deductions",
        label: "Deductions",
        type: "number",
        val: String(r?.deductions || 0),
      },
      ...(r
        ? [
            {
              key: "correctionReason",
              label: "Correction reason",
              area: true,
              req: true,
              maxlen: 500,
            },
          ]
        : []),
    ],
    "Save payslip",
    "",
    "payrollSave",
  );
};
window.payrollSave = async function (v) {
  const p = payrollState(),
    employee = p.choices.find((s) => s.label === v.employee);
  if (p.saving) return false;
  if (!employee || !v.month || !v.basicSalary)
    return toast("Employee, month and basic salary are required");
  if (p.edit && v.correctionReason.length < 3)
    return toast("Enter a clear correction reason");
  p.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/payroll", {
      method: "POST",
      body: JSON.stringify({
        staffId: employee.id,
        month: v.month,
        basicSalary: Number(v.basicSalary),
        allowances: Number(v.allowances),
        deductions: Number(v.deductions),
        ...(p.edit
          ? {
              expectedUpdatedAt: p.edit.version,
              correctionReason: v.correctionReason,
            }
          : {}),
      }),
    });
    closeDrawer();
    await payrollLoad();
    toast("Payslip saved");
  } catch (e) {
    toast(e.message);
  } finally {
    p.saving = false;
  }
};
window.payrollDetailRecord = function (id) {
  const r = payrollState().rows.find((r) => r._id === id);
  if (!r) return;
  openDrawer(
    detailDrawer({
      recordTitle:true,personTitle:Boolean(r.employeeSnapshot?.name || r.staff?.name),title:studentEscape(
        r.employeeSnapshot?.name || r.staff?.name || "Payslip",
      ),
      sub: studentEscape(r.month),
      sections: [
        {
          h: "Saved payroll",
          rows: [
            ["Basic", feeMoney(r.basicSalary, r.currency)],
            ["Allowances", feeMoney(r.allowances, r.currency)],
            ["Deductions", feeMoney(r.deductions, r.currency)],
            ["Net pay", feeMoney(r.netPay, r.currency)],
            ["Status", studentEscape(r.status)],
            ["Payment date", studentEscape(r.paidDate?.slice(0, 10) || "—")],
            ["Method", studentEscape(r.paymentMethod || "—")],
            ["Payment reference", studentEscape(r.paymentReference || "—")],
          ],
        },
        {
          h: "Correction history",
          html:
            (r.corrections || [])
              .map(
                (x) =>
                  `<p>${studentEscape(commDate(x.at))} · ${feeMoney(x.previousNet, r.currency)} → ${feeMoney(x.net, r.currency)}<br>${studentEscape(x.reason)}</p>`,
              )
              .join("") || "<p>No corrections recorded.</p>",
        },
      ],
      footer: [
        ["Download PDF", studentClick("payrollDownloadPDF", id)],
        ...(payrollManage() && r.status !== "Paid"
          ? [
              ["Correct payslip", studentClick("payrollForm", id)],
              ["Record paid", studentClick("payrollPayForm", id), true],
            ]
          : []),
      ],
    }),
  );
};
window.payrollPayForm = function (id) {
  if (!payrollManage()) return;
  const r = payrollState().rows.find((r) => r._id === id);
  if (!r || r.status !== "Processed") return;
  payrollState().edit = { id, version: r.updatedAt };
  studentFormDrawer(
    "Record paid payroll",
    "Confirm an actual external payment already made. No funds are transferred here.",
    [
      {
        key: "paidDate",
        label: "Actual payment date",
        type: "date",
        val: healthDay(),
        req: true,
      },
      {
        key: "paymentMethod",
        label: "Payment method",
        opts: ["Bank transfer", "Cash", "Cheque", "Other"],
      },
      {
        key: "paymentReference",
        label: "Payment reference / acknowledgement",
        req: true,
      },
    ],
    "Confirm paid",
    "",
    "payrollPaySave",
  );
};
window.payrollPaySave = async function (v) {
  const p = payrollState();
  if (p.saving) return false;
  if (!v.paidDate || v.paymentReference.length < 3)
    return toast("Payment date and a clear reference are required");
  if (!confirm("Confirm this external payment was actually made?"))
    return false;
  p.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/payroll/" + p.edit.id + "/pay", {
      method: "POST",
      body: JSON.stringify({ ...v, expectedUpdatedAt: p.edit.version }),
    });
    closeDrawer();
    await payrollLoad();
    toast("Payment recorded");
  } catch (e) {
    toast(e.message);
  } finally {
    p.saving = false;
  }
};
window.payrollDownloadPDF = async function (id) {
  try {
    const blob = await SCHOOLOS_ADAPTER.apiBlob("/payroll/" + id + "/pdf"),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "Payslip-" + id + ".pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) {
    toast(e.message);
  }
};
window.payrollExport = function () {
  if (!payrollManage()) return;
  studentDownloadCSV("Payroll.csv", [
    [
      "Employee",
      "Reference",
      "Period",
      "Currency",
      "Basic",
      "Allowances",
      "Deductions",
      "Net",
      "Status",
      "Paid date",
      "Method",
      "Payment reference",
    ],
    ...payrollFiltered().map((r) => [
      r.employeeSnapshot?.name || r.staff?.name,
      r.employeeSnapshot?.refId || r.staff?.refId,
      r.month,
      r.currency || "AED",
      r.basicSalary,
      r.allowances,
      r.deductions,
      r.netPay,
      r.status,
      r.paidDate?.slice(0, 10) || "",
      r.paymentMethod || "",
      r.paymentReference || "",
    ]),
  ]);
};

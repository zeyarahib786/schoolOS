/* Library circulation uses saved stock, loans and explicit family requests. */
let BOOKCAT = [],
  LIBREQUESTS = [];
function libraryWorkspaceManage() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function libraryWorkspaceFamily() {
  return ["Parent", "Student"].includes(state.role);
}
function libraryWorkspaceState() {
  const userId = commUserId();
  if (state.libraryWorkspace?.userId !== userId)
    state.libraryWorkspace = {
      userId,
      books: [],
      loans: [],
      requests: [],
      students: [],
      loaded: false,
      loading: false,
      saving: false,
      error: "",
      tab: "Catalogue",
      q: "",
      status: "All",
      page: 1,
    };
  return state.libraryWorkspace;
}
window.libraryWorkspaceLoad = async function () {
  const b = libraryWorkspaceState();
  if (b.loading) return;
  b.loading = true;
  b.error = "";
  try {
    const r = await Promise.all([
      SCHOOLOS_ADAPTER.apiAll("/library/books"),
      SCHOOLOS_ADAPTER.apiAll("/library/loans"),
      SCHOOLOS_ADAPTER.apiAll("/library/requests"),
      libraryWorkspaceManage() || libraryWorkspaceFamily()
        ? SCHOOLOS_ADAPTER.apiAll("/students")
        : Promise.resolve({ data: [] }),
    ]);
    [b.books, b.loans, b.requests, b.students] = r.map((x) => x.data || []);
    b.loaded = true;
  } catch (e) {
    b.error = e.message;
  } finally {
    b.loading = false;
    if (state.module === "library") render();
  }
};
window.libraryWorkspaceFilter = function (k, v) {
  const b = libraryWorkspaceState();
  b[k] = v;
  if (k !== "page") b.page = 1;
  render();
};
function libraryWorkspaceFiltered() {
  const b = libraryWorkspaceState(),
    rows =
      b.tab === "Catalogue"
        ? b.books
        : b.tab === "Loans"
          ? b.loans
          : b.requests;
  return rows.filter(
    (r) =>
      (b.status === "All" || r.status === b.status) &&
      (!b.q ||
        [
          r.title,
          r.author,
          r.isbn,
          r.category,
          r.shelf,
          r.book?.title,
          r.student?.name,
          r.student?.refId,
        ]
          .join(" ")
          .toLowerCase()
          .includes(b.q.toLowerCase())),
  );
}
function libraryWorkspaceChoices() {
  const b = libraryWorkspaceState();
  b.bookChoices = b.books.map((r) => ({
    id: r._id,
    label: r.title + " · " + r.isbn + " · " + r.availableCopies + " available",
  }));
  b.studentChoices = b.students
    .filter((r) => r.status === "Active")
    .map((r) => ({
      id: r._id,
      label: r.name + " · " + r.grade + " · " + r.refId,
    }));
}
window.libraryWorkspaceBookForm = function (id) {
  if (!libraryWorkspaceManage()) return;
  const b = libraryWorkspaceState(),
    r = b.books.find((r) => r._id === id);
  b.editId = id || null;
  b.mode = "book";
  studentFormDrawer(
    r ? "Review catalogue title" : "Add / restock title",
    "Existing ISBN adds copies only when title and author match.",
    [
      ...(!r
        ? [{ key: "isbn", label: "ISBN / catalogue reference", req: true }]
        : []),
      { key: "title", label: "Title", req: true, val: r?.title || "" },
      { key: "author", label: "Author", req: true, val: r?.author || "" },
      {
        key: "category",
        label: "Category",
        req: true,
        val: r?.category || "",
        half: true,
      },
      {
        key: "shelf",
        label: "Shelf / location",
        val: r?.shelf || "",
        half: true,
      },
      ...(r
        ? [
            {
              key: "reason",
              label: "Reason for correction",
              req: true,
              area: true,
            },
          ]
        : [
            {
              key: "totalCopies",
              label: "Copies received",
              req: true,
              type: "number",
              val: 1,
            },
          ]),
    ],
    "Save catalogue",
    "",
    "libraryWorkspaceSave",
  );
};
window.libraryWorkspaceIssueForm = function () {
  if (!libraryWorkspaceManage()) return;
  const b = libraryWorkspaceState();
  libraryWorkspaceChoices();
  b.mode = "issue";
  b.editId = null;
  const due = new Date(healthDay());
  due.setUTCDate(due.getUTCDate() + 14);
  studentFormDrawer(
    "Issue book",
    "Select an active student and catalogue title.",
    [
      {
        key: "book",
        label: "Title",
        req: true,
        opts: b.bookChoices
          .filter(
            (c) => b.books.find((r) => r._id === c.id).availableCopies > 0,
          )
          .map((c) => c.label),
      },
      {
        key: "student",
        label: "Borrower",
        req: true,
        opts: b.studentChoices.map((c) => c.label),
      },
      {
        key: "dueDate",
        label: "Due date",
        req: true,
        type: "date",
        val: due.toISOString().slice(0, 10),
      },
    ],
    "Issue book",
    "",
    "libraryWorkspaceSave",
  );
};
window.libraryWorkspaceRequestForm = function (id) {
  if (!libraryWorkspaceFamily()) return;
  const b = libraryWorkspaceState();
  libraryWorkspaceChoices();
  b.mode = "request";
  b.editId = null;
  studentFormDrawer(
    "Request a book",
    "Choose the linked child; the librarian issues stock when fulfilled.",
    [
      {
        key: "book",
        label: "Title",
        req: true,
        opts: b.bookChoices.map((c) => c.label),
        val: b.bookChoices.find((c) => c.id === id)?.label,
      },
      {
        key: "student",
        label: "Requested for",
        req: true,
        opts: b.studentChoices.map((c) => c.label),
      },
      { key: "note", label: "Note to librarian", area: true, maxlen: 300 },
    ],
    "Request book",
    "",
    "libraryWorkspaceSave",
  );
};
window.libraryWorkspaceFulfillForm = function (id) {
  if (!libraryWorkspaceManage()) return;
  const b = libraryWorkspaceState(),
    r = b.requests.find((r) => r._id === id);
  if (!r || r.status !== "Pending") return;
  b.editId = id;
  b.mode = "fulfill";
  const due = new Date(healthDay());
  due.setUTCDate(due.getUTCDate() + 14);
  studentFormDrawer(
    "Fulfil and issue",
    r.book?.title + " · " + r.student?.name,
    [
      {
        key: "dueDate",
        label: "Due date",
        req: true,
        type: "date",
        val: due.toISOString().slice(0, 10),
      },
    ],
    "Issue and fulfil",
    "",
    "libraryWorkspaceSave",
  );
};
window.libraryWorkspaceDecisionForm = function (id, status) {
  const b = libraryWorkspaceState(),
    r = b.requests.find((r) => r._id === id);
  if (!r || r.status !== "Pending") return;
  b.editId = id;
  b.mode = "decision";
  b.decision = status;
  studentFormDrawer(
    status === "Rejected" ? "Reject request" : "Cancel request",
    r.book?.title,
    [{ key: "reason", label: "Reason", req: true, area: true }],
    status === "Rejected" ? "Reject" : "Cancel request",
    "",
    "libraryWorkspaceSave",
  );
};
window.libraryWorkspaceRenewForm = function (id) {
  if (!libraryWorkspaceManage()) return;
  const b = libraryWorkspaceState(),
    r = b.loans.find((r) => r._id === id);
  if (!r || r.status === "Returned") return;
  b.editId = id;
  b.mode = "renew";
  const due = new Date(r.dueDate);
  due.setUTCDate(due.getUTCDate() + 14);
  studentFormDrawer(
    "Renew loan",
    r.book?.title + " · " + r.student?.name,
    [
      {
        key: "dueDate",
        label: "New due date",
        req: true,
        type: "date",
        val: due.toISOString().slice(0, 10),
      },
      { key: "reason", label: "Reason for renewal", req: true, area: true },
    ],
    "Renew loan",
    "",
    "libraryWorkspaceSave",
  );
};
window.libraryWorkspaceSave = async function (v) {
  const b = libraryWorkspaceState();
  if (b.saving) return false;
  let path,
    payload,
    method = "POST";
  if (b.mode === "book") {
    const r = b.books.find((r) => r._id === b.editId);
    path = "/library/books" + (r ? "/" + r._id : "");
    payload = {
      title: v.title,
      author: v.author,
      category: v.category,
      shelf: v.shelf,
    };
    if (r) {
      method = "PATCH";
      Object.assign(payload, {
        expectedUpdatedAt: r.updatedAt,
        reason: v.reason,
      });
    } else
      Object.assign(payload, {
        isbn: v.isbn,
        totalCopies: Number(v.totalCopies),
      });
  } else if (b.mode === "issue" || b.mode === "request") {
    const book = b.bookChoices.find((c) => c.label === v.book),
      student = b.studentChoices.find((c) => c.label === v.student);
    if (!book || !student) {
      toast("Select a saved title and active student");
      return false;
    }
    path = "/library/" + (b.mode === "issue" ? "loans" : "requests");
    payload = {
      bookId: book.id,
      studentId: student.id,
      ...(b.mode === "issue" ? { dueDate: v.dueDate } : { note: v.note }),
    };
  } else if (b.mode === "fulfill") {
    path = "/library/requests/" + b.editId + "/fulfill";
    payload = { dueDate: v.dueDate };
  } else if (b.mode === "decision") {
    path = "/library/requests/" + b.editId + "/decision";
    payload = { status: b.decision, reason: v.reason };
  } else {
    const r = b.loans.find((r) => r._id === b.editId);
    path = "/library/loans/" + r._id + "/renew";
    payload = {
      dueDate: v.dueDate,
      expectedUpdatedAt: r.updatedAt,
      reason: v.reason,
    };
  }
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api(path, { method, body: JSON.stringify(payload) });
    closeDrawer();
    await libraryWorkspaceLoad();
    toast("Library record saved");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
  return false;
};
window.libraryWorkspaceReturn = async function (id) {
  if (
    !libraryWorkspaceManage() ||
    !confirm("Confirm the book has been physically returned?")
  )
    return;
  const b = libraryWorkspaceState();
  if (b.saving) return;
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/library/loans/" + id + "/return", {
      method: "POST",
      body: JSON.stringify({}),
    });
    closeDrawer();
    await libraryWorkspaceLoad();
    toast("Return recorded; stock restored");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
};
window.libraryWorkspaceRemind = async function (id) {
  if (!libraryWorkspaceManage()) return;
  const b = libraryWorkspaceState();
  if (b.saving) return;
  b.saving = true;
  try {
    const r = await SCHOOLOS_ADAPTER.api("/library/reminders", {
      method: "POST",
      body: JSON.stringify({ loanIds: [id] }),
    });
    await libraryWorkspaceLoad();
    toast(
      r.data.sent + " portal reminder sent; " + r.data.skipped + " skipped",
    );
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
};
window.libraryWorkspaceDetail = function (id) {
  const b = libraryWorkspaceState(),
    r = (
      b.tab === "Catalogue" ? b.books : b.tab === "Loans" ? b.loans : b.requests
    ).find((r) => r._id === id);
  if (!r) return;
  const esc = studentEscape,
    staff = libraryWorkspaceManage();
  let sections,
    footer = [];
  if (b.tab === "Catalogue") {
    sections = [
      {
        h: "Catalogue",
        rows: [
          ["Author", esc(r.author)],
          ["ISBN / reference", esc(r.isbn)],
          ["Category", esc(r.category)],
          ["Shelf", esc(r.shelf || "Unassigned")],
          ["Total copies", String(r.totalCopies)],
          ["Available", String(r.availableCopies)],
        ],
      },
    ];
    if (staff)
      footer.push([
        "Review title",
        studentClick("libraryWorkspaceBookForm", id),
        true,
      ]);
    if (libraryWorkspaceFamily())
      footer.push([
        "Request",
        studentClick("libraryWorkspaceRequestForm", id),
        true,
      ]);
  } else if (b.tab === "Loans") {
    sections = [
      {
        h: "Loan",
        rows: [
          ["Student", esc(r.student?.name || "")],
          ["Reference", esc(r.student?.refId || "")],
          ["Status", esc(r.status)],
          ["Issued", esc(commDate(r.issuedDate))],
          ["Due", esc(commDate(r.dueDate))],
          [
            "Returned",
            r.returnedDate ? esc(commDate(r.returnedDate)) : "Pending",
          ],
          ["Renewals", String(r.renewalCount || 0) + " / 3"],
          ["Portal reminders", String(r.reminderCount || 0)],
        ],
      },
      {
        h: "Loan history",
        rows: (r.history || []).map((h) => [
          esc(commDate(h.at)),
          esc(h.action + (h.reason ? " · " + h.reason : "")),
        ]),
      },
    ];
    if (staff && r.status !== "Returned")
      footer.push(
        ["Return book", studentClick("libraryWorkspaceReturn", id), true],
        ["Renew", studentClick("libraryWorkspaceRenewForm", id)],
      );
    if (staff && r.status === "Overdue")
      footer.push([
        "Portal reminder",
        studentClick("libraryWorkspaceRemind", id),
      ]);
  } else {
    sections = [
      {
        h: "Request",
        rows: [
          ["Student", esc(r.student?.name || "")],
          ["Status", esc(r.status)],
          ["Requested", esc(commDate(r.createdAt))],
          ["Note", esc(r.note || "—")],
          ["Decision reason", esc(r.decisionReason || "—")],
          ["Linked loan", esc(r.loan || "Not issued")],
        ],
      },
    ];
    if (r.status === "Pending") {
      if (staff)
        footer.push(
          [
            "Fulfil and issue",
            studentClick("libraryWorkspaceFulfillForm", id),
            true,
          ],
          ["Reject", "libraryWorkspaceDecisionForm('" + id + "','Rejected')"],
        );
      if (staff || libraryWorkspaceFamily())
        footer.push([
          "Cancel request",
          "libraryWorkspaceDecisionForm('" + id + "','Cancelled')",
        ]);
    }
  }
  openDrawer(
    detailDrawer({
      title: esc(r.title || r.book?.title || "Library record"),
      sub: esc(r.student?.grade || r.author || ""),
      sections,
      footer: [...footer, ["Close", "closeDrawer()"]],
    }),
  );
};
window.libraryWorkspaceExport = function () {
  const b = libraryWorkspaceState();
  studentDownloadCSV(
    "library-" + b.tab.toLowerCase() + ".csv",
    b.tab === "Catalogue"
      ? [
          [
            "ISBN",
            "Title",
            "Author",
            "Category",
            "Shelf",
            "Total",
            "Available",
          ],
          ...libraryWorkspaceFiltered().map((r) => [
            r.isbn,
            r.title,
            r.author,
            r.category,
            r.shelf,
            r.totalCopies,
            r.availableCopies,
          ]),
        ]
      : [
          ["Title", "Borrower", "Reference", "Status", "Due"],
          ...libraryWorkspaceFiltered().map((r) => [
            r.book?.title,
            r.student?.name,
            r.student?.refId,
            r.status,
            r.dueDate || "",
          ]),
        ],
  );
};
M.library = () => {
  const b = libraryWorkspaceState();
  if (!b.loaded && !b.loading && !b.error) libraryWorkspaceLoad();
  const rows = libraryWorkspaceFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 20));
  b.page = Math.min(b.page, pages);
  const esc = studentEscape,
    staff = libraryWorkspaceManage();
  return (
    '<div class="page-head"><div class="ph-l"><h2>Library</h2><p>Saved catalogue, circulation and family requests. Returns and issue update stock together.</p></div><div class="ph-r">' +
    (staff
      ? '<button class="btn" onclick="libraryWorkspaceBookForm()">Add / restock</button><button class="btn primary" onclick="libraryWorkspaceIssueForm()">Issue book</button>'
      : libraryWorkspaceFamily()
        ? '<button class="btn primary" onclick="libraryWorkspaceRequestForm()">Request book</button>'
        : "") +
    '<button class="btn" onclick="libraryWorkspaceLoad()">Refresh</button></div></div>' +
    '<div class="grid cols-4" style="margin-bottom:18px">' +
    kpi("lib", "#17A24A", "Titles", String(b.books.length)) +
    kpi(
      "students",
      "#2563EB",
      "Open loans",
      String(b.loans.filter((r) => r.status !== "Returned").length),
    ) +
    kpi(
      "exam",
      "#E11D2A",
      "Overdue",
      String(b.loans.filter((r) => r.status === "Overdue").length),
    ) +
    kpi(
      "reports",
      "#0E7C39",
      "Available copies",
      String(b.books.reduce((n, r) => n + r.availableCopies, 0)),
    ) +
    '</div><div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:10px;flex-wrap:wrap">' +
    ["Catalogue", "Loans", "Requests"]
      .map(
        (t) =>
          '<button class="btn ' +
          (b.tab === t ? "primary" : "") +
          "\" onclick=\"libraryWorkspaceFilter('tab','" +
          t +
          "');libraryWorkspaceFilter('status','All')\">" +
          t +
          "</button>",
      )
      .join("") +
    '<input aria-label="Search library" placeholder="Search titles or borrowers" value="' +
    esc(b.q) +
    '" onchange="libraryWorkspaceFilter(\'q\',this.value)"><label>Status <select onchange="libraryWorkspaceFilter(\'status\',this.value)">' +
    (b.tab === "Catalogue"
      ? ["All"]
      : b.tab === "Loans"
        ? ["All", "Active", "Overdue", "Returned"]
        : ["All", "Pending", "Fulfilled", "Rejected", "Cancelled"]
    )
      .map(
        (v) =>
          "<option " +
          (v === b.status ? "selected" : "") +
          ">" +
          v +
          "</option>",
      )
      .join("") +
    '</select></label><button class="btn" onclick="libraryWorkspaceExport()">Export view</button></div></div>' +
    (b.error ? '<div class="card pad">' + esc(b.error) + "</div>" : "") +
    '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>' +
    (b.tab === "Catalogue" ? "Author / reference" : "Borrower") +
    "</th><th>Details</th><th></th></tr></thead><tbody>" +
    rows
      .slice((b.page - 1) * 20, b.page * 20)
      .map(
        (r) =>
          "<tr><td><b>" +
          esc(r.title || r.book?.title || "") +
          '</b><div class="muted">' +
          esc(r.category || "") +
          "</div></td><td>" +
          esc(b.tab === "Catalogue" ? r.author : r.student?.name || "") +
          '<div class="muted">' +
          esc(b.tab === "Catalogue" ? r.isbn : r.student?.refId || "") +
          "</div></td><td>" +
          (b.tab === "Catalogue"
            ? r.availableCopies +
              " / " +
              r.totalCopies +
              " available · " +
              esc(r.shelf || "No shelf")
            : chip(
                r.status,
                r.status === "Overdue"
                  ? "red"
                  : r.status === "Returned" || r.status === "Fulfilled"
                    ? "green"
                    : "blue",
              ) +
              '<div class="muted">' +
              esc(
                r.dueDate
                  ? "Due " + commDate(r.dueDate)
                  : commDate(r.createdAt),
              ) +
              "</div>") +
          '</td><td><button class="btn" onclick="' +
          studentClick("libraryWorkspaceDetail", r._id) +
          '">View</button></td></tr>',
      )
      .join("") +
    "</tbody></table></div>" +
    (!rows.length
      ? '<p class="pad muted">' +
        (b.loading ? "Loading library…" : "No records match this view.") +
        "</p>"
      : "") +
    '<div class="pad flex ac jb"><span>' +
    rows.length +
    " records · Page " +
    b.page +
    " of " +
    pages +
    '</span><div><button class="btn" ' +
    (b.page === 1 ? "disabled" : "") +
    " onclick=\"libraryWorkspaceFilter('page'," +
    (b.page - 1) +
    ')">Previous</button><button class="btn" ' +
    (b.page === pages ? "disabled" : "") +
    " onclick=\"libraryWorkspaceFilter('page'," +
    (b.page + 1) +
    ')">Next</button></div></div></div><p class="muted">Borrowing allowance: KG / Grade 1: 3 open loans; other grades: 5. Staff can renew up to 3 times. Portal reminders repeat after 24 hours; unlinked or suspended recipients are skipped. Requests do not reserve stock until issued.</p>'
  );
};
/* Older dashboard links use the same server circulation workflow. */
window.returnBook = function (title, borrower) {
  const id = SCHOOLOS_ADAPTER.loanIds?.[title + "::" + borrower];
  if (id) return libraryWorkspaceReturn(id);
  go("library");
  toast("Select the loan in the Library register");
};
window.returnBook.__apiBacked = true;
window.notifyOneOverdue = function (title, borrower) {
  const id = SCHOOLOS_ADAPTER.loanIds?.[title + "::" + borrower];
  if (id) return libraryWorkspaceRemind(id);
  go("library");
};
function issueBookForm() {
  go("library");
  libraryWorkspaceLoad().then(() => libraryWorkspaceIssueForm());
}
function requestBookForm() {
  go("library");
  libraryWorkspaceLoad().then(() => libraryWorkspaceRequestForm());
}

/* Communication: saved notices and private, participant-owned portal messages. */
function commAuthor() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function commReviewer() {
  return ["Administrator", "Principal"].includes(state.role);
}
function commUserId() {
  const u = SCHOOLOS_ADAPTER.user || {};
  return u._id || u.id;
}
function commState() {
  if (state.communication?.userId !== commUserId()) state.communication = null;
  return (
    state.communication ||
    (state.communication = {
      userId: commUserId(),
      tab: "Notices",
      q: "",
      status: "All",
      page: 1,
      messages: [],
      loaded: false,
      loading: false,
      error: "",
    })
  );
}
function commDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString(typeof schoolLocale==='function'?schoolLocale():"en-GB", {
    timeZone: (SCHOOLOS_ADAPTER.settings || {}).timezone || "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function commNotices() {
  const c = commState();
  return ANN.filter(
    (a) =>
      (c.status === "All" || a.status === c.status) &&
      (!c.q ||
        (a.t + " " + a.bd + " " + a.aud)
          .toLowerCase()
          .includes(c.q.toLowerCase())),
  );
}
function commSearch(v) {
  commState().q = v;
  commState().page = 1;
  render();
  const el = document.getElementById("commSearch");
  if (el) {
    el.focus();
    el.setSelectionRange(v.length, v.length);
  }
}
window.commTab = function (tab) {
  const c = commState();
  c.tab = tab;
  c.page = 1;
  c.q = "";
  c.error = "";
  if (tab === "External deliveries") {
    c.deliveriesLoaded = false;
    commLoadDeliveries();
  } else if (tab !== "Notices") {
    c.loaded = false;
    commLoadMessages();
  }
  render();
};
window.commLoadMessages = async function () {
  const c = commState();
  if (c.loading) return;
  c.loading = true;
  c.error = "";
  const tab = c.tab;
  try {
    const box = tab === "Sent" ? "sent" : tab === "Archived" ? "all" : "inbox";
    const res = await SCHOOLOS_ADAPTER.apiAll(
      "/messages?box=" + box + "&archived=" + (tab === "Archived"),
    );
    if (c.tab === tab) {
      c.messages = res.data || [];
      c.loaded = true;
    }
  } catch (e) {
    c.error = e.message;
  } finally {
    c.loading = false;
    if (state.module === "comm") render();
  }
};
M.comm = () => {
  if (commState().tab === "External deliveries" && commAuthor())
    return commExternalView();
  const c = commState(),
    notice = c.tab === "Notices";
  if (!notice && !c.loaded && !c.loading && !c.error)
    setTimeout(commLoadMessages, 0);
  const rows = notice
      ? commNotices()
      : c.messages.filter(
          (m) =>
            !c.q ||
            (
              m.subject +
              " " +
              m.body +
              " " +
              ((m.sender || {}).name || "") +
              " " +
              ((m.recipient || {}).name || "")
            )
              .toLowerCase()
              .includes(c.q.toLowerCase()),
        ),
    pages = Math.max(1, Math.ceil(rows.length / 15));
  c.page = Math.min(c.page, pages);
  return `<div class="page-head"><div class="ph-l"><h2>Communication</h2><p>School notices and private conversations, saved in the portal.</p></div><div class="ph-r">${commAuthor() ? '<button class="btn" onclick="newAnnouncementForm()">New notice</button>' : ""}<button class="btn primary" onclick="commCompose()">New message</button></div></div><div class="grid cols-3" style="margin-bottom:16px">${kpi("comm", "#2563EB", "Visible published notices", String(ANN.filter((a) => a.status === "Published").length), null)}${kpi("roles", "#E2920C", commAuthor() ? "Visible pending notices" : "Portal channel", commAuthor() ? String(ANN.filter((a) => a.status === "Pending approval").length) : "In-app", null)}${kpi("reports", "#17A24A", notice ? "Notice delivery" : "Filtered messages", notice ? "Not tracked" : String(rows.length), null)}</div><div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:16px">${["Notices", "Inbox", "Sent", "Archived", ...(commAuthor() ? ["External deliveries"] : [])].map((t) => `<button class="btn ${c.tab === t ? "primary" : ""}" onclick="commTab('${t}')">${t}</button>`).join("")}</div><div class="card pad"><div class="flex" style="gap:12px;flex-wrap:wrap;margin-bottom:16px"><div class="field" style="flex:1;min-width:170px"><input id="commSearch" aria-label="Search communication" placeholder="Search ${notice ? "notices" : "messages"}" value="${studentEscape(c.q)}" oninput="commSearch(this.value)"></div>${notice && commAuthor() ? `<div class="field sel"><select aria-label="Notice status" onchange="commState().status=this.value;commState().page=1;render()">${["All", "Draft", "Pending approval", "Published"].map((s) => `<option ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>` : ""}${!notice ? '<button class="btn" onclick="commState().loaded=false;commLoadMessages()">Refresh</button>' : ""}</div><p class="muted">${notice ? "Notices appear to matching active portal roles. Views, email and SMS delivery are not tracked." : c.tab === "Archived" ? "Your personal archive. Restoring a message does not change the other participant’s inbox." : "Only you and the other participant can see these conversations. Read status is set by the recipient."}</p>${
    c.error && !notice
      ? `<p role="alert">${studentEscape(c.error)}</p><button class="btn" onclick="commLoadMessages()">Retry</button>`
      : c.loading && !notice
        ? "<p>Loading messages…</p>"
        : rows
            .slice((c.page - 1) * 15, c.page * 15)
            .map((r) =>
              notice
                ? `<div class="card pad" style="margin-bottom:12px"><div class="flex ac jb"><strong>${studentEscape(r.t)}</strong>${chip(r.status, r.status === "Published" ? "green" : r.status === "Draft" ? "gray" : "amber")}</div><p>${studentEscape(r.by)} · ${studentEscape(r.aud)} · ${studentEscape(r.tm)}${r.pinned ? " · Pinned" : ""}</p><p style="white-space:pre-wrap;overflow-wrap:anywhere">${studentEscape(r.bd.slice(0, 180))}${r.bd.length > 180 ? "…" : ""}</p><button class="btn sm" onclick="openDrawer(annDetail(${ANN.indexOf(r)}))">View notice</button></div>`
                : `<div class="card pad" style="margin-bottom:12px"><div class="flex ac jb"><strong>${studentEscape(r.subject)}</strong>${chip(r.readAt ? "Read" : "Unread", r.readAt ? "gray" : "blue")}</div><p>${studentEscape((r.sender || {}).name || "School Office")} → ${studentEscape((r.recipient || {}).name || "Recipient")} · ${studentEscape(commDate(r.createdAt))}</p><p style="white-space:pre-wrap;overflow-wrap:anywhere">${studentEscape(r.body.slice(0, 160))}${r.body.length > 160 ? "…" : ""}</p><button class="btn sm" onclick="${studentClick("commMessageDetail", r._id)}">Open message</button></div>`,
            )
            .join("") || "<p>No records match this view.</p>"
  }<div class="flex ac jb"><button class="btn" ${c.page <= 1 ? "disabled" : ""} onclick="commState().page--;render()">Previous</button><span>${rows.length} records · Page ${c.page} / ${pages}</span><button class="btn" ${c.page >= pages ? "disabled" : ""} onclick="commState().page++;render()">Next</button></div></div>`;
};
function annDetail(index) {
  const a = ANN[index];
  if (!a) return "";
  const editable =
    commAuthor() && (commReviewer() || a.authorId === commUserId());
  return detailDrawer({
    title: studentEscape(a.t),
    sub: studentEscape(a.by + " · " + a.aud),
    color: "#2563EB",
    badge: ic("comm", 18),
    sections: [
      {
        h: "Notice",
        html: `<div style="white-space:pre-wrap;overflow-wrap:anywhere">${studentEscape(a.bd)}</div>`,
      },
      {
        h: "Publication",
        html: studentInfoRows([
          ["Status", a.status],
          ["Audience", a.aud],
          ["Last saved", commDate(a.updatedAt)],
          ["Review note", a.reviewNote || "None"],
          ["Delivery", "Portal visibility only; reads are not tracked"],
        ]),
      },
    ],
    footer: [
      ...(a.status === "Draft" && editable
        ? [
            ["Edit draft", "commNoticeForm(" + index + ")"],
            [
              "Submit for approval",
              "commNoticeReview(" + index + ',"Pending approval")',
              true,
            ],
          ]
        : []),
      ...(a.status === "Pending approval" && commReviewer()
        ? [
            ["Return to draft", "commNoticeReview(" + index + ',"Draft")'],
            [
              "Review & publish",
              "commNoticeReview(" + index + ',"Published")',
              true,
            ],
          ]
        : []),
      ["Close", "closeDrawer()"],
    ],
  });
}
window.newAnnouncementForm = function () {
  commNoticeForm();
};
window.commNoticeForm = function (index) {
  if (!commAuthor()) return;
  const a = ANN[index];
  state.commDraftIndex = a ? index : null;
  studentFormDrawer(
    a ? "Edit draft" : "New school notice",
    "Save a draft or submit it for reviewer approval.",
    [
      { key: "title", label: "Title", req: true, val: a ? a.t : "" },
      {
        key: "audience",
        label: "Audience",
        opts: ["All", "Staff", "Parents", "Students"],
        val: a ? a.aud : "All",
        half: true,
      },
      {
        key: "pinned",
        label: "Priority",
        opts: ["Normal", "Pinned"],
        val: a && a.pinned ? "Pinned" : "Normal",
        half: true,
      },
      {
        key: "message",
        label: "Notice body",
        area: true,
        req: true,
        val: a ? a.bd : "",
      },
      ...(!a
        ? [
            {
              key: "action",
              label: "Save as",
              opts: ["Draft", "Pending approval"],
            },
          ]
        : []),
    ],
    "Save notice",
    "",
    "postAnnouncement",
  );
};
window.postAnnouncement = async function (v) {
  if (!commAuthor() || state.commSaving) return false;
  const title = (v.title || "").trim(),
    body = (v.message || "").trim();
  if (title.length < 2 || title.length > 160 || !body || body.length > 3000) {
    toast(
      "Enter a title of 2–160 characters and a notice of 1–3000 characters",
    );
    return false;
  }
  state.commSaving = true;
  try {
    const a = state.commDraftIndex !== null ? ANN[state.commDraftIndex] : null;
    await SCHOOLOS_ADAPTER.api("/announcements" + (a ? "/" + a.mongoId : ""), {
      method: a ? "PATCH" : "POST",
      body: JSON.stringify({
        title,
        body,
        audience: v.audience,
        pinned: v.pinned === "Pinned",
        ...(a
          ? { expectedUpdatedAt: a.updatedAt }
          : { status: v.action || "Draft" }),
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Notice saved in the portal");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.commSaving = false;
  }
  return false;
};
window.commNoticeReview = async function (index, target) {
  const a = ANN[index];
  if (!a || state.commSaving) return;
  try {
    const preview = await SCHOOLOS_ADAPTER.api(
      "/announcements/audience-preview?audience=" + a.aud,
    );
    state.commReview = { id: a.mongoId, version: a.updatedAt, target };
    openDrawer(
      detailDrawer({
        title:
          target === "Published"
            ? "Review publication"
            : target === "Draft"
              ? "Return notice to draft"
              : "Submit notice for approval",
        sub: studentEscape(a.t),
        color: "#2563EB",
        badge: ic("comm", 18),
        sections: [
          {
            h: "Audience preview",
            html: `<p>${preview.data.visibleAccounts} currently active portal accounts can view a published ${studentEscape(a.aud)} notice, including staff oversight.</p><p>This is visibility, not confirmed delivery or read receipts.</p>${studentInfoRows(preview.data.byRole.map((r) => [r.role, String(r.count)]))}`,
          },
          {
            h: "Notice",
            html: `<p style="white-space:pre-wrap">${studentEscape(a.bd)}</p><div class="field"><label for="commReviewNote">Review note ${target === "Draft" ? "(required)" : "(optional)"}</label><textarea id="commReviewNote" maxlength="300" rows="4"></textarea></div>`,
          },
        ],
        footer: [
          ["Cancel", "closeDrawer()"],
          ["Confirm " + target, "commNoticeConfirm()", true],
        ],
      }),
    );
  } catch (e) {
    toast(e.message);
  }
};
window.commNoticeConfirm = async function () {
  const r = state.commReview,
    note = (document.getElementById("commReviewNote").value || "").trim();
  if (!r || state.commSaving) return;
  if (r.target === "Draft" && !note) {
    toast("Explain what the author should change");
    return;
  }
  state.commSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/announcements/" + r.id + "/status", {
      method: "PATCH",
      body: JSON.stringify({
        status: r.target,
        expectedUpdatedAt: r.version,
        reviewNote: note,
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast(
      r.target === "Published"
        ? "Notice published in the portal"
        : r.target === "Draft"
          ? "Returned to draft"
          : "Submitted for approval",
    );
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.commSaving = false;
  }
};
window.commCompose = function (id) {
  const m = commState().messages.find((r) => r._id === id),
    me = commUserId(),
    other = m ? (m.sender._id === me ? m.recipient : m.sender) : null;
  state.commReplyTo = m ? m._id : null;
  studentFormDrawer(
    m ? "Reply to message" : "New private message",
    "Only the sender and recipient can access this portal message.",
    [
      {
        key: "recipientEmail",
        label: "Recipient account email",
        req: true,
        type: "email",
        val: other ? other.email : "",
      },
      {
        key: "subject",
        label: "Subject",
        req: true,
        val: m
          ? (m.subject.startsWith("Re: ")
              ? m.subject
              : "Re: " + m.subject
            ).slice(0, 160)
          : "",
      },
      { key: "body", label: "Message", area: true, req: true, maxlen: 5000 },
    ],
    "Send message",
    "",
    "commSend",
  );
};
window.commSend = async function (v) {
  if (state.commSaving) return false;
  const subject = (v.subject || "").trim(),
    body = (v.body || "").trim();
  if (!subject || subject.length > 160 || !body || body.length > 5000) {
    toast(
      "Enter a subject of 1–160 characters and a message of 1–5000 characters",
    );
    return false;
  }
  state.commSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/messages", {
      method: "POST",
      body: JSON.stringify({
        recipientEmail: (v.recipientEmail || "").trim(),
        subject,
        body,
        ...(state.commReplyTo ? { replyTo: state.commReplyTo } : {}),
      }),
    });
    closeDrawer();
    commState().tab = "Sent";
    commState().loaded = false;
    await commLoadMessages();
    render();
    toast("Private portal message sent");
  } catch (e) {
    toast("Not sent — " + e.message);
  } finally {
    state.commSaving = false;
  }
  return false;
};
window.commMessageDetail = async function (id) {
  const m = commState().messages.find((r) => r._id === id);
  if (!m) return;
  try {
    if (m.recipient._id === commUserId() && !m.readAt) {
      const res = await SCHOOLOS_ADAPTER.api("/messages/" + id + "/read", {
        method: "POST",
      });
      m.readAt = res.data.readAt;
      render();
    }
    const archived = commState().tab === "Archived";
    openDrawer(
      detailDrawer({
        recordTitle:true,title:studentEscape(m.subject),
        sub: studentEscape(
          (m.sender.name || "School Office") + " → " + m.recipient.name,
        ),
        color: "#2563EB",
        badge: ic("comm", 18),
        sections: [
          {
            h: "Message",
            html: `<div style="white-space:pre-wrap;overflow-wrap:anywhere">${studentEscape(m.body)}</div>`,
          },
          {
            h: "Conversation",
            html: studentInfoRows([
              ["Sent", commDate(m.createdAt)],
              ["Read by recipient", m.readAt ? commDate(m.readAt) : "Not read"],
              ["Reply", "Replies remain private to these participants"],
            ]),
          },
        ],
        footer: [
          ["Reply", studentClick("commCompose", id), true],
          [
            archived ? "Restore" : "Archive",
            `commArchive('${id}',${!archived})`,
          ],
          ["Close", "closeDrawer()"],
        ],
      }),
    );
  } catch (e) {
    toast(e.message);
  }
};
window.commArchive = async function (id, archived) {
  if (state.commSaving) return;
  state.commSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/messages/" + id + "/archive", {
      method: "POST",
      body: JSON.stringify({ archived }),
    });
    closeDrawer();
    commState().loaded = false;
    await commLoadMessages();
    toast(archived ? "Moved to your archive" : "Restored to your messages");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.commSaving = false;
  }
};

window.commLoadDeliveries = async function () {
  const c = commState();
  if (c.deliveryLoading) return;
  c.deliveryLoading = true;
  c.deliveryError = "";
  try {
    const [config, rows] = await Promise.all([
      SCHOOLOS_ADAPTER.api("/notifications/status"),
      SCHOOLOS_ADAPTER.apiAll("/notifications"),
    ]);
    c.deliveryConfig = config.data;
    c.deliveries = rows.data || [];
    c.deliveriesLoaded = true;
  } catch (e) {
    c.deliveryError = e.message;
  } finally {
    c.deliveryLoading = false;
    if (state.module === "comm") render();
  }
};
function commExternalView() {
  const c = commState(),
    config = c.deliveryConfig || {},
    rows = c.deliveries || [];
  if (!c.deliveriesLoaded && !c.deliveryLoading && !c.deliveryError)
    setTimeout(commLoadDeliveries, 0);
  return `<div class="page-head"><div class="ph-l"><h2>External deliveries</h2><p>Send to active school accounts. Teacher requests require office approval.</p></div><div class="ph-r"><button class="btn" onclick="commTab('Notices')">Back to communication</button><button class="btn primary" ${!config.email?.configured && !config.sms?.configured ? "disabled" : ""} onclick="commExternalCompose()">New delivery</button></div></div><div class="card pad"><p>Email: ${config.email?.configured ? "Resend configured" : "Setup pending"} · SMS: ${config.sms?.configured ? "Configured" : "Setup pending"}</p><p class="muted">Accepted means the provider accepted the request. Delivered requires a verified email delivery event. An unknown result needs review before sending again.</p><button class="btn" onclick="commLoadDeliveries()">Refresh</button>${c.deliveryError ? `<p role="alert">${studentEscape(c.deliveryError)}</p>` : ""}${c.deliveryLoading ? "<p>Loading deliveries…</p>" : ""}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Recipient</th><th>Channel</th><th>Subject</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${studentEscape(r.recipient?.name || "Recipient")}<br><small>${studentEscape(r.destination)}</small></td><td>${studentEscape(r.channel)}</td><td data-i18n-skip="true">${studentEscape(r.subject)}</td><td>${chip(studentEscape(r.status), r.status === "Delivered" ? "green" : r.status === "Failed" ? "red" : "amber")}${r.errorCode ? `<br><small>${studentEscape(r.errorCode)}</small>` : ""}</td><td>${studentEscape(commDate(r.createdAt))}</td><td><button class="btn sm" onclick="${studentClick("commExternalDetail", r._id)}">View</button>${r.status === "Awaiting approval" && commReviewer() ? `<button class="btn sm primary" onclick="${studentClick("commExternalApprove", r._id)}">Approve</button>` : ""}${["Pending", "Awaiting approval"].includes(r.status) ? `<button class="btn sm" onclick="${studentClick("commExternalCancel", r._id)}">Cancel</button>` : ""}${r.status === "Failed" || (r.status === "Unknown" && r.channel === "Email") ? `<button class="btn sm" onclick="${studentClick("commExternalRetry", r._id)}">Review retry</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="6">No external deliveries yet.</td></tr>'}</tbody></table></div></div>`;
}
window.commExternalCompose = function () {
  const config = commState().deliveryConfig || {},
    channels = ["Email", "SMS"].filter(
      (c) => config[c.toLowerCase()]?.configured,
    );
  if (!channels.length) return toast("External delivery setup is pending");
  commState().deliveryRequestKey = crypto.randomUUID();
  studentFormDrawer(
    "New external delivery",
    "Use an existing active school account. SMS uses its verified linked profile phone.",
    [
      {
        key: "recipientEmail",
        label: "Recipient account email",
        type: "email",
        req: true,
      },
      { key: "channel", label: "Channel", opts: channels, req: true },
      { key: "subject", label: "Subject", req: true },
      { key: "body", label: "Message", area: true, req: true, maxlen: 5000 },
    ],
    commReviewer() ? "Queue delivery" : "Request approval",
    "",
    "commExternalSubmit",
  );
};
window.commExternalSubmit = async function (vals) {
  const c = commState();
  if (c.deliverySaving) return false;
  if (!vals.recipientEmail || !vals.subject || !vals.body)
    return toast("Recipient, subject and message are required");
  if (
    !confirm(
      commReviewer()
        ? "Queue this external message for delivery?"
        : "Submit this message for school office approval?",
    )
  )
    return false;
  c.deliverySaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/notifications", {
      method: "POST",
      body: JSON.stringify({ ...vals, idempotencyKey: c.deliveryRequestKey }),
    });
    closeDrawer();
    toast("Delivery saved");
    await commLoadDeliveries();
  } catch (e) {
    toast(e.message);
  } finally {
    c.deliverySaving = false;
  }
};
async function commDeliveryAction(id, action) {
  if (
    !confirm(
      action === "retry"
        ? "Retry this request? Unknown results may already have been sent. The server permits only safe retries."
        : action === "approve"
          ? "Approve and queue this external message?"
          : "Cancel this pending message?",
    )
  )
    return;
  try {
    await SCHOOLOS_ADAPTER.api("/notifications/" + id + "/" + action, {
      method: "POST",
    });
    toast("Delivery updated");
    await commLoadDeliveries();
  } catch (e) {
    toast(e.message);
  }
}
window.commExternalApprove = (id) => commDeliveryAction(id, "approve");
window.commExternalCancel = (id) => commDeliveryAction(id, "cancel");
window.commExternalRetry = (id) => commDeliveryAction(id, "retry");

window.commExternalDetail = function (id) {
  const r = (commState().deliveries || []).find((r) => r._id === id);
  if (!r) return;
  openDrawer(
    detailDrawer({
      title: "External delivery",
      sub: studentEscape(r.subject),
      sections: [
        {
          h: "Delivery record",
          rows: [
            ["Recipient", studentEscape(r.destination)],
            ["Channel", studentEscape(r.channel)],
            ["Status", studentEscape(r.status)],
            ["Created", studentEscape(commDate(r.createdAt))],
          ],
        },
        {
          h: "Message",
          html: `<p style="white-space:pre-wrap;overflow-wrap:anywhere">${studentEscape(r.body)}</p>`,
        },
      ],
      footer:
        r.status === "Awaiting approval" && commReviewer()
          ? [
              [
                "Approve delivery",
                studentClick("commExternalApprove", id),
                true,
              ],
            ]
          : [],
    }),
  );
};

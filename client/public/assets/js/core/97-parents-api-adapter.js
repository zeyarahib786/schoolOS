/* Parents master data: authenticated records only; conversations load on demand. */
(function () {
  "use strict";
  function adapter() {
    return window.SCHOOLOS_ADAPTER;
  }
  async function allPages(path) {
    const rows = [];
    let page = 1,
      pages = 1;
    do {
      const result = await adapter().api(path + "?limit=100&page=" + page);
      rows.push(...(result.data || []));
      pages = result.meta?.pagination?.totalPages || 1;
      page++;
    } while (page <= pages);
    return rows;
  }
  function mapGuardian(row) {
    return {
      mongoId: row._id,
      id: row.refId,
      name: row.name,
      relation: row.relation,
      phone: row.phone,
      email: row.email || "",
      children: (row.studentIds || []).filter(Boolean).map((s) => s.refId),
      portal: row.portalStatus,
      userId: row.userId || null,
      lastLogin: row.lastLoginAt || null,
      pickup: row.pickupAuthorized,
      financial: row.financialResponsible,
      custody: row.custody,
      consents: row.consents || {},
      note: row.note || "",
      updatedAt: row.updatedAt,
    };
  }
  function mapMeeting(row) {
    return {
      id: row._id,
      time: row.startTime,
      date: String(row.date).slice(0, 10),
      parent: row.bookedGuardian?.name || row.bookedBy?.name || "",
      student: row.bookedForStudent?.name || "",
      studentId: row.bookedForStudent?._id,
      teacher: row.teacher?.name || "Unassigned",
      teacherMongoId: row.teacher?._id,
      status: row.status,
      room: row.room || "TBC",
      link: row.link || "",
      note: row.note || "",
    };
  }
  window.refreshParents = async function () {
    const api = adapter(),
      userId = api?.user?._id;
    if (
      !api?.connected ||
      !["Administrator", "Principal", "Parent"].includes(api.user.role)
    )
      return false;
    state.parentsLoad = "loading";
    try {
      const manager = api.user.role !== "Parent";
      const [guardians, meetings, broadcasts] = await Promise.all([
        allPages("/guardians"),
        allPages("/meetings"),
        manager ? allPages("/guardians/broadcasts") : Promise.resolve([]),
      ]);
      if (api.user?._id !== userId) return false;
      GUARDIANS = guardians.map(mapGuardian);
      MEETINGS = meetings.map(mapMeeting);
      PARENT_BROADCASTS = broadcasts;
      api.guardianRows = GUARDIANS;
      api.parentMeetings = MEETINGS;
      api.live.parents = true;
      api.live.parentMeetings = true;
      state.parentsLoad = "ready";
      if (state.module === "parents") render();
      return true;
    } catch (error) {
      if (api.user?._id !== userId) return false;
      GUARDIANS = [];
      MEETINGS = [];
      PARENT_BROADCASTS = [];
      MSG_THREADS = {};
      api.live.parents = false;
      state.parentsLoad = "error";
      state.parentsError = error.message;
      if (state.module === "parents") render();
      return false;
    }
  };
  const enter = window.enterApp;
  window.enterApp = function () {
    const result = enter.apply(this, arguments);
    arm();
    return result;
  };
  const lock = window.lockApp;
  window.lockApp = function () {
    GUARDIANS = null;
    MSG_THREADS = {};
    MEETINGS = [];
    PARENT_BROADCASTS = [];
    state.parentsLoad = "loading";
    state.parentsFilters = null;
    return lock.apply(this, arguments);
  };
  function arm() {
    let attempts = 0;
    const timer = setInterval(() => {
      if (adapter()?.connected) {
        clearInterval(timer);
        GUARDIANS = null;
        MSG_THREADS = {};
        MEETINGS = [];
        PARENT_BROADCASTS = [];
        window.refreshParents();
      } else if (++attempts >= 600) clearInterval(timer);
    }, 100);
  }
  arm();
})();

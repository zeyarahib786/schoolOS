const fs = require("fs");
try {
  fs.unlinkSync("/tmp/schoolos-students-seed-ready");
} catch {}
require("../students/server.cjs");
(async () => {
  for (
    let i = 0;
    i < 200 && !fs.existsSync("/tmp/schoolos-students-seed-ready");
    i++
  )
    await new Promise((r) => setTimeout(r, 200));
  if (!fs.existsSync("/tmp/schoolos-students-seed-ready"))
    throw Error("Base fixture seed failed");
  const base = "http://127.0.0.1:4400/api/v1";
  const login = await (
    await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "administrator@example.invalid",
        password: "LocalFixture123!",
      }),
    })
  ).json();
  const api = async (path, method = "GET", body) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + login.data.accessToken,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw Error(path + ": " + result.error?.message);
    return result.data;
  };
  await api("/auth/register", "POST", {
    name: "New QA Parent",
    email: "newparent@example.invalid",
    password: "LocalFixture123!",
    role: "Parent",
  });
  const students = await api("/students?limit=100");
  const gbody = (refId, ids, name) => ({
    refId,
    name,
    relation: "Mother",
    phone: "+971501234567",
    email: "parent@example.invalid",
    studentIds: ids,
    pickupAuthorized: false,
    financialResponsible: true,
    custody: "Not recorded",
    note: "School internal note",
    consents: { media: null, trips: false, medical: true },
  });
  const g = await api(
    "/guardians",
    "POST",
    gbody(
      "GRD-QA",
      [
        students.find((s) => s.refId === "QA-001")._id,
        students.find((s) => s.refId === "QA-002")._id,
      ],
      "QA Guardian",
    ),
  );
  await api("/guardians/" + g._id + "/account", "PATCH", {
    parentEmail: "parent@example.invalid",
    expectedUpdatedAt: g.updatedAt,
  });
  await api(
    "/guardians",
    "POST",
    gbody(
      "GRD-OTHER",
      [students.find((s) => s.refId === "QA-003")._id],
      "Other Guardian",
    ),
  );
  const teacher = await api("/staff", "POST", {
    refId: "EMP-QA",
    name: "QA Teacher",
    designation: "Teacher",
    department: "Primary",
    type: "Teaching",
    email: "teacher@example.invalid",
    phone: "+971501234567",
    joinedDate: "2020-01-01",
  });
  for (const time of ["09:00", "09:20", "09:40"])
    await api("/meetings", "POST", {
      teacherStaffId: teacher._id,
      date: "2026-12-10",
      startTime: time,
      room: "QA room",
    });
  fs.writeFileSync("/tmp/schoolos-parents-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

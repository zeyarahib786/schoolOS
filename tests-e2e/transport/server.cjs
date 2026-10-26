const fs = require("fs");
try {
  fs.unlinkSync("/tmp/schoolos-students-seed-ready");
} catch {}
require("../students/server.cjs");
(async () => {
  for (
    let n = 0;
    n < 200 && !fs.existsSync("/tmp/schoolos-students-seed-ready");
    n++
  )
    await new Promise((r) => setTimeout(r, 200));
  if (!fs.existsSync("/tmp/schoolos-students-seed-ready"))
    throw Error("Base seed failed");
  const base = "http://127.0.0.1:4400/api/v1",
    login = await (
      await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({role:'Administrator',
          email: "administrator@example.invalid",
          password: "LocalFixture123!",
        }),
      })
    ).json();
  const api = async (p, method = "GET", body) => {
    const res = await fetch(base + p, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + login.data.accessToken,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const j = await res.json();
    if (!res.ok) throw Error(p + JSON.stringify(j));
    return j.data;
  };
  const students = await api("/students?limit=100");
  students.sort((a, b) => a.refId.localeCompare(b.refId));
  for (let n = 0; n < 25; n++) {
    const vehicle = await api("/transport/vehicles", "POST", {
      regNumber: "QA-BUS-" + n,
      capacity: 3,
      driverName: "QA Driver",
      driverPhone: "+971501234567",
    });
    const route = await api("/transport/routes", "POST", {
      name: n === 0 ? "QA safe <img src=x onerror=alert(1)>" : "QA route " + n,
      vehicleId: vehicle._id,
      stops: [
        { name: "QA Stop", time: "07:30", address: "Fictional school stop" },
      ],
    });
    await api("/transport/routes/" + route._id + "/assign", "POST", {
      studentId: students[n === 0 ? 0 : n + 1]._id,
      stopName: "QA Stop",
    });
    if (n === 0)
      await api("/transport/routes/" + route._id + "/assign", "POST", {
        studentId: students[1]._id,
        stopName: "QA Stop",
      });
  }
  fs.writeFileSync("/tmp/schoolos-transport-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

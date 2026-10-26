const root = require("path").resolve(__dirname, "../../server");
const { MongoMemoryReplSet } = require(
  root + "/node_modules/mongodb-memory-server",
);
const mongoose = require(root + "/node_modules/mongoose");
(async () => {
  const db = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  Object.assign(process.env, {
    NODE_ENV: "test",
    MONGO_URI: db.getUri(),
    JWT_ACCESS_SECRET: "local-fix-test-secret-at-least-32-characters",
    JWT_REFRESH_SECRET: "local-fix-refresh-secret-at-least-32-characters",
    CORS_ALLOWED_ORIGINS: "http://127.0.0.1:5179",
    LOG_LEVEL: "error",
  });
  await mongoose.connect(db.getUri());
  const app = require(root + "/dist/app").createApp();
  const server = app.listen(4400, "127.0.0.1", () =>
    console.log("FIX_TEST_SERVER_READY"),
  );
  const stop = async () => {
    server.close();
    await mongoose.disconnect();
    await db.stop();
    process.exit();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  await fetch("http://127.0.0.1:4400/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Local QA Admin",
      email: "administrator@example.invalid",
      password: "LocalFixture123!",
      role: "Administrator",
    }),
  });
  const login = await (
    await fetch("http://127.0.0.1:4400/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({role:'Administrator',
        email: "administrator@example.invalid",
        password: "LocalFixture123!",
      }),
    })
  ).json();
  const ids = {};
  for (const role of [
    "Principal",
    "Teacher",
    "Accountant",
    "Parent",
    "Student",
  ]) {
    const res = await (
      await fetch("http://127.0.0.1:4400/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "QA " + role,
          email: role.toLowerCase() + "@example.invalid",
          password: "LocalFixture123!",
          role,
        }),
      })
    ).json();
    ids[role] = res.data.user._id;
  }
  for (let n = 0; n < 31; n++) {
    const res = await fetch("http://127.0.0.1:4400/api/v1/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + login.data.accessToken,
      },
      body: JSON.stringify({
        refId: "QA-" + String(n + 1).padStart(3, "0"),
        name: "QA Student " + String(n).padStart(2, "0"),
        grade: n % 2 ? "Grade 7 · B" : "Grade 7 · A",
        roll: n === 0 ? "007" : String(n + 1),
        gender: "Female",
        guardianName: "QA Guardian",
        phone: "+971501234567",
        ...(n === 0
          ? {
              guardianUserId: ids.Parent,
              studentUserId: ids.Student,
              guardianEmail: "parent@example.invalid",
            }
          : {}),
      }),
    });
    if (!res.ok) throw Error("Seed failed " + res.status);
    if (n === 0) {
      const student = (await res.json()).data;
      const uploaded = await fetch(
        "http://127.0.0.1:4400/api/v1/students/" +
          student._id +
          "/documents/photo",
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + login.data.accessToken,
            "Content-Type": "image/png",
            "X-File-Name": "QA-seed-photo.png",
          },
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE5kAAAAASUVORK5CYII=",
            "base64",
          ),
        },
      );
      if (!uploaded.ok) throw Error("Photo seed failed " + uploaded.status);
    }
  }
  require("fs").writeFileSync("/tmp/schoolos-students-seed-ready", "ready");
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

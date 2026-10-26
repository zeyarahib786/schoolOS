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
  const books = [];
  for (let n = 0; n < 26; n++)
    books.push(
      await api("/library/books", "POST", {
        isbn: "QA-ISBN-" + n,
        title:
          n === 0 ? "QA safe <img src=x onerror=alert(1)>" : "QA title " + n,
        author: "Fictional author",
        category: "QA reading",
        totalCopies: 4,
        shelf: "A" + n,
      }),
    );
  let ownLoan;
  for (let n = 0; n < 22; n++) {
    const loan = await api("/library/loans", "POST", {
      bookId: books[n]._id,
      studentId: students[n]._id,
      dueDate: "2099-01-01",
    });
    if (n === 0) ownLoan = loan;
  }
  const root = require("path").resolve(__dirname, "../../server");
  await require(root + "/dist/models/Loan").Loan.updateOne(
    { _id: ownLoan._id },
    { $set: { dueDate: new Date("2020-01-01"), status: "Overdue" } },
  );
  const parent = await (
    await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({role:'Parent',
        email: "parent@example.invalid",
        password: "LocalFixture123!",
      }),
    })
  ).json();
  for (const n of [3, 4, 5]) {
    const res = await fetch(base + "/library/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + parent.data.accessToken,
      },
      body: JSON.stringify({
        bookId: books[n]._id,
        studentId: students[0]._id,
        note: "Fictional reading request " + n,
      }),
    });
    if (!res.ok) throw Error("Seed request failed");
  }
  fs.writeFileSync("/tmp/schoolos-library-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

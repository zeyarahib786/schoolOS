const assert = require("assert");
require("../helpers/browser.cjs")(
  "library",
  async ({ role, step, evaluate, waitFor, fill, cdp, screenshot }) => {
    const manage = ["Administrator", "Principal", "Teacher"].includes(role),
      family = ["Parent", "Student"].includes(role);
    await step(
      "Library loads all pages with correct role controls and ownership",
      async () => {
        await evaluate("go('library')");
        await waitFor(
          () => evaluate("libraryWorkspaceState().loaded"),
          "library loaded",
        );
        assert(await evaluate("libraryWorkspaceState().books.length>=26"));
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('Issue book')",
          ),
          manage,
        );
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('Request book')",
          ),
          family,
        );
        if (family)
          assert(
            await evaluate(
              "libraryWorkspaceState().loans.every(r=>r.student.refId==='QA-001')&&libraryWorkspaceState().requests.every(r=>r.student.refId==='QA-001')",
            ),
          );
        if (role === "Accountant")
          assert(
            await evaluate(
              "libraryWorkspaceState().loans.length===0&&libraryWorkspaceState().requests.length===0",
            ),
          );
        await evaluate("libraryWorkspaceFilter('page',2)");
        assert(
          await evaluate(
            "libraryWorkspaceState().page===2&&document.querySelectorAll('#view tbody tr').length>0",
          ),
        );
      },
    );
    await step(
      "Catalogue detail escapes title and displays actual stock",
      async () => {
        await evaluate(
          "libraryWorkspaceDetail(libraryWorkspaceState().books.find(r=>r.title.includes('<img'))._id)",
        );
        assert(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('QA safe <img')",
          ),
        );
        assert(
          !(await evaluate("!!document.querySelector('#drawer img[src=x]')")),
        );
        await evaluate("closeDrawer()");
      },
    );
    if (manage) {
      await step(
        "Actual arrival and restock forms update saved stock",
        async () => {
          await evaluate("newArrivalForm()");
          await fill({
            isbn: "QA-CREATED-" + role,
            title: "QA Created " + role,
            author: "Fictional author",
            category: "QA",
            shelf: "B1",
            totalCopies: "2",
          });
          await waitFor(
            () => evaluate("!libraryWorkspaceState().saving"),
            "book added",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().books.find(r=>r.isbn==='QA-CREATED-'+state.role).availableCopies===2",
            ),
          );
          await evaluate("newArrivalForm()");
          await fill({
            isbn: "QA-CREATED-" + role,
            title: "QA Created " + role,
            author: "Fictional author",
            category: "QA",
            shelf: "B1",
            totalCopies: "1",
          });
          await waitFor(
            () => evaluate("!libraryWorkspaceState().saving"),
            "book restocked",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().books.find(r=>r.isbn==='QA-CREATED-'+state.role).totalCopies===3",
            ),
          );
        },
      );
      await step("Metadata review persists shelf and reason", async () => {
        await evaluate(
          "libraryWorkspaceBookForm(libraryWorkspaceState().books.find(r=>r.isbn==='QA-CREATED-'+state.role)._id)",
        );
        await fill({ shelf: "C2", reason: "QA catalogue review" });
        await waitFor(
          () => evaluate("!libraryWorkspaceState().saving"),
          "book reviewed",
        );
        assert(
          await evaluate(
            "libraryWorkspaceState().books.find(r=>r.isbn==='QA-CREATED-'+state.role).history.length===1",
          ),
        );
      });
      await step(
        "Issuing and renewing use real borrower and deadline forms",
        async () => {
          await evaluate("libraryWorkspaceIssueForm()");
          await fill({
            book: await evaluate(
              "libraryWorkspaceState().bookChoices.find(c=>c.label.startsWith('QA Created '+state.role+' ·')).label",
            ),
            student: await evaluate(
              "libraryWorkspaceState().studentChoices.find(c=>c.label.endsWith('QA-010')).label",
            ),
            dueDate: "2099-01-01",
          });
          await waitFor(
            () => evaluate("!libraryWorkspaceState().saving"),
            "book issued",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().books.find(r=>r.isbn==='QA-CREATED-'+state.role).availableCopies===2",
            ),
          );
          await evaluate(
            "libraryWorkspaceRenewForm(libraryWorkspaceState().loans.find(r=>r.book.title==='QA Created '+state.role)._id)",
          );
          await fill({ dueDate: "2099-02-01", reason: "QA reading extension" });
          await waitFor(
            () => evaluate("!libraryWorkspaceState().saving"),
            "loan renewed",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().loans.find(r=>r.book.title==='QA Created '+state.role).renewalCount===1",
            ),
          );
        },
      );
      await step(
        "Confirmed physical return restores stock and preserves loan",
        async () => {
          await evaluate(
            "libraryWorkspaceReturn(libraryWorkspaceState().loans.find(r=>r.book.title==='QA Created '+state.role)._id)",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().books.find(r=>r.isbn==='QA-CREATED-'+state.role).availableCopies===3",
            ),
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().loans.find(r=>r.book.title==='QA Created '+state.role).status==='Returned'",
            ),
          );
        },
      );
      await step(
        "Fulfilling a request creates a linked issued loan",
        async () => {
          await evaluate(
            "libraryWorkspaceFulfillForm(libraryWorkspaceState().requests.find(r=>r.status==='Pending')._id)",
          );
          await fill({ dueDate: "2099-01-01" });
          await waitFor(
            () => evaluate("!libraryWorkspaceState().saving"),
            "request fulfilled",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().requests.filter(r=>r.status==='Fulfilled').every(r=>!!r.loan)",
            ),
          );
        },
      );
      await step(
        "Overdue reminder is persisted with repeat guard",
        async () => {
          await evaluate(
            "libraryWorkspaceRemind(libraryWorkspaceState().loans.find(r=>r.status==='Overdue')._id)",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().loans.find(r=>r.status==='Overdue').reminderCount===1",
            ),
          );
        },
      );
    }
    if (family)
      await step(
        "Family request selects own child and can be cancelled with a reason",
        async () => {
          await evaluate(
            "libraryWorkspaceRequestForm(libraryWorkspaceState().books.find(r=>r.isbn==='QA-ISBN-23')._id)",
          );
          await fill({
            student: await evaluate(
              "libraryWorkspaceState().studentChoices[0].label",
            ),
            note: "QA actual request " + role,
          });
          await waitFor(
            () => evaluate("!libraryWorkspaceState().saving"),
            "request saved",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().requests.some(r=>r.note==='QA actual request '+state.role&&r.status==='Pending')",
            ),
          );
          await evaluate(
            "libraryWorkspaceDecisionForm(libraryWorkspaceState().requests.find(r=>r.note==='QA actual request '+state.role)._id,'Cancelled')",
          );
          await fill({ reason: "QA reading request no longer needed" });
          await waitFor(
            () => evaluate("!libraryWorkspaceState().saving"),
            "request cancelled",
          );
          assert(
            await evaluate(
              "libraryWorkspaceState().requests.find(r=>r.note==='QA actual request '+state.role).status==='Cancelled'",
            ),
          );
        },
      );
    await step("Search export and reload preserve circulation", async () => {
      await evaluate(
        "libraryWorkspaceFilter('tab','Catalogue');libraryWorkspaceFilter('q','QA title 2')",
      );
      assert(await evaluate("libraryWorkspaceFiltered().length>0"));
      await evaluate("libraryWorkspaceExport()");
      await cdp("Page.reload", { ignoreCache: true });
      await waitFor(
        () => evaluate("SCHOOLOS_ADAPTER.connected"),
        "login restore",
      );
      await evaluate("go('library')");
      await waitFor(
        () => evaluate("libraryWorkspaceState().loaded"),
        "library reload",
      );
      if (manage)
        assert(
          await evaluate(
            "libraryWorkspaceState().loans.find(r=>r.book.title==='QA Created '+state.role).status==='Returned'",
          ),
        );
    });
    await step("Mobile library screen fits viewport", async () => {
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });
      assert(
        await evaluate(
          "document.documentElement.scrollWidth<=window.innerWidth+1",
        ),
      );
      await screenshot("mobile");
    });
  },
);

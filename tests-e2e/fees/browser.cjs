const assert = require("assert");
require("../helpers/browser.cjs")(
  "fees",
  async ({ role, step, evaluate, api, waitFor, fill, cdp, screenshot }) => {
    const manager = ["Administrator", "Principal", "Accountant"].includes(role),
      allowed = manager || ["Parent", "Student"].includes(role);
    await waitFor(
      () => evaluate("SCHOOLOS_ADAPTER.feePayments!==undefined"),
      "Fee hydration",
    );
    await step('Central names localize fees without changing invoices or form values',async()=>{
      if(!allowed)return {restricted:true};
      await evaluate("go('fees');setLanguage('ar')");
      const invoice=await evaluate("INVOICES.find(i=>i.student&&i.student.trim().includes(' '))");
      if(invoice){
        const expected=await evaluate('schoolArabicDigits(schoolNameForLocale('+JSON.stringify(invoice.student)+',schoolPersonNames.get('+JSON.stringify(invoice.student)+')||{}))');
        assert(await evaluate('document.getElementById("view").textContent.includes('+JSON.stringify(expected)+')'));
        assert.strictEqual((await api('/fees?limit=100')).data.find(i=>i._id===invoice.mongoId).student.name,invoice.student);
      }
      await evaluate("setSubTab('fees-v','collections')");
      await evaluate("localizeView(document.getElementById('view'))");
      assert(!(await evaluate("document.getElementById('view').textContent.includes('actual payments for the filtered invoices')")));
      await evaluate("setLanguage('en');setSubTab('fees-v','invoices')");
    });
    await step("Finance role boundary and family-owned ledger", async () => {
      await evaluate("go('fees')");
      assert.strictEqual(
        await evaluate(
          "document.getElementById('view').textContent.includes('New invoice')",
        ),
        manager,
      );
      if (!allowed) {
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('restricted')",
          ),
        );
        return;
      }
      assert(
        await evaluate(
          manager
            ? "INVOICES.length>=31"
            : "INVOICES.length>=1&&INVOICES.every(i=>i.studentRef==='QA-001')",
        ),
      );
      if (!manager) {
        await assert.rejects(() => api("/fees/heads"));
      }
    });
    if (!allowed) return;
    await step("Search, pagination and actual overdue balances", async () => {
      await evaluate("feeSetFilter('q','NO-MATCH')");
      assert(
        await evaluate(
          "document.getElementById('view').textContent.includes('No invoices match')",
        ),
      );
      await evaluate("feeSetFilter('q','');feeSetFilter('status','Overdue')");
      assert.strictEqual(await evaluate("feeRows().length"), manager ? 31 : 1);
      if (manager) {
        await evaluate("feePage(1)");
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('Page 2')",
          ),
        );
        await evaluate("feePage(-1)");
      }
      await evaluate("feeSetFilter('status','')");
    });
    if (manager) {
      await step("Raise exact student invoice via saved form", async () => {
        await evaluate("feeInvoiceForm()");
        await fill({
          ref: "INV-BROWSER-" + role,
          student: "QA-001 · QA Student 00",
          term: "QA Transport " + role,
          amount: "200.25",
          due: "2026-12-01",
        });
        await waitFor(() => evaluate("!state.feeSaving"), "Invoice save");
        assert(
          await evaluate(
            "INVOICES.some(i=>i.id==='INV-BROWSER-'+state.role&&i.amt===200.25)",
          ),
        );
      });
      await step(
        "Partial collection, true receipt and duplicate-safe ledger",
        async () => {
          await evaluate("feePayForm('INV-BROWSER-'+state.role)");
          await fill({
            amount: "30.15",
            method: "Cash",
            reference: "QA " + role,
          });
          await waitFor(() => evaluate("!state.feeSaving"), "Payment save");
          assert(
            await evaluate(
              "INVOICES.find(i=>i.id==='INV-BROWSER-'+state.role).balance===170.1",
            ),
          );
          await evaluate("feeOpenInvoice('INV-BROWSER-'+state.role)");
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('30.15')",
            ),
          );
          await evaluate("closeDrawer()");
          await api(
            "/fees/" +
              (await evaluate(
                "INVOICES.find(i=>i.id==='INV-BROWSER-'+state.role).mongoId",
              )) +
              "/pay",
            "POST",
            {
              amount: 30.15,
              paymentMethod: "Cash",
              reference: "QA " + role,
              idempotencyKey: await evaluate("state.feePaymentKey"),
            },
          );
          await evaluate("SCHOOLOS_ADAPTER.hydrate()");
          assert(
            await evaluate(
              "INVOICES.find(i=>i.id==='INV-BROWSER-'+state.role).paid===30.15",
            ),
          );
        },
      );
      await step("Configure and archive persisted fee head", async () => {
        await evaluate("feeHeadForm()");
        await fill({
          name: "QA Fee " + role,
          appliesTo: "Grade 7",
          amount: "88.25",
          frequency: "Term",
        });
        await waitFor(() => evaluate("!state.feeSaving"), "Fee head save");
        assert(
          await evaluate(
            "SCHOOLOS_ADAPTER.feeHeads.some(h=>h.name==='QA Fee '+state.role)",
          ),
        );
        await evaluate(
          "feeHeadForm(SCHOOLOS_ADAPTER.feeHeads.find(h=>h.name==='QA Fee '+state.role)._id)",
        );
        await fill({ status: "Archived" });
        await waitFor(() => evaluate("!state.feeSaving"), "Fee archive");
        assert(
          await evaluate(
            "SCHOOLOS_ADAPTER.feeHeads.find(h=>h.name==='QA Fee '+state.role).status==='Archived'",
          ),
        );
      });
      await step("Preview selected in-app reminder then persist", async () => {
        await evaluate(
          "feeSetFilter('q','INV-BROWSER-'+state.role);sendFeeReminders()",
        );
        assert(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('in-app')",
          ),
        );
        await evaluate("feeRemindersConfirm()");
        await waitFor(() => evaluate("!state.feeSaving"), "Reminder save");
        const messages = await api("/messages?box=sent");
        assert(
          messages.data.some(
            (m) => m.subject.includes("fee") || m.subject.includes("Fee"),
          ),
        );
        await evaluate("feeSetFilter('q','')");
      });
    }
    await step(
      "CSV export uses real records and reload retains balances",
      async () => {
        assert(
          await evaluate(
            "(()=>{const original=studentDownloadCSV;let rows;studentDownloadCSV=(name,r)=>rows=r;feeExport();studentDownloadCSV=original;return rows.length===feeRows().length+1})()",
          ),
        );
        await cdp("Page.reload", { ignoreCache: true });
        await waitFor(
          () =>
            evaluate(
              "SCHOOLOS_ADAPTER.connected&&SCHOOLOS_ADAPTER.feePayments!==undefined",
            ),
          "Reload",
        );
        await evaluate("go('fees')");
        if (manager)
          assert(
            await evaluate(
              "INVOICES.find(i=>i.id==='INV-BROWSER-'+state.role).balance===170.1",
            ),
          );
      },
    );
    await step("Mobile ledger fits viewport", async () => {
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await evaluate("render()");
      assert(
        await evaluate("document.documentElement.scrollWidth<=innerWidth+2"),
      );
      await screenshot("mobile");
      await evaluate("feeOpenInvoice(INVOICES[0].id)");
      await screenshot("mobile-ledger");
    });
  },
);

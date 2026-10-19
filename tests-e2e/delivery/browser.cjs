const assert = require("assert");
require("../helpers/browser.cjs")(
  "delivery",
  async ({ role, step, evaluate, api, waitFor, fill, cdp }) => {
    const author = ["Administrator", "Principal", "Teacher"].includes(role),
      reviewer = ["Administrator", "Principal"].includes(role);
    await step("External delivery tab respects actual role", async () => {
      await evaluate("go('comm')");
      assert.strictEqual(
        await evaluate(
          "document.getElementById('view').textContent.includes('External deliveries')",
        ),
        author,
      );
      if (!author) {
        const denied = await evaluate(
          "SCHOOLOS_ADAPTER.api('/notifications').then(()=>false).catch(()=>true)",
        );
        assert(denied);
      }
    });
    if (author) {
      await step(
        "Configured email and deferred SMS statuses render",
        async () => {
          await evaluate("commTab('External deliveries')");
          await waitFor(
            () => evaluate("commState().deliveriesLoaded"),
            "Delivery loaded",
          );
          assert(
            await evaluate(
              "document.getElementById('view').textContent.includes('Resend configured')",
            ),
          );
          assert(
            await evaluate(
              "document.getElementById('view').textContent.includes('SMS: Setup pending')",
            ),
          );
        },
      );
      await step(
        "Real compose form persists safe body and correct approval state",
        async () => {
          await evaluate("commExternalCompose()");
          await fill({
            recipientEmail: "parent@example.invalid",
            channel: "Email",
            subject: "QA Delivery " + role,
            body: "Fictional <img src=x onerror=alert(1)> body",
          });
          await waitFor(
            () =>
              evaluate(
                "(commState().deliveries||[]).some(r=>r.subject==='QA Delivery '+state.role)",
              ),
            "Queued delivery",
          );
          assert.strictEqual(
            await evaluate(
              "commState().deliveries.find(r=>r.subject==='QA Delivery '+state.role).status",
            ),
            reviewer ? "Pending" : "Awaiting approval",
          );
          await evaluate(
            "commExternalDetail(commState().deliveries.find(r=>r.subject==='QA Delivery '+state.role)._id)",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('Fictional <img')",
            ),
          );
          assert(
            !(await evaluate(
              "document.querySelector('#drawer img[src=x]')!==null",
            )),
          );
          await evaluate("closeDrawer()");
        },
      );
      if (role === "Teacher")
        await step(
          "Teacher cannot self-approve an external message",
          async () => {
            const r = await api("/notifications", "POST", {
              recipientEmail: "parent@example.invalid",
              channel: "Email",
              subject: "QA Office Review",
              body: "Fictional approval test",
              idempotencyKey: "qa-review-" + Date.now(),
            });
            assert.strictEqual(r.data.status, "Awaiting approval");
            assert(
              await evaluate(
                "SCHOOLOS_ADAPTER.api('/notifications/" +
                  r.data._id +
                  "/approve',{method:'POST'}).then(()=>false).catch(()=>true)",
              ),
            );
          },
        );
      if (reviewer)
        await step("Office reviews and approves Teacher message", async () => {
          const candidate = await evaluate(
            "commState().deliveries.find(r=>r.status==='Awaiting approval')?._id||null",
          );
          if (candidate) {
            await evaluate(
              "commExternalApprove(" + JSON.stringify(candidate) + ")",
            );
            await waitFor(
              () =>
                evaluate(
                  "!commState().deliveryLoading && !commState().deliveries.some(r=>r._id===" +
                    JSON.stringify(candidate) +
                    "&&r.status==='Awaiting approval')",
                ),
              "Approved",
            );
          } else assert.strictEqual(role, "Principal");
        });
      await step("Cancel own queued message persists", async () => {
        await evaluate(
          "commExternalCancel(commState().deliveries.find(r=>r.subject==='QA Delivery '+state.role)._id)",
        );
        await waitFor(
          () =>
            evaluate(
              "commState().deliveries.find(r=>r.subject==='QA Delivery '+state.role).status==='Cancelled'",
            ),
          "Cancelled",
        );
      });
    }
    await step(
      "Certificate PDF download stays within role ownership",
      async () => {
        await evaluate("go('certificates')");
        const rows = await api("/certificates?limit=100");
        if (role === "Accountant") {
          assert.strictEqual(rows.data.length, 0);
          return;
        }
        assert(rows.data.length > 0);
        const cert = rows.data.find((c) => c.status === "Issued");
        assert(cert);
        const result = await evaluate(
          "SCHOOLOS_ADAPTER.apiBlob('/certificates/" +
            cert._id +
            "/pdf').then(async b=>({type:b.type,prefix:(await b.text()).slice(0,5)}))",
        );
        assert(result.type.includes("application/pdf"));
        assert.strictEqual(result.prefix, "%PDF-");
        await waitFor(()=>evaluate("certificatesWorkspaceState().loaded"),"Certificate workspace loaded");
        await evaluate("certificatesWorkspaceDetail("+JSON.stringify(cert._id)+")");
        assert(await evaluate("document.getElementById('drawer').textContent.includes('Signed PDF')"));
        await evaluate('closeDrawer()');
        await evaluate(
          "certificateDownloadPDF(" + JSON.stringify(cert._id) + ")",
        );
      },
    );
    if (reviewer)
      await step("School office creates signed binary PDF", async () => {
        const cert = (await api("/certificates?limit=100")).data.find(
          (c) => c.status === "Issued",
        );
        const bytes = await evaluate(
          "SCHOOLOS_ADAPTER.apiBlob('/certificates/" +
            cert._id +
            "/pdf?signed=true').then(async b=>({type:b.type,signature:(await b.text()).includes('/ByteRange')}))",
        );
        assert(bytes.type.includes("application/pdf"));
        assert(bytes.signature);
      });
    if (["Teacher", "Parent", "Student"].includes(role))
      await step(
        "Authorized reader downloads existing signed record",
        async () => {
          const cert = (await api("/certificates?limit=100")).data.find(
            (c) => c.status === "Issued",
          );
          assert(
            await evaluate(
              "SCHOOLOS_ADAPTER.apiBlob('/certificates/" +
                cert._id +
                "/pdf?signed=true').then(async b=>(await b.text()).includes('/ByteRange'))",
            ),
          );
        },
      );
    await step("Mobile view remains within viewport", async () => {
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
    });
  },
);

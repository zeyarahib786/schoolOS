const assert = require("assert");
require("../helpers/browser.cjs")(
  "communication",
  async ({ role, step, evaluate, api, waitFor, fill, cdp, screenshot }) => {
    const author = ["Administrator", "Principal", "Teacher"].includes(role),
      reviewer = ["Administrator", "Principal"].includes(role);
    await step(
      "All roles have private messaging and correct notice controls",
      async () => {
        await evaluate("go('comm')");
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('New notice')",
          ),
          author,
        );
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('New message')",
          ),
        );
        if (role === "Student")
          assert(!(await evaluate("ANN.some(a=>a.t==='QA Parents Notice')")));
      },
    );
    if (author) {
      await step(
        "Save and edit a real notice draft with safe literal HTML",
        async () => {
          await evaluate("newAnnouncementForm()");
          await fill({
            title: "QA Draft " + role,
            message: "QA notice <img src=x onerror=alert(1)>",
            audience: "Parents",
            pinned: "Pinned",
            action: "Draft",
          });
          await waitFor(() => evaluate("!state.commSaving"), "Draft save");
          assert(
            await evaluate(
              "ANN.some(a=>a.t==='QA Draft '+state.role&&a.status==='Draft')",
            ),
          );
          await evaluate(
            "commNoticeForm(ANN.findIndex(a=>a.t==='QA Draft '+state.role))",
          );
          await fill({
            message: "Updated QA notice <img src=x onerror=alert(1)>",
          });
          await waitFor(() => evaluate("!state.commSaving"), "Draft edit");
          assert(
            await evaluate(
              "ANN.find(a=>a.t==='QA Draft '+state.role).bd.startsWith('Updated')",
            ),
          );
          assert(
            !(await evaluate("document.querySelector('#view img[src=\"x\"]')")),
          );
        },
      );
      await step(
        "Preview actual audience and submit with version guard",
        async () => {
          await evaluate(
            "commNoticeReview(ANN.findIndex(a=>a.t==='QA Draft '+state.role),'Pending approval')",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('currently active portal accounts')",
            ),
          );
          await evaluate("commNoticeConfirm()");
          await waitFor(() => evaluate("!state.commSaving"), "Notice submit");
          assert(
            await evaluate(
              "ANN.find(a=>a.t==='QA Draft '+state.role).status==='Pending approval'",
            ),
          );
        },
      );
      if (reviewer)
        await step(
          "Return with reason, resubmit and publish explicitly",
          async () => {
            await evaluate(
              "commNoticeReview(ANN.findIndex(a=>a.t==='QA Draft '+state.role),'Draft')",
            );
            await evaluate(
              "document.getElementById('commReviewNote').value='QA revision requested';commNoticeConfirm()",
            );
            await waitFor(() => evaluate("!state.commSaving"), "Return notice");
            assert(
              await evaluate(
                "ANN.find(a=>a.t==='QA Draft '+state.role).reviewNote==='QA revision requested'",
              ),
            );
            await evaluate(
              "(async()=>{await commNoticeReview(ANN.findIndex(a=>a.t==='QA Draft '+state.role),'Pending approval');await commNoticeConfirm()})()",
            );
            await waitFor(() => evaluate("!state.commSaving"), "Resubmit");
            await evaluate(
              "(async()=>{await commNoticeReview(ANN.findIndex(a=>a.t==='QA Draft '+state.role),'Published');await commNoticeConfirm()})()",
            );
            await waitFor(
              () => evaluate("!state.commSaving"),
              "Publish notice",
            );
            assert(
              await evaluate(
                "ANN.find(a=>a.t==='QA Draft '+state.role).status==='Published'",
              ),
            );
          },
        );
    }
    await step(
      "Inbox opens real message and persists recipient read status",
      async () => {
        await evaluate("commTab('Inbox')");
        await waitFor(
          () => evaluate("commState().loaded&&!commState().loading"),
          "Inbox load",
        );
        assert(
          await evaluate(
            "commState().messages.some(m=>m.subject==='QA Welcome '+state.role)",
          ),
        );
        await evaluate(
          "commMessageDetail(commState().messages.find(m=>m.subject==='QA Welcome '+state.role)._id)",
        );
        assert(
          await evaluate(
            "commState().messages.find(m=>m.subject==='QA Welcome '+state.role).readAt!==null",
          ),
        );
        await evaluate("closeDrawer()");
      },
    );
    await step(
      "Private reply is saved in Sent with conversation link",
      async () => {
        await evaluate(
          "commCompose(commState().messages.find(m=>m.subject==='QA Welcome '+state.role)._id)",
        );
        await fill({ body: "QA reply " + role });
        await waitFor(
          () => evaluate("!state.commSaving&&!commState().loading"),
          "Reply send",
        );
        assert(
          await evaluate(
            "commState().tab==='Sent'&&commState().messages.some(m=>m.body==='QA reply '+state.role&&m.replyTo)",
          ),
        );
      },
    );
    await step(
      "Personal archive and restore persist independently",
      async () => {
        await evaluate(
          "commArchive(commState().messages.find(m=>m.body==='QA reply '+state.role)._id,true)",
        );
        await waitFor(() => evaluate("!state.commSaving"), "Archive");
        assert(
          !(await evaluate(
            "commState().messages.some(m=>m.body==='QA reply '+state.role)",
          )),
        );
        await evaluate("commTab('Archived')");
        await waitFor(
          () => evaluate("commState().loaded&&!commState().loading"),
          "Archive load",
        );
        assert(
          await evaluate(
            "commState().messages.some(m=>m.body==='QA reply '+state.role)",
          ),
        );
        await evaluate(
          "commArchive(commState().messages.find(m=>m.body==='QA reply '+state.role)._id,false)",
        );
        await waitFor(() => evaluate("!state.commSaving"), "Restore");
      },
    );
    await step("Compose new portal message via actual form", async () => {
      await evaluate("commCompose()");
      await fill({
        recipientEmail:
          role === "Administrator"
            ? "parent@example.invalid"
            : "administrator@example.invalid",
        subject: "QA New " + role,
        body: "QA private body <script>window.qaInjected=true</script>",
      });
      await waitFor(
        () => evaluate("!state.commSaving&&!commState().loading"),
        "Send new",
      );
      assert(
        await evaluate(
          "commState().messages.some(m=>m.subject==='QA New '+state.role)",
        ),
      );
      assert(!(await evaluate("window.qaInjected")));
    });
    await step("Search and reload keep saved private messages", async () => {
      await evaluate("commSearch('NO-MATCH')");
      assert(
        await evaluate(
          "document.getElementById('view').textContent.includes('No records match')",
        ),
      );
      await cdp("Page.reload", { ignoreCache: true });
      await waitFor(() => evaluate("SCHOOLOS_ADAPTER.connected"), "Reload");
      await evaluate("go('comm');commTab('Sent')");
      await waitFor(
        () => evaluate("commState().loaded&&!commState().loading"),
        "Sent reload",
      );
      assert(
        await evaluate(
          "commState().messages.some(m=>m.subject==='QA New '+state.role)",
        ),
      );
    });
    await step(
      "Mobile inbox fits screen with complete message drawer",
      async () => {
        await cdp("Emulation.setDeviceMetricsOverride", {
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          mobile: true,
        });
        await evaluate("commTab('Inbox')");
        await waitFor(
          () => evaluate("commState().loaded&&!commState().loading"),
          "Mobile inbox",
        );
        assert(
          await evaluate("document.documentElement.scrollWidth<=innerWidth+2"),
        );
        await screenshot("mobile");
        await evaluate("commMessageDetail(commState().messages[0]._id)");
        await screenshot("mobile-message");
      },
    );
  },
);

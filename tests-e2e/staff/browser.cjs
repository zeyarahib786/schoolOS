const assert = require("assert");
require("../helpers/browser.cjs")(
  "staff",
  async ({ role, step, evaluate, api, waitFor, fill, cdp, screenshot }) => {
    const office = ["Administrator", "Principal"].includes(role),
      staffRole = [
        "Administrator",
        "Principal",
        "Teacher",
        "Accountant",
      ].includes(role),
      payrollManager = office || role === "Accountant";
    await step('Arabic staff names designations phones and onboarding labels reverse correctly',async()=>{
      await evaluate("go('staff')");await waitFor(()=>evaluate('staffWorkspaceState().loaded'),'Staff loaded');
      const available=await evaluate('staffWorkspaceState().rows.length');
      if(!available)return {emptyRoleView:true};
      await evaluate("window.staffLocaleFixture=JSON.parse(JSON.stringify(staffWorkspaceState().rows[0]));Object.assign(staffWorkspaceState().rows[0],{name:'Joseph Thomas',designation:'Chief Accountant',phone:'+971504445566',annualLeaveRemaining:30,translations:undefined});setLanguage('ar')");
      assert(await evaluate("document.getElementById('view').textContent.includes('جوزيف توماس')&&document.getElementById('view').textContent.includes('رئيس المحاسبين')"));
      assert.deepStrictEqual(await evaluate("(()=>{const e=document.querySelector('#view [data-school-phone]');return [e.textContent,getComputedStyle(e).direction]})()"),['+٩٧١٥٠٤٤٤٥٥٦٦','ltr']);
      await evaluate('staffWorkspaceDetail(staffWorkspaceState().rows[0]._id)');
      assert.strictEqual(await evaluate("document.querySelector('#drawer h3').textContent"),'جوزيف توماس');
      assert(!(await evaluate("/Chief Accountant|calendar days|Offer letter accepted|Employment contract signed|Documents verified|Visa .* labour card processed|IT account & email setup/.test(document.getElementById('drawer').textContent)")));
      assert.deepStrictEqual(await evaluate("(()=>{const e=document.querySelector('#drawer [data-school-phone]');return [e.textContent,getComputedStyle(e).direction]})()"),['+٩٧١٥٠٤٤٤٥٥٦٦','ltr']);
      await screenshot('employee-profile-arabic');await evaluate("setLanguage('en')");
      assert.strictEqual(await evaluate("document.querySelector('#drawer h3').textContent"),'Joseph Thomas');
      await evaluate("closeDrawer();Object.assign(staffWorkspaceState().rows[0],window.staffLocaleFixture);delete window.staffLocaleFixture;render()");
    });
    await step(
      "Actual role-specific staff directory and no invented payroll figures",
      async () => {
        await evaluate("go('staff')");
        await waitFor(
          () => evaluate("staffWorkspaceState().loaded"),
          "Staff load",
        );
        const count = await evaluate("staffWorkspaceState().rows.length");
        if (office || role === "Accountant") assert(count >= 27);
        else if (role === "Teacher") assert.strictEqual(count, 1);
        else assert.strictEqual(count, 0);
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('Add employee')",
          ),
          office,
        );
        assert(
          !(await evaluate(
            "document.getElementById('view').textContent.includes('1,820,000')",
          )),
        );
      },
    );
    if (office) {
      await step(
        "Actual employee form creates and versions profile edits",
        async () => {
          await evaluate("staffWorkspaceForm()");
          await fill({
            refId: "QA-HR-" + role,
            name: "QA New Employee " + role,
            designation: "Coordinator",
            department: "QA Department",
            type: "Teaching",
            status: "Active",
            email: "qa-new-" + role.toLowerCase() + "@example.invalid",
            phone: "+971501234567",
            joinedDate: "2020-01-01",
            annualLeaveRemaining: "14",
          });
          await waitFor(
            () => evaluate("!staffWorkspaceState().saving"),
            "Staff save",
          );
          assert(
            await evaluate(
              "staffWorkspaceState().rows.some(r=>r.refId==='QA-HR-'+state.role)",
            ),
          );
          await evaluate(
            "staffWorkspaceForm(staffWorkspaceState().rows.find(r=>r.refId==='QA-HR-'+state.role)._id)",
          );
          await fill({
            department: "QA Updated Department",
            changeReason: "QA corrected department",
          });
          await waitFor(
            () => evaluate("!staffWorkspaceState().saving"),
            "Staff edit",
          );
          assert(
            await evaluate(
              "staffWorkspaceState().rows.find(r=>r.refId==='QA-HR-'+state.role).profileHistory.length===1",
            ),
          );
        },
      );
      await step(
        "Account link form can safely unlink without deleting employment history",
        async () => {
          await evaluate(
            "staffWorkspaceAccountForm(staffWorkspaceState().rows.find(r=>r.refId==='QA-HR-'+state.role)._id)",
          );
          await fill({ email: "", reason: "QA explicit unlinked profile" });
          await waitFor(
            () => evaluate("!staffWorkspaceState().saving"),
            "Account save",
          );
          assert(
            await evaluate(
              "staffWorkspaceState().rows.find(r=>r.refId==='QA-HR-'+state.role).profileHistory.length===2",
            ),
          );
        },
      );
    }
    if (office)
      await step(
        "Onboarding uploads, document views and checklist activation persist",
        async () => {
          await evaluate("staffWorkspaceForm()");
          await fill({
            refId: "QA-ONBOARD-" + role,
            name: "QA Onboarding " + role,
            designation: "Teacher",
            department: "QA Onboarding",
            type: "Teaching",
            status: "Onboarding",
            email: "qa-onboard-" + role.toLowerCase() + "@example.invalid",
            phone: "+971501234567",
            joinedDate: "2020-01-01",
            annualLeaveRemaining: "12",
          });
          await waitFor(
            () => evaluate("!staffWorkspaceState().saving"),
            "Onboarding save",
          );
          const id = await evaluate(
            "staffWorkspaceState().rows.find(r=>r.refId==='QA-ONBOARD-'+state.role)._id",
          );
          await evaluate("staffWorkspaceDetail(" + JSON.stringify(id) + ")");
          for (const key of ["id", "degree", "photo"]) {
            await evaluate(
              "document.getElementById('staffWorkspaceDocumentKey').value=" +
                JSON.stringify(key),
            );
            const root = (await cdp("DOM.getDocument")).root.nodeId,
              element = await cdp("DOM.querySelector", {
                nodeId: root,
                selector: "#drawer input[type=file]",
              });
            await cdp("DOM.setFileInputFiles", {
              nodeId: element.nodeId,
              files: [
                key === "photo"
                  ? "/tmp/schoolos-staff-qa.png"
                  : "/tmp/schoolos-staff-qa.pdf",
              ],
            });
            await waitFor(
              () =>
                evaluate(
                  "!staffWorkspaceState().saving&&staffWorkspaceState().rows.find(r=>r._id===" +
                    JSON.stringify(id) +
                    ").documents.some(d=>d.key===" +
                    JSON.stringify(key) +
                    ")",
                ),
              "Document upload " + key,
            );
          }
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('schoolos-staff-qa.pdf')",
            ),
          );
          await evaluate(
            "staffWorkspaceDocument(" + JSON.stringify(id) + ",'id',false)",
          );
          for (const key of [
            "offer",
            "contract",
            "visa",
            "account",
            "induction",
          ]) {
            await evaluate(
              "staffWorkspaceToggle(" +
                JSON.stringify(id) +
                "," +
                JSON.stringify(key) +
                ")",
            );
            await waitFor(
              () =>
                evaluate(
                  "staffWorkspaceState().rows.find(r=>r._id===" +
                    JSON.stringify(id) +
                    ").onboarding.find(t=>t.key===" +
                    JSON.stringify(key) +
                    ").done",
                ),
              "Checklist " + key,
            );
          }
          await evaluate("staffWorkspaceForm(" + JSON.stringify(id) + ")");
          await fill({
            status: "Active",
            changeReason: "QA verified completed onboarding",
          });
          await waitFor(
            () => evaluate("!staffWorkspaceState().saving"),
            "Activation",
          );
          assert(
            await evaluate(
              "staffWorkspaceState().rows.find(r=>r._id===" +
                JSON.stringify(id) +
                ").status==='Active'",
            ),
          );
        },
      );
    if (staffRole)
      await step(
        "Owned HR document available; unrelated private files stay hidden for Accountant",
        async () => {
          const own = await evaluate(
            "staffWorkspaceState().rows.find(r=>(r.userId?._id||r.userId)===commUserId())?._id||null",
          );
          assert(own);
          await evaluate("staffWorkspaceDetail(" + JSON.stringify(own) + ")");
          if (["Teacher", "Accountant"].includes(role)) {
            assert(
              await evaluate(
                "document.getElementById('drawer').textContent.includes('fictional-hr.pdf')",
              ),
            );
            const doc = await evaluate(
              "SCHOOLOS_ADAPTER.apiBlob('/staff/" +
                own +
                "/documents/id').then(async b=>({type:b.type,prefix:(await b.text()).slice(0,5)}))",
            );
            assert(doc.type.includes("application/pdf"));
            assert.strictEqual(doc.prefix, "%PDF-");
          }
          if (role === "Accountant")
            assert(
              await evaluate(
                "staffWorkspaceState().rows.filter(r=>(r.userId?._id||r.userId)!==commUserId()).every(r=>r.documents.length===0)",
              ),
            );
          await evaluate("closeDrawer()");
        },
      );
    if (staffRole) {
      await step(
        "Actual self attendance and own leave request persist",
        async () => {
          await evaluate(
            "staffWorkspaceState().tab='Leave & attendance';render();staffWorkspaceMarkAttendance()",
          );
          await fill({ status: "Remote" });
          await waitFor(
            () =>
              evaluate(
                "staffWorkspaceState().attendance.some(r=>(r.user?._id||r.user)===commUserId()&&r.status==='Remote')",
              ),
            "Attendance save",
          );
          await evaluate("staffWorkspaceLeaveForm()");
          const ownChoice = await evaluate(
            "staffWorkspaceState().choices.find(c=>staffWorkspaceState().rows.find(r=>r._id===c.id&&(r.userId?._id||r.userId)===commUserId())).label",
          );
          await fill({
            employee: ownChoice,
            type: "Annual leave",
            fromDate: "2026-12-01",
            toDate: "2026-12-02",
            reason: "QA Leave " + role,
          });
          await waitFor(
            () => evaluate("!staffWorkspaceState().saving"),
            "Leave request",
          );
          assert(
            await evaluate(
              "staffWorkspaceState().leave.some(r=>r.reason==='QA Leave '+state.role&&r.days===2)",
            ),
          );
        },
      );
      if (office)
        await step(
          "Office approves and cancels other employee leave with balance restoration",
          async () => {
            const employee = await evaluate(
              "staffWorkspaceState().rows.find(r=>r.refId==='HR-001')._id",
            );
            const made = await api("/leave", "POST", {
              staffId: employee,
              fromDate: "2026-12-10",
              toDate: "2026-12-11",
              reason: "QA office leave " + role,
            });
            await evaluate("staffWorkspaceLoad()");
            await evaluate(
              "staffWorkspaceLeaveReview(" +
                JSON.stringify(made.data._id) +
                ",'Approved')",
            );
            await fill({ note: "QA approved school leave" });
            await waitFor(
              () => evaluate("!staffWorkspaceState().saving"),
              "Office decision",
            );
            assert(
              await evaluate(
                "staffWorkspaceState().leave.find(r=>r._id===" +
                  JSON.stringify(made.data._id) +
                  ").status==='Approved'",
              ),
            );
            await evaluate(
              "staffWorkspaceLeaveCancelForm(" +
                JSON.stringify(made.data._id) +
                ")",
            );
            await fill({ reason: "QA leave cancellation" });
            await waitFor(
              () => evaluate("!staffWorkspaceState().saving"),
              "Leave cancellation",
            );
            assert(
              await evaluate(
                "staffWorkspaceState().leave.find(r=>r._id===" +
                  JSON.stringify(made.data._id) +
                  ").status==='Cancelled'",
              ),
            );
          },
        );
      await step("Own pending leave cancellation persists", async () => {
        await evaluate(
          "staffWorkspaceLeaveCancelForm(staffWorkspaceState().leave.find(r=>r.reason==='QA Leave '+state.role)._id)",
        );
        await fill({ reason: "QA pending cancellation" });
        await waitFor(
          () => evaluate("!staffWorkspaceState().saving"),
          "Own cancellation",
        );
        assert(
          await evaluate(
            "staffWorkspaceState().leave.find(r=>r.reason==='QA Leave '+state.role).status==='Cancelled'",
          ),
        );
      });
    }
    await step("Payroll role view respects owned salary records", async () => {
      await evaluate("go('payroll')");
      await waitFor(() => evaluate("payrollState().loaded"), "Payroll load");
      assert.strictEqual(
        await evaluate(
          "document.getElementById('view').textContent.includes('Generate payslip')",
        ),
        payrollManager,
      );
      if (role === "Teacher")
        assert(
          await evaluate(
            "payrollState().rows.every(r=>r.staff.refId==='HR-001')",
          ),
        );
      if (["Parent", "Student"].includes(role))
        assert.strictEqual(await evaluate("payrollState().rows.length"), 0);
    });
    if (payrollManager) {
      await step(
        "Generate and correct decimal payslip through real form",
        async () => {
          await evaluate("payrollForm()");
          const ref = {
              Principal: "HR-003",
              Accountant: "HR-002",
              Administrator: "HR-004",
            }[role],
            choice = await evaluate(
              "payrollState().choices.find(s=>s.label.startsWith('" +
                ref +
                " —')).label",
            );
          await fill({
            employee: choice,
            month: "2026-10",
            basicSalary: "1000.10",
            allowances: "50.20",
            deductions: "0.10",
          });
          await waitFor(
            () => evaluate("!payrollState().saving"),
            "Payroll save",
          );
          assert(
            await evaluate(
              "payrollState().rows.some(r=>r.staff.refId==='" +
                ref +
                "'&&r.month==='2026-10'&&r.netPay===1050.2)",
            ),
          );
          await evaluate(
            "payrollForm(payrollState().rows.find(r=>r.staff.refId==='" +
              ref +
              "'&&r.month==='2026-10')._id)",
          );
          await fill({
            basicSalary: "1000.20",
            correctionReason: "QA corrected basic salary",
          });
          await waitFor(
            () => evaluate("!payrollState().saving"),
            "Payroll correction",
          );
          assert(
            await evaluate(
              "payrollState().rows.find(r=>r.staff.refId==='" +
                ref +
                "'&&r.month==='2026-10').corrections.length===1",
            ),
          );
        },
      );
      await step(
        "Record fictional external payment reference and lock paid period",
        async () => {
          const ref = {
            Principal: "HR-003",
            Accountant: "HR-002",
            Administrator: "HR-004",
          }[role];
          await evaluate(
            "payrollPayForm(payrollState().rows.find(r=>r.staff.refId==='" +
              ref +
              "'&&r.month==='2026-10')._id)",
          );
          await fill({
            paidDate: "2026-10-01",
            paymentMethod: "Other",
            paymentReference: "QA-FICTIONAL-NO-TRANSFER-" + role,
          });
          await waitFor(
            () => evaluate("!payrollState().saving"),
            "Paid record",
          );
          assert(
            await evaluate(
              "payrollState().rows.find(r=>r.staff.refId==='" +
                ref +
                "'&&r.month==='2026-10').status==='Paid'",
            ),
          );
          await evaluate(
            "payrollDetailRecord(payrollState().rows.find(r=>r.staff.refId==='" +
              ref +
              "'&&r.month==='2026-10')._id)",
          );
          assert(
            !(await evaluate(
              "document.getElementById('drawer').textContent.includes('Correct payslip')",
            )),
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA-FICTIONAL')",
            ),
          );
          await evaluate("closeDrawer()");
        },
      );
    }
    if (staffRole)
      await step("Real authenticated payslip PDF download", async () => {
        const id = await evaluate("payrollState().rows[0]._id");
        const pdf = await evaluate(
          "SCHOOLOS_ADAPTER.apiBlob('/payroll/" +
            id +
            "/pdf').then(async b=>({type:b.type,prefix:(await b.text()).slice(0,5)}))",
        );
        assert(pdf.type.includes("application/pdf"));
        assert.strictEqual(pdf.prefix, "%PDF-");
        await evaluate("payrollDownloadPDF(" + JSON.stringify(id) + ")");
      });
    await step("Mobile payroll view fits viewport", async () => {
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

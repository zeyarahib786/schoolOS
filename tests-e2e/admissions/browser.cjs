const assert=require('assert');
require('../helpers/browser.cjs')('admissions',async({role,step,evaluate,waitFor,fill,api})=>{
 const manage=['Administrator','Principal','Teacher'].includes(role);
 await step('Admissions is staff-only and uses the configured academic year',async()=>{await evaluate("go('admissions')");if(!manage)assert(await evaluate("document.getElementById('view').textContent.includes('requires authorized school staff')"));else{assert(!(await evaluate("document.getElementById('view').textContent.includes('2025–26')")));assert(await evaluate("document.getElementById('view').textContent.includes(SCHOOLOS_ADAPTER.settings.academicYear)"));assert(!(await evaluate("document.querySelector('#view img[src=x]')")));}});
 if(!manage)return;
 await step('Duplicate-name applicants are selected by record identity',async()=>{const id=await evaluate("ADMISSIONS.filter(a=>a.name==='QA Same Applicant')[0].mongoId");await evaluate('openDrawer(admissionDetail('+JSON.stringify(id)+'))');assert(await evaluate("document.querySelector('#drawer .df').innerHTML.includes("+JSON.stringify(id)+")"));await evaluate('closeDrawer()');});
 await step('Create, advance and enroll an actual applicant with required documents',async()=>{
  await evaluate('admissionApplyForm()');await fill({first_name:'QA',last_name:role+' applicant',gender:'Male',grade:'Grade 7',guardian:'QA Guardian',phone:'123456789',source:'Website'});
  await waitFor(()=>evaluate("ADMISSIONS.some(a=>a.name==='QA '+state.role+' applicant'&&a.mongoId)"),'application created');const id=await evaluate("ADMISSIONS.find(a=>a.name==='QA '+state.role+' applicant').mongoId");
  for(const key of ['id','birth','photo'])await api('/admissions/'+id+'/documents/'+key+'/mark-received','POST');
  await evaluate('SCHOOLOS_ADAPTER.hydrate()');
  for(const status of ['Shortlisted','Interviewed','Accepted','Enrolled']){await evaluate('advanceAdmission('+JSON.stringify(id)+')');await waitFor(()=>evaluate('SCHOOLOS_ADAPTER.admissionStatus['+JSON.stringify(id)+']==='+JSON.stringify(status)),'stage '+status);}
  const students=await api('/students?search='+encodeURIComponent('QA '+role+' applicant'));assert(students.data.some(s=>s.name==='QA '+role+' applicant'));
  await evaluate('openDrawer(admissionDetail('+JSON.stringify(id)+'))');assert(!(await evaluate("document.getElementById('drawer').textContent.includes('Download enrolment pack')")));await evaluate('closeDrawer()');
 });
});

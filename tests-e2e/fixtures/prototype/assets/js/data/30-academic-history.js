/* ---- multi-year academic history ---- */
const CUR_AY_START=2025;
function gradeNum(label){const g=(label||'').split(' · ')[0].trim();if(g==='KG 1')return -1;if(g==='KG 2')return 0;const m=g.match(/Grade (\d+)/);return m?+m[1]:1}
function gradeLabel(n){return n<=-1?'KG 1':n===0?'KG 2':'Grade '+n}
function hashStr(s){let h=0;for(const c of String(s))h=c.charCodeAt(0)+((h<<5)-h);return Math.abs(h)}
function stuTenure(s){const cur=gradeNum(s.grade);const maxBack=cur-(-1)+1;return Math.max(1,Math.min(1+(hashStr(s.id||s.name)%5),maxBack))}
function stuEnrolledYear(s){return CUR_AY_START-(stuTenure(s)-1)}
function ayLabel(ys){return ys+'–'+String(ys+1).slice(2)}
function academicHistory(s){const cur=gradeNum(s.grade);const yrs=stuTenure(s);const out=[];
  for(let i=yrs-1;i>=0;i--){const ys=CUR_AY_START-i;const gN=cur-i;const h=hashStr((s.id||s.name)+ys);
    if(i===0){out.push({ay:ayLabel(ys),grade:gradeLabel(gN),gpa:String(s.gpa),att:s.att,result:'Current',fee:s.fee})}
    else{const gpa=(3.0+((h%95)/100)).toFixed(1);const att=85+(h%14);out.push({ay:ayLabel(ys),grade:gradeLabel(gN),gpa,att,result:'Promoted',fee:'Paid'})}}
  return out}
function downloadYearReport(id,ay,grade,gpa,att){const s=STUDENTS.find(x=>x.id===id);if(!s)return;
  const base=Math.round(58+(parseFloat(gpa)/4)*40);const subs=[['Mathematics',base+4],['Science',base+1],['English',base-1],['Arabic',base+3],['Social Studies',base-2]].map(x=>[x[0],Math.max(45,Math.min(99,x[1]))]);
  const grd=m=>m>=90?'A+':m>=80?'A':m>=70?'B':m>=60?'C':'D';const avg=Math.round(subs.reduce((a,b)=>a+b[1],0)/subs.length);
  const rows=subs.map(x=>`<tr><td>${x[0]}</td><td class="r">${x[1]}/100</td><td class="r"><span class="badge ${x[1]>=80?'g':x[1]>=60?'a':'rr'}">${grd(x[1])}</span></td></tr>`).join('');
  const html=docShell('Academic Report Card','Annual Report · '+ay,`
    <div class="grid"><div class="f"><span>Student</span><b>${s.name}</b></div><div class="f"><span>Admission no.</span><b>${s.id}</b></div>
    <div class="f"><span>Academic year</span><b>${ay}</b></div><div class="f"><span>Grade</span><b>${grade}</b></div>
    <div class="f"><span>Guardian</span><b>${s.guardian}</b></div><div class="f"><span>Attendance</span><b>${att}%</b></div></div>
    <table><thead><tr><th>Subject</th><th class="r">Marks</th><th class="r">Grade</th></tr></thead><tbody>${rows}
    <tr><td><b>Overall average</b></td><td class="r"><b>${avg}/100</b></td><td class="r"><span class="badge ${avg>=80?'g':'a'}">${grd(avg)}</span></td></tr></tbody></table>
    <div class="grid"><div class="f"><span>Year GPA</span><b>${gpa}</b></div><div class="f"><span>Result</span><b>Promoted</b></div></div>
    <div class="sign"><div><div class="ln"></div>Class Teacher</div><div><div class="ln"></div>Principal</div></div>`);
  downloadDoc('ReportCard_'+s.name.replace(/\s+/g,'_')+'_'+ay.replace(/[^0-9]/g,'')+'.html',html)}
function historyHtml(s){const h=academicHistory(s);return `<div class="card pad" style="box-shadow:none;padding:4px 12px">${h.slice().reverse().map(y=>`<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:9px 0">
  <div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">${y.ay} · ${y.grade}</div><div class="muted" style="font-size:11px">GPA ${y.gpa} · ${y.att}% attendance · fees ${y.fee}</div></div>
  <span class="badge ${y.result==='Current'?'b-blue':'b-green'}" style="margin-right:6px;font-size:10.5px">${y.result}</span>
  ${y.result==='Current'?'':`<button class="iconbtn" title="Download ${y.ay} report card" onclick="event.stopPropagation();downloadYearReport('${s.id}','${y.ay}','${y.grade}',${y.gpa},${y.att})">${ic('download',15)}</button>`}</div>`).join('')}</div>`}

const STUDENTS=[
 {id:'ANS-1042',name:'Fatima Al Hashimi',grade:'Grade 10 · A',gender:'F',roll:12,guardian:'Khalid Al Hashimi',phone:'+971 50 442 1180',fee:'Paid',att:97,gpa:3.9,status:'Active'},
 {id:'ANS-1043',name:'Yusuf Rahman',grade:'Grade 10 · A',gender:'M',roll:13,guardian:'Imran Rahman',phone:'+971 55 209 7741',fee:'Due',att:91,gpa:3.4,status:'Active'},
 {id:'ANS-1058',name:'Aisha Noor',grade:'Grade 9 · B',gender:'F',roll:7,guardian:'Salim Noor',phone:'+971 52 778 3320',fee:'Paid',att:99,gpa:4.0,status:'Active'},
 {id:'ANS-1061',name:'Omar Siddiqui',grade:'Grade 11 · C',gender:'M',roll:21,guardian:'Tariq Siddiqui',phone:'+971 50 116 2093',fee:'Overdue',att:84,gpa:3.1,status:'Active'},
 {id:'ANS-1077',name:'Layla Mansour',grade:'Grade 8 · A',gender:'F',roll:4,guardian:'Hassan Mansour',phone:'+971 56 330 8812',fee:'Paid',att:95,gpa:3.7,status:'Active'},
 {id:'ANS-1090',name:'Daniel George',grade:'Grade 12 · A',gender:'M',roll:2,guardian:'Mary George',phone:'+971 50 991 4420',fee:'Paid',att:93,gpa:3.8,status:'Active'},
 {id:'ANS-1103',name:'Zara Sheikh',grade:'Grade 7 · B',gender:'F',roll:18,guardian:'Adeel Sheikh',phone:'+971 55 612 0098',fee:'Due',att:88,gpa:3.5,status:'Active'},
 {id:'ANS-1118',name:'Ibrahim Khan',grade:'Grade 10 · B',gender:'M',roll:9,guardian:'Nadia Khan',phone:'+971 52 447 1900',fee:'Paid',att:96,gpa:3.6,status:'Active'},
 {id:'ANS-1124',name:'Sara Abdullah',grade:'Grade 9 · A',gender:'F',roll:11,guardian:'Yousef Abdullah',phone:'+971 50 778 5512',fee:'Paid',att:90,gpa:3.3,status:'Active'},
 {id:'ANS-1131',name:'Ethan Pereira',grade:'Grade 11 · A',gender:'M',roll:5,guardian:'Linda Pereira',phone:'+971 56 220 7741',fee:'Overdue',att:79,gpa:2.9,status:'Probation'},
 {id:'ANS-1145',name:'Mariam Saleh',grade:'Grade 8 · B',gender:'F',roll:14,guardian:'Fahad Saleh',phone:'+971 55 901 3340',fee:'Paid',att:98,gpa:3.9,status:'Active'},
 {id:'ANS-1152',name:'Hamza Ali',grade:'Grade 12 · B',gender:'M',roll:16,guardian:'Reema Ali',phone:'+971 50 334 9921',fee:'Due',att:92,gpa:3.5,status:'Active'},
 {id:'ANS-1161',name:'Maya Haddad',grade:'KG 1 · A',gender:'F',roll:6,guardian:'Salma Haddad',phone:'+971 50 552 1133',fee:'Paid',att:96,gpa:0,status:'Active'},
 {id:'ANS-1168',name:'Adam Farouk',grade:'KG 2 · B',gender:'M',roll:9,guardian:'Nabil Farouk',phone:'+971 55 419 7740',fee:'Paid',att:94,gpa:0,status:'Active'},
 {id:'ANS-1174',name:'Lina Saeed',grade:'Grade 1 · A',gender:'F',roll:3,guardian:'Omar Saeed',phone:'+971 52 880 4421',fee:'Due',att:97,gpa:0,status:'Active'},
 {id:'ANS-1182',name:'Karim Nasser',grade:'Grade 3 · B',gender:'M',roll:12,guardian:'Huda Nasser',phone:'+971 56 233 9081',fee:'Paid',att:93,gpa:3.6,status:'Active'},
 {id:'ANS-1190',name:'Hana Yousef',grade:'Grade 5 · A',gender:'F',roll:8,guardian:'Tarek Yousef',phone:'+971 50 661 2204',fee:'Paid',att:99,gpa:3.8,status:'Active'},
];
/* scale demo: generate a larger cohort so pagination & performance are demonstrable */
(function seedCohort(){const fn=['Aryan','Zainab','Lucas','Fatima','Ravi','Mei','Omar','Sara','Youssef','Amara','Diego','Nadia','Ivan','Leila','Kofi','Priya','Hassan','Elena','Tomas','Aisha','Bilal','Grace','Noah','Yuki','Idris','Lina','Marco','Hind','Sami','Zoe','Rehan','Dina','Karan','Maya','Faisal','Anaya','Ethan','Salma','Jibril','Rania','Kabir','Nour','Adam','Lara','Tariq','Mira'];
  const ln=['Khan','Ahmed','Silva','Rahman','Patel','Chen','Ali','Haddad','Farouk','Osei','Reyes','Mansour','Petrov','Saeed','Mensah','Nair','Yousef','Costa','Novak','Noor'];
  const grades=['KG 1 · A','KG 2 · B','Grade 1 · A','Grade 2 · A','Grade 3 · B','Grade 4 · A','Grade 5 · A','Grade 6 · A','Grade 7 · B','Grade 8 · A','Grade 9 · B','Grade 10 · A','Grade 11 · C','Grade 12 · A'];
  const fees=['Paid','Paid','Paid','Due','Overdue'];let id=1200;
  for(let i=0;i<45;i++){const h=(i*2654435761)>>>0;const name=fn[i%fn.length]+' '+ln[(i*7)%ln.length];const g=grades[h%grades.length];
    STUDENTS.push({id:'ANS-'+(id+i),name,grade:g,gender:h%2?'M':'F',roll:20+i,guardian:ln[(i*7)%ln.length]+' family',phone:'+971 5'+(i%9)+' '+(100+i%800)+' '+(1000+h%9000),fee:fees[h%fees.length],att:78+h%22,gpa:+(2.6+((h%140)/100)).toFixed(1),status:'Active'});}
})();
const STAFF=[
 {id:'EMP-204',name:'Dr. Amina Yusuf',role:'Head of Science',dept:'Science',type:'Teaching',phone:'+971 50 220 1144',status:'Active'},
 {id:'EMP-209',name:'Rohan Mehta',role:'Mathematics Teacher',dept:'Mathematics',type:'Teaching',phone:'+971 55 661 7782',status:'Active'},
 {id:'EMP-218',name:'Grace Williams',role:'English Coordinator',dept:'Languages',type:'Teaching',phone:'+971 52 110 9930',status:'Active'},
 {id:'EMP-231',name:'Khalid Noori',role:'IT Administrator',dept:'Operations',type:'Non-Teaching',phone:'+971 50 447 2218',status:'Active'},
 {id:'EMP-240',name:'Sana Iqbal',role:'School Counsellor',dept:'Student Support',type:'Teaching',phone:'+971 56 778 1290',status:'On Leave'},
 {id:'EMP-255',name:'Joseph Thomas',role:'Accounts Officer',dept:'Finance',type:'Non-Teaching',phone:'+971 55 330 6612',status:'Active'},
 {id:'EMP-262',name:'Fatima Bello',role:'Physics Teacher',dept:'Science',type:'Teaching',phone:'+971 50 901 2245',status:'Onboarding',joined:'Today'},
];
const ADMISSIONS=[
 {name:'Hanan Qureshi',grade:'Grade 6',stage:'Application',date:'12 Jun',src:'Website',dob:'2014-03-11',guardian:'Bilal Qureshi',phone:'+971 50 771 2204'},
 {name:'Leon Fernandes',grade:'Grade 9',stage:'Assessment',date:'11 Jun',src:'Referral',dob:'2011-07-22',guardian:'Maria Fernandes',phone:'+971 55 209 3318'},
 {name:'Noor Saeed',grade:'KG 2',stage:'Interview',date:'10 Jun',src:'Walk-in',dob:'2020-01-09',guardian:'Saeed Al Marri',phone:'+971 52 884 1190'},
 {name:'Ali Haider',grade:'Grade 4',stage:'Offer',date:'09 Jun',src:'Website',dob:'2016-05-30',guardian:'Reema Haider',phone:'+971 50 332 8841'},
 {name:'Priya Nair',grade:'Grade 7',stage:'Enrolled',date:'08 Jun',src:'Agent',dob:'2013-09-14',guardian:'Anil Nair',phone:'+971 56 110 7723'},
];
const STAGES=['Application','Assessment','Interview','Offer','Enrolled'];
let ANN=[
 {t:'Parent–Teacher Conference · Term 2',by:'Principal Office',tm:'2h ago',bd:'PTC for Grades 6–12 is scheduled for Saturday, 21 June. Booking opens in the Parent portal on Tuesday.',ic:'comm',c:'green',aud:'All Parents'},
 {t:'Annual Science Exhibition',by:'Dr. Amina Yusuf',tm:'Yesterday',bd:'Project submissions for the Science Exhibition close on 18 June. Mentors, please verify your team rosters.',ic:'lms',c:'blue',aud:'Grades 8–12'},
 {t:'Bus Route 7 — Temporary Change',by:'Transport Desk',tm:'2 days ago',bd:'Due to road works on Al Wasl Road, Route 7 pickup moves 10 minutes earlier from Monday.',ic:'trans',c:'amber',aud:'Route 7 Families'},
 {t:'Term 2 Fee Reminder',by:'Accounts Office',tm:'3 days ago',bd:'Term 2 invoices are due on 20 June. Pay via the Parent portal to avoid a late-payment charge.',ic:'fees',c:'green',aud:'Pending Payers'},
 {t:'Library Week — Author Visit',by:'Library Desk',tm:'last week',bd:'Emirati author Maitha Al Khayat joins us on 24 June for a reading and Q&A with Grades 4–7.',ic:'lib',c:'blue',aud:'Grades 4–7'},
];
let EXAMRESULTS=[
 {name:'Aisha Noor',cls:'9-B',mat:91,sci:97,eng:93,grade:'A+',rank:1},
 {name:'Fatima Al Hashimi',cls:'10-A',mat:96,sci:94,eng:89,grade:'A+',rank:2},
 {name:'Ibrahim Khan',cls:'10-B',mat:88,sci:82,eng:90,grade:'A',rank:4},
 {name:'Yusuf Rahman',cls:'10-A',mat:74,sci:80,eng:71,grade:'B+',rank:18},
 {name:'Omar Siddiqui',cls:'11-C',mat:61,sci:58,eng:66,grade:'C',rank:74},
 {name:'Ethan Pereira',cls:'11-A',mat:48,sci:52,eng:55,grade:'D',rank:119},
];
const INVOICES=[
 {id:'INV-25-3391',student:'Fatima Al Hashimi',term:'Term 2 Tuition',amt:8500,status:'Paid',due:'01 Jun'},
 {id:'INV-25-3392',student:'Yusuf Rahman',term:'Term 2 Tuition',amt:8500,status:'Due',due:'20 Jun'},
 {id:'INV-25-3393',student:'Omar Siddiqui',term:'Term 2 + Transport',amt:11200,status:'Overdue',due:'05 Jun'},
 {id:'INV-25-3394',student:'Layla Mansour',term:'Term 2 Tuition',amt:7800,status:'Paid',due:'01 Jun'},
 {id:'INV-25-3395',student:'Ethan Pereira',term:'Term 2 + Transport',amt:11200,status:'Overdue',due:'05 Jun'},
 {id:'INV-25-3396',student:'Zara Sheikh',term:'Term 2 Tuition',amt:7200,status:'Due',due:'20 Jun'},
];
const TT=[ // [period time, Mon..Fri]
 ['08:00', ['Mathematics|Rm 204','English|Rm 110','Physics|Lab 2','Mathematics|Rm 204','Arabic|Rm 130']],
 ['09:00', ['Physics|Lab 2','Mathematics|Rm 204','Chemistry|Lab 1','Biology|Lab 3','Mathematics|Rm 204']],
 ['10:00', ['BREAK','BREAK','BREAK','BREAK','BREAK']],
 ['10:30', ['English|Rm 110','Islamic St.|Rm 130','Mathematics|Rm 204','English|Rm 110','Physics|Lab 2']],
 ['11:30', ['Chemistry|Lab 1','PE|Court','English|Rm 110','Computer|Lab IT','Chemistry|Lab 1']],
 ['12:30', ['FREE','Biology|Lab 3','FREE','Arabic|Rm 130','Library|Lib']],
];
const SUBJCOLOR={Mathematics:'blue',English:'green',Physics:'amber',Chemistry:'red',Biology:'green','Islamic St.':'gray',Arabic:'gray',PE:'blue',Computer:'blue','Library':'gray','Biology ':'green'};


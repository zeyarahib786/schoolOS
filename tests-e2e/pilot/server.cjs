const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../server');
try{fs.unlinkSync('/tmp/schoolos-students-seed-ready')}catch{}
require('../students/server.cjs');
(async()=>{
  for(let n=0;n<200&&!fs.existsSync('/tmp/schoolos-students-seed-ready');n++)await new Promise(resolve=>setTimeout(resolve,200));
  if(!fs.existsSync('/tmp/schoolos-students-seed-ready'))throw Error('Base seed failed');
  const {Student}=require(root+'/dist/models/Student'),{User}=require(root+'/dist/models/User'),{Attendance}=require(root+'/dist/models/Attendance'),{Invoice}=require(root+'/dist/models/Invoice'),{ClassSection}=require(root+'/dist/models/ClassSection');
  const admin=await User.findOne({email:'administrator@example.invalid'}).lean();
  const students=[];
  for(let n=0;n<3000;n++){
    const grade=Math.floor(n/250)+1,section=String.fromCharCode(65+Math.floor(n%250/50));
    students.push({refId:'PILOT-'+String(n+1).padStart(4,'0'),name:'Pilot Student '+String(n+1).padStart(4,'0'),grade:'Grade '+grade+' · '+section,roll:String(n%50+1),gender:n%2?'Female':'Male',status:'Active',guardianName:'Fictional Guardian '+(n+1),guardianEmail:'family'+n+'@example.invalid',phone:'+971500000000',translations:{ar:{name:'طالب تجريبي '+(n+1),guardianName:'ولي أمر تجريبي '+(n+1)}}});
  }
  const rows=await Student.insertMany(students);
  const classes=[];
  for(let grade=1;grade<=12;grade++)for(const section of ['A','B','C','D','E'])classes.push({grade:'Grade '+grade,section,capacity:80,room:'Room '+grade+section,stream:'General'});
  await ClassSection.insertMany(classes);
  await Attendance.insertMany(rows.flatMap((student,n)=>['2026-10-08','2026-10-09'].map(date=>({student:student._id,date:new Date(date),session:'AM',status:n%20===0?'Absent':n%15===0?'Late':'Present',markedBy:admin._id}))));
  await Invoice.insertMany(rows.map((student,n)=>({refId:'INV-PILOT-'+String(n+1).padStart(4,'0'),student:student._id,term:'Pilot Term 1',amount:1000.25,paidAmount:0,dueDate:new Date('2026-11-01'),status:'Pending'})));
  const base='http://127.0.0.1:4400/api/v1';
  const login=await(await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'administrator@example.invalid',password:'LocalFixture123!'})})).json();
  const headers={'Content-Type':'application/json',Authorization:'Bearer '+login.data.accessToken};
  const settings=await(await fetch(base+'/settings',{headers})).json();
  const response=await fetch(base+'/settings',{method:'PUT',headers,body:JSON.stringify({...settings.data,schoolName:'Fictional Pilot School',academicYear:'2026-2027',timezone:'Asia/Dubai',currency:'AED',disabledModules:[],expectedRevision:settings.data.revision})});
  if(!response.ok)throw Error('Pilot settings failed '+response.status);
  fs.writeFileSync('/tmp/schoolos-pilot-seed-ready','ready');
})().catch(error=>{console.error(error.message);process.exit(1)});

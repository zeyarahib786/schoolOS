/* ---- Operations & academics module data ---- */
let LIBLOANS=[
 {title:'Sapiens: A Brief History',author:'Y. N. Harari',borrower:'Fatima Al Hashimi',cls:'10-A',due:'18 Jun',status:'On loan'},
 {title:'The Hobbit',author:'J. R. R. Tolkien',borrower:'Zara Sheikh',cls:'7-B',due:'09 Jun',status:'Overdue'},
 {title:'A Brief History of Time',author:'Stephen Hawking',borrower:'Ibrahim Khan',cls:'10-B',due:'21 Jun',status:'On loan'},
 {title:'To Kill a Mockingbird',author:'Harper Lee',borrower:'Layla Mansour',cls:'8-A',due:'07 Jun',status:'Overdue'},
 {title:'The Alchemist',author:'Paulo Coelho',borrower:'Daniel George',cls:'12-A',due:'24 Jun',status:'On loan'},
 {title:'Introduction to Algorithms',author:'Cormen et al.',borrower:'Hamza Ali',cls:'12-B',due:'26 Jun',status:'Reserved'},
];
let ROUTES=[
 {r:'Route 1 · Jumeirah',bus:'DXB-4412',driver:'Saeed Al Marri',driverPhone:'+971 50 221 4471',riders:38,cap:42,onTime:98,status:'On road',gpsId:'GPS-4412',
  stops:[{name:'Jumeirah Beach Rd',time:'06:45',lat:25.2048,lng:55.2500},{name:'Al Wasl Rd Junction',time:'06:55',lat:25.1972,lng:55.2431},{name:'Safa Park Gate',time:'07:05',lat:25.1900,lng:55.2378},{name:'Al Noor International',time:'07:20',lat:25.1150,lng:55.2010}]},
 {r:'Route 3 · Al Barsha',bus:'DXB-4419',driver:'Rakesh Nair',driverPhone:'+971 55 332 8810',riders:41,cap:42,onTime:96,status:'On road',gpsId:'GPS-4419',
  stops:[{name:'Al Barsha Mall',time:'06:40',lat:25.1122,lng:55.2010},{name:'Mall of the Emirates',time:'06:50',lat:25.1180,lng:55.2003},{name:'Sheikh Zayed Rd Exit 36',time:'07:02',lat:25.1160,lng:55.2050},{name:'Al Noor International',time:'07:20',lat:25.1150,lng:55.2010}]},
 {r:'Route 5 · Mirdif',bus:'DXB-4421',driver:'Imran Qadir',driverPhone:'+971 52 118 6620',riders:33,cap:38,onTime:99,status:'Depot',gpsId:'GPS-4421',
  stops:[{name:'Mirdif City Centre',time:'06:35',lat:25.2170,lng:55.4210},{name:'Uptown Mirdif',time:'06:48',lat:25.2200,lng:55.4100},{name:'Al Rebat St',time:'07:05',lat:25.1700,lng:55.3200},{name:'Al Noor International',time:'07:25',lat:25.1150,lng:55.2010}]},
 {r:'Route 7 · Al Wasl',bus:'DXB-4430',driver:'John Mathew',driverPhone:'+971 56 774 9012',riders:36,cap:42,onTime:91,status:'Delayed',gpsId:'GPS-4430',
  stops:[{name:'Al Wasl Rd - City Walk',time:'06:42',lat:25.2010,lng:55.2560},{name:'Jumeirah Rd Junction',time:'06:55',lat:25.1930,lng:55.2470},{name:'Al Noor International',time:'07:22',lat:25.1150,lng:55.2010}]},
];
let PAYRUN=[
 {name:'Dr. Amina Yusuf',dept:'Science',gross:32000,ded:4200,status:'Processed'},
 {name:'Rohan Mehta',dept:'Mathematics',gross:18500,ded:2100,status:'Processed'},
 {name:'Grace Williams',dept:'Languages',gross:19500,ded:2300,status:'Processed'},
 {name:'Khalid Noori',dept:'Operations',gross:16000,ded:1700,status:'Pending'},
 {name:'Sana Iqbal',dept:'Student Support',gross:17500,ded:1950,status:'Pending'},
 {name:'Joseph Thomas',dept:'Finance',gross:21000,ded:2500,status:'Processed'},
];
const EXPENSES=[
 {cat:'Facilities & Maintenance',budget:520000,spent:418000,c:'green'},
 {cat:'IT & Technology',budget:300000,spent:264000,c:'blue'},
 {cat:'Academic Resources',budget:240000,spent:151000,c:'green'},
 {cat:'Transport & Fuel',budget:180000,spent:172000,c:'amber'},
 {cat:'Events & Activities',budget:120000,spent:131000,c:'red'},
];
let CURRIC=[
 {sub:'Mathematics',grades:'1–12',units:48,done:44,c:'blue'},
 {sub:'English',grades:'1–12',units:42,done:39,c:'green'},
 {sub:'Science',grades:'1–8',units:36,done:30,c:'amber'},
 {sub:'Physics',grades:'9–12',units:28,done:22,c:'amber'},
 {sub:'Chemistry',grades:'9–12',units:26,done:21,c:'red'},
 {sub:'Islamic Studies',grades:'1–12',units:24,done:23,c:'green'},
];
let COURSES=[
 {t:'Algebra II — Functions',teacher:'Rohan Mehta',cls:'10-A',prog:72,due:'3 assignments'},
 {t:'Organic Chemistry Basics',teacher:'Dr. Amina Yusuf',cls:'11-C',prog:54,due:'1 quiz due'},
 {t:'English Literature — Poetry',teacher:'Grace Williams',cls:'9-B',prog:88,due:'On track'},
 {t:'Intro to Python',teacher:'Khalid Noori',cls:'12-B',prog:35,due:'2 labs due'},
 {t:'Arabic Language — Grammar',teacher:'Sana Iqbal',cls:'8-A',prog:61,due:'1 assignment'},
 {t:'World History — Ancient Civilisations',teacher:'Grace Williams',cls:'7-B',prog:79,due:'On track'},
 {t:'Biology — Cell Structure',teacher:'Dr. Amina Yusuf',cls:'9-B',prog:45,due:'Practical due'},
 {t:'Physics — Forces & Motion',teacher:'Rohan Mehta',cls:'10-A',prog:58,due:'2 assignments'},
 {t:'Foundations of Reading',teacher:'Grace Williams',cls:'3-B',prog:92,due:'On track'},
 {t:'Islamic Studies',teacher:'Sh. Khalid Al Ameri',cls:'5-A',prog:83,due:'On track'},
];
const HOSTEL=[
 {block:'Falcon Block (Boys)',code:'FB',beds:120,filled:108,rooms:34,floors:3,warden:'Mr. Idris Rahman',assist:'Mr. Samuel Oke',c:'blue'},
 {block:'Oryx Block (Girls)',code:'OB',beds:120,filled:104,rooms:34,floors:3,warden:'Ms. Farah Al Amiri',assist:'Ms. Priya Nair',c:'green'},
];
let HROOMS=[
 {no:'FB-101',block:'Falcon Block (Boys)',floor:1,type:'4-bed',cap:4,occ:['Yusuf Rahman','Hamza Ali','Zaid Omar','Bilal Khan'],status:'Full'},
 {no:'FB-102',block:'Falcon Block (Boys)',floor:1,type:'4-bed',cap:4,occ:['Daniel George','Ethan Pereira','Omar Siddiqui'],status:'Available'},
 {no:'FB-103',block:'Falcon Block (Boys)',floor:1,type:'2-bed',cap:2,occ:['Ali Hassan','Ryan Thomas'],status:'Full'},
 {no:'FB-203',block:'Falcon Block (Boys)',floor:2,type:'4-bed',cap:4,occ:['Karim Fadel','Jason Lee'],status:'Maintenance'},
 {no:'FB-205',block:'Falcon Block (Boys)',floor:2,type:'3-bed',cap:3,occ:['Musa Diallo','Leo Martins','Adam Farooq'],status:'Full'},
 {no:'OB-201',block:'Oryx Block (Girls)',floor:2,type:'4-bed',cap:4,occ:['Aisha Noor','Sara Abdullah','Layla Mansour','Zara Sheikh'],status:'Full'},
 {no:'OB-204',block:'Oryx Block (Girls)',floor:2,type:'4-bed',cap:4,occ:['Mariam Saleh','Hana Yusuf','Nadia Karim'],status:'Available'},
 {no:'OB-205',block:'Oryx Block (Girls)',floor:2,type:'2-bed',cap:2,occ:['Emily Watson','Fatima Zahra'],status:'Full'},
 {no:'OB-110',block:'Oryx Block (Girls)',floor:1,type:'3-bed',cap:3,occ:['Amira Saeed','Grace Kim'],status:'Available'},
 {no:'OB-208',block:'Oryx Block (Girls)',floor:2,type:'4-bed',cap:4,occ:['Yara Fahim','Sofia Reyes','Aaliyah Musa','Reem Khalid'],status:'Full'},
];
let BOARDERS=[
 {name:'Yusuf Rahman',id:'ANS-1043',grade:'Grade 10 · A',room:'FB-101',block:'Falcon Block (Boys)',guardian:'Imran Rahman',phone:'+971 55 209 7741',fee:'Due',medical:'Asthma — inhaler on file',joined:'Aug 2023',roll:'Present'},
 {name:'Hamza Ali',id:'ANS-1071',grade:'Grade 12 · B',room:'FB-101',block:'Falcon Block (Boys)',guardian:'Tariq Ali',phone:'+971 50 118 4420',fee:'Paid',medical:'—',joined:'Aug 2021',roll:'On leave'},
 {name:'Daniel George',id:'ANS-1066',grade:'Grade 12 · A',room:'FB-102',block:'Falcon Block (Boys)',guardian:'Mary George',phone:'+971 52 664 7781',fee:'Paid',medical:'Nut allergy — EpiPen',joined:'Aug 2020',roll:'Present'},
 {name:'Zaid Omar',id:'ANS-1090',grade:'Grade 11 · C',room:'FB-101',block:'Falcon Block (Boys)',guardian:'Omar Sharif',phone:'+971 55 771 2003',fee:'Paid',medical:'—',joined:'Aug 2022',roll:'Present'},
 {name:'Aisha Noor',id:'ANS-1058',grade:'Grade 9 · B',room:'OB-201',block:'Oryx Block (Girls)',guardian:'Salim Noor',phone:'+971 52 778 3320',fee:'Paid',medical:'—',joined:'Aug 2023',roll:'Present'},
 {name:'Sara Abdullah',id:'ANS-1061',grade:'Grade 9 · A',room:'OB-201',block:'Oryx Block (Girls)',guardian:'Abdullah Karim',phone:'+971 50 553 1189',fee:'Paid',medical:'Diabetic — insulin schedule',joined:'Aug 2022',roll:'Present'},
 {name:'Layla Mansour',id:'ANS-1052',grade:'Grade 8 · A',room:'OB-201',block:'Oryx Block (Girls)',guardian:'Nabil Mansour',phone:'+971 55 902 3311',fee:'Due',medical:'—',joined:'Aug 2024',roll:'Present'},
 {name:'Zara Sheikh',id:'ANS-1049',grade:'Grade 7 · B',room:'OB-201',block:'Oryx Block (Girls)',guardian:'Imran Sheikh',phone:'+971 52 447 8890',fee:'Paid',medical:'—',joined:'Aug 2024',roll:'Present'},
 {name:'Mariam Saleh',id:'ANS-1055',grade:'Grade 8 · B',room:'OB-204',block:'Oryx Block (Girls)',guardian:'Saleh Nasser',phone:'+971 50 220 6654',fee:'Paid',medical:'—',joined:'Aug 2023',roll:'Late'},
 {name:'Ethan Pereira',id:'ANS-1064',grade:'Grade 11 · A',room:'FB-102',block:'Falcon Block (Boys)',guardian:'John Pereira',phone:'+971 55 330 9921',fee:'Paid',medical:'—',joined:'Aug 2022',roll:'Present'},
];
let HLEAVE=[
 {id:'GP-2214',name:'Sara Abdullah',room:'OB-201',type:'Weekend leave',from:'14 Jun',to:'15 Jun',reason:'Family event — Sharjah',status:'Out',by:'Ms. Farah'},
 {id:'GP-2210',name:'Hamza Ali',room:'FB-101',type:'Home leave',from:'13 Jun',to:'16 Jun',reason:'Family visit — Abu Dhabi',status:'Approved',by:'Mr. Idris'},
 {id:'GP-2212',name:'Zaid Omar',room:'FB-101',type:'Day-out',from:'15 Jun',to:'15 Jun',reason:'Shopping — guardian pickup',status:'Requested',by:'—'},
 {id:'GP-2213',name:'Daniel George',room:'FB-102',type:'Home leave',from:'20 Jun',to:'30 Jun',reason:'Eid Al Adha holidays',status:'Requested',by:'—'},
 {id:'GP-2209',name:'Aisha Noor',room:'OB-201',type:'Medical',from:'13 Jun',to:'13 Jun',reason:'Dental appointment',status:'Returned',by:'Ms. Farah'},
];
let HMAINT=[
 {id:'HM-118',room:'FB-203',issue:'AC not cooling — unit needs regas',cat:'HVAC',prio:'High',by:'Warden',status:'Open',date:'13 Jun'},
 {id:'HM-117',room:'OB-110',issue:'Leaking tap in washroom',cat:'Plumbing',prio:'Medium',by:'Boarder',status:'In progress',date:'12 Jun'},
 {id:'HM-116',room:'FB-105',issue:'Broken study chair',cat:'Furniture',prio:'Low',by:'Warden',status:'Open',date:'12 Jun'},
 {id:'HM-115',room:'OB-208',issue:'Light flickering — replace ballast',cat:'Electrical',prio:'Medium',by:'Boarder',status:'In progress',date:'11 Jun'},
 {id:'HM-114',room:'FB-101',issue:'Wardrobe door hinge',cat:'Furniture',prio:'Low',by:'Boarder',status:'Resolved',date:'10 Jun'},
];
let INVENTORY=[
 {sku:'INV-1001',item:'Student Laptops (Dell)',cat:'IT',stock:312,min:300,unitCost:1850,supplier:'Dell Technologies UAE',location:'IT Store - Room B12',condition:'Good',lastCounted:'10 Jun',warranty:'Mar 2027',movements:[{date:'02 Jun',type:'Received',qty:50,note:'New shipment - Term 2 refresh'},{date:'28 May',type:'Issued',qty:-12,note:'Grade 10 classroom rollout'}]},
 {sku:'INV-1002',item:'Science Lab Kits',cat:'Academic',stock:28,min:40,unitCost:420,supplier:'EduScience Supplies LLC',location:'Science Block - Store 2',condition:'Good',lastCounted:'08 Jun',warranty:'-',movements:[{date:'01 Jun',type:'Issued',qty:-8,note:'Grade 9 chemistry practicals'}]},
 {sku:'INV-1003',item:'Library Furniture',cat:'Facilities',stock:96,min:60,unitCost:650,supplier:'Al Futtaim Office Solutions',location:'Library - Storage',condition:'Good',lastCounted:'15 May',warranty:'-',movements:[]},
 {sku:'INV-1004',item:'Sports Equipment Sets',cat:'Activities',stock:34,min:45,unitCost:310,supplier:'Decathlon Pro UAE',location:'Sports Store - Gym Annex',condition:'Worn',lastCounted:'05 Jun',warranty:'-',movements:[{date:'20 May',type:'Issued',qty:-6,note:'Inter-house sports day'}]},
 {sku:'INV-1005',item:'Projectors',cat:'IT',stock:52,min:48,unitCost:2200,supplier:'Dell Technologies UAE',location:'IT Store - Room B12',condition:'Good',lastCounted:'12 Jun',warranty:'Sep 2026',movements:[]},
];
let PURCHASE_ORDERS=[
 {id:'PO-1001',supplier:'EduScience Supplies LLC',items:[{item:'Science Lab Kits',qty:20,unitCost:420}],expected:'20 Jun',status:'Sent',date:'10 Jun',notes:'Term 2 restock'},
];

let EVENTS=[
 {d:'16',mon:'JUN',t:'Term 2 Unit Test 3 — Grade 10',tag:'Exam',c:'amber',sub:'08:00 · All Grade 10 sections'},
 {d:'18',mon:'JUN',t:'Science Exhibition submissions close',tag:'Academic',c:'blue',sub:'Grades 8–12'},
 {d:'21',mon:'JUN',t:'Parent–Teacher Conference',tag:'Event',c:'green',sub:'09:00–13:00 · Main Hall'},
 {d:'24',mon:'JUN',t:'Library Week — Author Visit',tag:'Event',c:'blue',sub:'11:00 · Library · Grades 4–7'},
 {d:'30',mon:'JUN',t:'Eid Al Adha Break begins',tag:'Holiday',c:'red',sub:'School closed · resumes 07 Jul'},
];
const BIODEVICES=[
 {loc:'Main Gate · Turnstile A',type:'Face + Card',sync:'12s ago',punches:642,status:'Online'},
 {loc:'Main Gate · Turnstile B',type:'Face + Card',sync:'12s ago',punches:588,status:'Online'},
 {loc:'Staff Entrance',type:'Fingerprint',sync:'40s ago',punches:146,status:'Online'},
 {loc:'Primary Block',type:'Face',sync:'1m ago',punches:410,status:'Online'},
 {loc:'Sports Complex',type:'Card',sync:'18m ago',punches:0,status:'Offline'},
];
let VISITORS=[
 {name:'Mariam Yousef',purpose:'Parent meeting',host:'Dr. Salma Haddad',in:'08:42',out:'—',status:'On-site'},
 {name:'Ahmed Bakr',purpose:'Vendor — IT supplies',host:'Khalid Noori',in:'09:15',out:'09:58',status:'Checked out'},
 {name:'Reema Al Suwaidi',purpose:'Admissions tour',host:'Front Office',in:'10:05',out:'—',status:'On-site'},
 {name:'KHDA Inspector',purpose:'Scheduled inspection',host:'Principal Office',in:'10:30',out:'—',status:'On-site'},
 {name:'Daniel Fereira',purpose:'Guest speaker',host:'Grace Williams',in:'—',out:'—',status:'Pre-approved'},
];
const BEHAVIOUR=[
 {name:'Omar Siddiqui',cls:'11-C',type:'Merit',note:'Outstanding peer mentoring',pts:'+5',date:'13 Jun',c:'green'},
 {name:'Ethan Pereira',cls:'11-A',type:'Incident',note:'Late submission — 3rd this term',pts:'−2',date:'12 Jun',c:'red'},
 {name:'Aisha Noor',cls:'9-B',type:'Merit',note:'Science fair leadership',pts:'+8',date:'11 Jun',c:'green'},
 {name:'Yusuf Rahman',cls:'10-A',type:'Detention',note:'Disrupting class',pts:'−5',date:'10 Jun',c:'amber'},
 {name:'Zara Sheikh',cls:'7-B',type:'Merit',note:'Perfect attendance badge',pts:'+3',date:'09 Jun',c:'green'},
];
let CLINIC=[
 {name:'Layla Mansour',cls:'8-A',reason:'Headache · rest given',action:'Returned to class',time:'09:20',status:'Resolved'},
 {name:'Daniel George',cls:'12-A',reason:'Sports sprain — ankle',action:'Guardian notified',time:'10:45',status:'Sent home'},
 {name:'Sara Abdullah',cls:'9-A',reason:'Scheduled insulin check',action:'Care plan followed',time:'11:30',status:'Resolved'},
 {name:'Hamza Ali',cls:'12-B',reason:'Fever 38.4°C',action:'Isolation · guardian called',time:'12:10',status:'Sent home'},
];
let MEALPLANS=[
 {plan:'Premium · Full board',price:1800,subs:412,meals:'Breakfast · Lunch · Snack · Dinner',c:'green'},
 {plan:'Standard · Lunch only',price:1100,subs:686,meals:'Lunch',c:'blue'},
 {plan:'Halal Special',price:1250,subs:208,meals:'Lunch · Snack',c:'green'},
 {plan:'Allergy-safe (nut-free)',price:1400,subs:64,meals:'Lunch · Snack',c:'amber'},
];
const MENU=[
 {day:'Sunday',b:{item:'Foul Medames & Zaatar Manakish',cal:420,veg:true,alg:['Gluten']},l:{item:'Chicken Biryani + Garden Salad',cal:680,veg:false,alg:[]},s:{item:'Fresh Fruit Cup + Laban',cal:180,veg:true,alg:['Dairy']}},
 {day:'Monday',b:{item:'Shakshuka & Arabic Bread',cal:390,veg:true,alg:['Egg','Gluten']},l:{item:'Grilled Fish + Steamed Rice',cal:610,veg:false,alg:['Fish']},s:{item:'Hummus & Veg Sticks',cal:160,veg:true,alg:['Sesame']}},
 {day:'Tuesday',b:{item:'Oats Porridge + Honey & Dates',cal:350,veg:true,alg:['Dairy','Gluten']},l:{item:'Beef Kofta + Freekeh',cal:700,veg:false,alg:['Gluten']},s:{item:'Banana Muffin',cal:220,veg:true,alg:['Egg','Gluten']}},
 {day:'Wednesday',b:{item:'Cheese & Spinach Fatayer',cal:410,veg:true,alg:['Dairy','Gluten']},l:{item:'Vegetable Machboos (Veg)',cal:560,veg:true,alg:[]},s:{item:'Yoghurt & Granola',cal:200,veg:true,alg:['Dairy','Nuts']}},
 {day:'Thursday',b:{item:'Pancakes & Maple Syrup',cal:440,veg:true,alg:['Egg','Dairy','Gluten']},l:{item:'Chicken Shawarma Wrap + Fries',cal:720,veg:false,alg:['Gluten']},s:{item:'Fruit Smoothie',cal:190,veg:true,alg:['Dairy']}},
];
let WALLETS=[
 {name:'Fatima Al Hashimi',id:'ANS-1042',grade:'Grade 10 · A',plan:'Premium · Full board',bal:145,last:'12 Jun'},
 {name:'Yusuf Rahman',id:'ANS-1043',grade:'Grade 10 · A',plan:'Standard · Lunch only',bal:14,last:'05 Jun'},
 {name:'Aisha Noor',id:'ANS-1058',grade:'Grade 9 · B',plan:'Premium · Full board',bal:88,last:'11 Jun'},
 {name:'Sara Abdullah',id:'ANS-1061',grade:'Grade 9 · A',plan:'Allergy-safe (nut-free)',bal:132,last:'10 Jun'},
 {name:'Daniel George',id:'ANS-1066',grade:'Grade 12 · A',plan:'Halal Special',bal:9,last:'03 Jun'},
 {name:'Omar Siddiqui',id:'ANS-1088',grade:'Grade 11 · C',plan:'Standard · Lunch only',bal:56,last:'12 Jun'},
 {name:'Layla Mansour',id:'ANS-1052',grade:'Grade 8 · A',plan:'Premium · Full board',bal:120,last:'12 Jun'},
 {name:'Hamza Ali',id:'ANS-1071',grade:'Grade 12 · B',plan:'Halal Special',bal:7,last:'01 Jun'},
];
let CAFETXN=[
 {name:'Fatima Al Hashimi',item:'Lunch — Chicken Biryani',amt:-22,type:'Purchase',time:'12:40',method:'Wallet'},
 {name:'Omar Siddiqui',item:'Wallet top-up',amt:100,type:'Top-up',time:'11:15',method:'Card'},
 {name:'Aisha Noor',item:'Snack — Fruit Cup + Laban',amt:-9,type:'Purchase',time:'10:32',method:'Wallet'},
 {name:'Sara Abdullah',item:'Lunch — Nut-free tray',amt:-24,type:'Purchase',time:'12:45',method:'Wallet'},
 {name:'Layla Mansour',item:'Wallet top-up',amt:150,type:'Top-up',time:'08:20',method:'Online portal'},
 {name:'Yusuf Rahman',item:'Snack — Hummus & Veg',amt:-8,type:'Purchase',time:'10:50',method:'Wallet'},
];
let CAFEALG=[
 {name:'Sara Abdullah',grade:'Grade 9 · A',allergens:'Peanuts, Tree nuts',sev:'Severe',plan:'Nut-free tray · EpiPen on file'},
 {name:'Daniel George',grade:'Grade 12 · A',allergens:'Tree nuts',sev:'Severe',plan:'Nut-free tray · guardian consent'},
 {name:'Emily Watson',grade:'Grade 8 · A',allergens:'Lactose',sev:'Moderate',plan:'Dairy-free substitutions'},
 {name:'Musa Diallo',grade:'Grade 10 · B',allergens:'Gluten (Coeliac)',sev:'Moderate',plan:'Gluten-free menu line'},
 {name:'Hana Yusuf',grade:'Grade 7 · A',allergens:'Egg',sev:'Mild',plan:'Egg-free baked goods'},
];
let CAFESTOCK=[
 {item:'Basmati Rice',cat:'Grains',stock:180,min:120,unit:'kg',vendor:'Al Maya Foods'},
 {item:'Chicken (Halal)',cat:'Protein',stock:45,min:60,unit:'kg',vendor:'Fresh Farm Co.'},
 {item:'Fresh Vegetables',cat:'Produce',stock:210,min:150,unit:'kg',vendor:'Green Valley'},
 {item:'Laban & Yoghurt',cat:'Dairy',stock:34,min:50,unit:'L',vendor:'Al Rawabi'},
 {item:'Cooking Oil',cat:'Pantry',stock:96,min:60,unit:'L',vendor:'Al Maya Foods'},
 {item:'Arabic Bread',cat:'Bakery',stock:140,min:100,unit:'packs',vendor:'Modern Bakery'},
];
const CAFEITEMS=[
 {item:'Chicken Biryani',price:22,sold:186,cat:'Main',cal:680},
 {item:'Shawarma Wrap',price:18,sold:142,cat:'Main',cal:720},
 {item:'Fruit Cup + Laban',price:9,sold:210,cat:'Snack',cal:180},
 {item:'Hummus & Veg Sticks',price:8,sold:98,cat:'Snack',cal:160},
 {item:'Fresh Juice',price:10,sold:164,cat:'Beverage',cal:120},
];
const CERTS=[
 {name:'Daniel George',cls:'12-A',type:'Transfer Certificate',ref:'TC-25-0091',date:'12 Jun',status:'Issued'},
 {name:'Fatima Al Hashimi',cls:'10-A',type:'Bonafide Letter',ref:'BL-25-0440',date:'11 Jun',status:'Issued'},
 {name:'Hamza Ali',cls:'12-B',type:'Character Certificate',ref:'CC-25-0112',date:'10 Jun',status:'Pending'},
 {name:'Mariam Saleh',cls:'8-B',type:'Report Card · Term 2',ref:'RC-25-1820',date:'09 Jun',status:'Issued'},
 {name:'Omar Siddiqui',cls:'11-C',type:'Bonafide Letter',ref:'BL-25-0441',date:'09 Jun',status:'Pending'},
];

let ALUMNI=[
 {name:'Yara Khalifa',batch:'2019',path:'Medicine · NYU Abu Dhabi',contact:'+971 50 880 1122',email:'yara.khalifa@gmail.com',status:'Mentor',employer:'NYU Abu Dhabi Hospital',industry:'Healthcare',university:'NYU Abu Dhabi',skills:['Clinical research','Public health'],mentorAvail:true,consent:true},
 {name:'Rami Haddad',batch:'2018',path:'Software Engineer · Careem',contact:'+971 55 213 9087',email:'rami.haddad@outlook.com',status:'Active',employer:'Careem',industry:'Technology',university:'AUS',skills:['Backend engineering','Cloud infra'],mentorAvail:false,consent:true},
 {name:'Sophia Lin',batch:'2020',path:'Architecture · UCL London',contact:'+971 52 661 4410',email:'sophia.lin@ucl.ac.uk',status:'Active',employer:'Foster + Partners',industry:'Architecture',university:'UCL London',skills:['Urban design'],mentorAvail:false,consent:true},
 {name:'Tariq Mansour',batch:'2016',path:'Founder · LogiTech FZ',contact:'+971 50 119 7733',email:'tariq@logitechfz.com',status:'Mentor',employer:'LogiTech FZ (Founder)',industry:'Logistics / Startups',university:'AUD',skills:['Entrepreneurship','Fundraising','Operations'],mentorAvail:true,consent:true},
 {name:'Aaliyah Basheer',batch:'2021',path:'Business · LSE',contact:'+971 56 770 2231',email:'aaliyah.basheer@lse.ac.uk',status:'Active',employer:'Student',industry:'Finance (studying)',university:'LSE',skills:['Economics'],mentorAvail:false,consent:true},
 {name:'Marcus Reed',batch:'2017',path:'Doctor · Cleveland Clinic',contact:'+971 55 442 8890',email:'marcus.reed@ccf.org',status:'Lapsed',employer:'Cleveland Clinic Abu Dhabi',industry:'Healthcare',university:'Imperial College London',skills:['Cardiology'],mentorAvail:false,consent:false},
 {name:'Noura Saif',batch:'2019',path:'Law · Sorbonne Paris',contact:'+971 50 330 1567',email:'noura.saif@sorbonne.fr',status:'Active',employer:'Al Tamimi & Co.',industry:'Legal',university:'Sorbonne Paris',skills:['Corporate law'],mentorAvail:true,consent:true},
];
let MENTOR_REQUESTS=[];
let ALUMNI_EVENTS=[{title:'Annual Alumni Reunion',date:'15 Nov 2026',invited:0,rsvp:0},{title:'Careers Panel — Class of 2026 Q&A',date:'20 Sep 2026',invited:0,rsvp:0}];
const DEMO_TODAY_ISO='2026-06-18';
function isoAddDays(iso,n){const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function isoLabel(iso){const idx=Math.round((new Date(iso+'T00:00:00')-new Date(DEMO_TODAY_ISO+'T00:00:00'))/86400000);
 if(idx===0)return 'Today';if(idx===1)return 'Tomorrow';
 const d=new Date(iso+'T00:00:00');return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]+' '+d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}
let FACILITIES=[
 {name:'Main Auditorium',type:'Hall',cap:400,status:'Available'},
 {name:'Science Lab 1',type:'Laboratory',cap:32,status:'Booked'},
 {name:'Sports Hall',type:'Sports',cap:120,status:'Available'},
 {name:'Computer Lab A',type:'Laboratory',cap:30,status:'Maintenance'},
 {name:'Music Room',type:'Studio',cap:24,status:'Available'},
 {name:'Library Seminar Room',type:'Meeting',cap:18,status:'Booked'},
];
let BOOKINGS=[
 {facility:'Science Lab 1',by:'Dr. Amina Yusuf',date:DEMO_TODAY_ISO,time:'10:00-11:00',status:'Confirmed'},
 {facility:'Library Seminar Room',by:'Grace Williams',date:DEMO_TODAY_ISO,time:'13:00-14:00',status:'Confirmed'},
 {facility:'Main Auditorium',by:'Events Team',date:isoAddDays(DEMO_TODAY_ISO,1),time:'09:00-12:00',status:'Pending'},
];
const TICKETS=[
 {id:'TKT-2051',title:'Projector not working — Room 204',cat:'IT',by:'Rohan Mehta',priority:'High',status:'Open',date:'Today'},
 {id:'TKT-2050',title:'AC leakage in Science Lab 2',cat:'Facilities',by:'Lab Tech',priority:'High',status:'In progress',date:'Today'},
 {id:'TKT-2049',title:'Wi-Fi slow in Block C',cat:'IT',by:'Grace Williams',priority:'Medium',status:'In progress',date:'Yesterday'},
 {id:'TKT-2048',title:'Broken chair — Classroom 1A',cat:'Facilities',by:'Ms. Reem Adel',priority:'Low',status:'Resolved',date:'13 Jun'},
 {id:'TKT-2047',title:'Email login issue',cat:'IT',by:'Joseph Thomas',priority:'Medium',status:'Resolved',date:'12 Jun'},
];
let SURVEYS=[
 {title:'Term 2 Parent Satisfaction',audience:'All parents',responses:642,sent:980,status:'Live',c:'green'},
 {title:'Staff Wellbeing Pulse',audience:'All staff',responses:118,sent:148,status:'Live',c:'green'},
 {title:'Cafeteria Menu Feedback',audience:'Students Gr 6–12',responses:0,sent:0,status:'Draft',c:'gray'},
 {title:'Transport Service Review',audience:'Bus riders',responses:410,sent:642,status:'Closed',c:'blue'},
];
let AUDIT=[
 {user:'Rashid Al Maktoum',action:'Updated fee structure',module:'Fees',time:'09:42'},
 {user:'Dr. Salma Haddad',action:'Approved admission · Ali Haider',module:'Admissions',time:'09:18'},
 {user:'Joseph Thomas',action:'Exported payroll WPS file',module:'Payroll',time:'08:55'},
 {user:'Rohan Mehta',action:'Submitted Grade 10 attendance',module:'Attendance',time:'08:40'},
 {user:'System',action:'Nightly biometric sync completed',module:'Biometric',time:'02:00'},
 {user:'Grace Williams',action:'Published announcement',module:'Communication',time:'Yesterday'},
];
const CLASSES=[
 {cls:'KG 1 · A',rep:'Maya Haddad',teacher:'Ms. Reem Adel',filled:18,cap:22,stream:'Foundation'},
 {cls:'KG 2 · B',rep:'Adam Farouk',teacher:'Ms. Hala Aziz',filled:20,cap:24,stream:'Foundation'},
 {cls:'Grade 1 · A',rep:'Lina Saeed',teacher:'Ms. Joan Mathew',filled:22,cap:26,stream:'Primary'},
 {cls:'Grade 3 · B',rep:'Karim Nasser',teacher:'Mr. Suhail Rana',filled:24,cap:28,stream:'Primary'},
 {cls:'Grade 5 · A',rep:'Hana Yousef',teacher:'Ms. Priya Nair',filled:26,cap:28,stream:'Primary'},
 {cls:'Grade 8 · A',rep:'Layla Mansour',teacher:'Grace Williams',filled:24,cap:28,stream:'General'},
 {cls:'Grade 9 · B',rep:'Aisha Noor',teacher:'Sana Iqbal',filled:25,cap:28,stream:'General'},
 {cls:'Grade 10 · A',rep:'Fatima Al Hashimi',teacher:'Rohan Mehta',filled:29,cap:30,stream:'General'},
 {cls:'Grade 10 · B',rep:'Ibrahim Khan',teacher:'Dr. Amina Yusuf',filled:27,cap:30,stream:'General'},
 {cls:'Grade 11 · C',rep:'Omar Siddiqui',teacher:'Grace Williams',filled:28,cap:30,stream:'Commerce'},
 {cls:'Grade 12 · A',rep:'Daniel George',teacher:'D. George · Homeroom',filled:26,cap:30,stream:'Science'},
];


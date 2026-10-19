/* ============ SEED DATA ============ */
const AV=['#17A24A','#2563EB','#E11D2A','#7C3AED','#0E7490','#B45309','#0E7C39','#BE185D','#475467'];
function avc(s){let h=0;for(const c of s)h=c.charCodeAt(0)+((h<<5)-h);return AV[Math.abs(h)%AV.length]}
function darken(hex,f){f=(f==null?0.42:f);const m=hex.replace('#','');if(m.length<6)return hex;const r=parseInt(m.slice(0,2),16),g=parseInt(m.slice(2,4),16),b=parseInt(m.slice(4,6),16);const d=x=>('0'+Math.round(x*(1-f)).toString(16)).slice(-2);return '#'+d(r)+d(g)+d(b)}
function initials(n){return n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
/* ---- Localization engine (global-in-local) ---- */
const CURRENCIES={
  AED:{sym:'AED',loc:'en-AE',name:'UAE Dirham'},USD:{sym:'$',loc:'en-US',name:'US Dollar'},EUR:{sym:'€',loc:'de-DE',name:'Euro'},
  GBP:{sym:'£',loc:'en-GB',name:'British Pound'},SAR:{sym:'SAR',loc:'en-SA',name:'Saudi Riyal'},QAR:{sym:'QAR',loc:'en-QA',name:'Qatari Riyal'},
  INR:{sym:'₹',loc:'en-IN',name:'Indian Rupee'},PKR:{sym:'₨',loc:'en-PK',name:'Pakistani Rupee'},SGD:{sym:'S$',loc:'en-SG',name:'Singapore Dollar'},
  MYR:{sym:'RM',loc:'en-MY',name:'Malaysian Ringgit'},PHP:{sym:'₱',loc:'en-PH',name:'Philippine Peso'},ZAR:{sym:'R',loc:'en-ZA',name:'South African Rand'},
  NGN:{sym:'₦',loc:'en-NG',name:'Nigerian Naira'},KES:{sym:'KSh',loc:'en-KE',name:'Kenyan Shilling'},EGP:{sym:'EGP',loc:'en-EG',name:'Egyptian Pound'},
  AUD:{sym:'A$',loc:'en-AU',name:'Australian Dollar'},CAD:{sym:'C$',loc:'en-CA',name:'Canadian Dollar'},BRL:{sym:'R$',loc:'pt-BR',name:'Brazilian Real'}};
const REGIONS={
  'United Arab Emirates':{cur:'AED',lang:'English',dir:'ltr',tz:'GST (GMT+4)'},'Saudi Arabia':{cur:'SAR',lang:'العربية',dir:'rtl',tz:'AST (GMT+3)'},
  'Qatar':{cur:'QAR',lang:'العربية',dir:'rtl',tz:'AST (GMT+3)'},'India':{cur:'INR',lang:'English',dir:'ltr',tz:'IST (GMT+5:30)'},
  'United Kingdom':{cur:'GBP',lang:'English',dir:'ltr',tz:'GMT'},'United States':{cur:'USD',lang:'English',dir:'ltr',tz:'ET (GMT-5)'},
  'Singapore':{cur:'SGD',lang:'English',dir:'ltr',tz:'SGT (GMT+8)'},'Nigeria':{cur:'NGN',lang:'English',dir:'ltr',tz:'WAT (GMT+1)'},
  'South Africa':{cur:'ZAR',lang:'English',dir:'ltr',tz:'SAST (GMT+2)'},'Philippines':{cur:'PHP',lang:'English',dir:'ltr',tz:'PST (GMT+8)'},
  'Egypt':{cur:'EGP',lang:'العربية',dir:'rtl',tz:'EET (GMT+2)'},'Australia':{cur:'AUD',lang:'English',dir:'ltr',tz:'AET (GMT+10)'}};
const CFG={currency:'AED',previewCurrency:'AED',country:'United Arab Emirates',language:'English',dir:'ltr',tz:'GST (GMT+4)',dateFmt:'DD MMM YYYY'};
/* ---- Regional compliance: privacy framework, tax, grading system ---- */
const COMPLIANCE={
  'United Arab Emirates':{privacy:'UAE PDPL (Federal Decree-Law 45 of 2021)',authority:'UAE Data Office',tax:'VAT 5% · education services zero-rated',residency:'UAE data residency supported',grading:['MOE (UAE)','British','American','IB']},
  'Saudi Arabia':{privacy:'Saudi PDPL (2023)',authority:'SDAIA',tax:'VAT 15% · private education taxable',residency:'KSA data residency supported',grading:['MOE (KSA)','British','American','IB']},
  'Qatar':{privacy:'Qatar PDPPL (Law 13 of 2016)',authority:'NDPO / CRA',tax:'No VAT on education',residency:'Qatar data residency supported',grading:['MOE (Qatar)','British','American','IB']},
  'India':{privacy:'DPDP Act 2023 (Digital Personal Data Protection)',authority:'Data Protection Board of India',tax:'GST · core education exempt',residency:'India data residency supported',grading:['CBSE','ICSE / CISCE','State Board','IB','Cambridge (IGCSE)']},
  'United Kingdom':{privacy:'UK GDPR + Data Protection Act 2018',authority:'ICO',tax:'VAT · education exempt',residency:'UK / EEA residency',grading:['British (GCSE / A-Level)','IB']},
  'United States':{privacy:'FERPA + COPPA (student records)',authority:'US Dept. of Education',tax:'Sales tax varies by state · tuition generally exempt',residency:'US data residency supported',grading:['American (GPA 4.0)','AP','IB']},
  'Singapore':{privacy:'PDPA 2012',authority:'PDPC',tax:'GST 9% · education exempt',residency:'Singapore residency supported',grading:['MOE (Singapore)','British','IB']},
  'Nigeria':{privacy:'NDPA 2023',authority:'NDPC',tax:'VAT 7.5% · tuition exempt',residency:'Nigeria residency supported',grading:['WAEC / NECO','British','American']},
  'South Africa':{privacy:'POPIA (2013)',authority:'Information Regulator',tax:'VAT 15% · education exempt',residency:'South Africa residency supported',grading:['NSC (CAPS)','IEB','Cambridge']},
  'Philippines':{privacy:'Data Privacy Act 2012',authority:'National Privacy Commission',tax:'VAT · private education exempt',residency:'Philippines residency supported',grading:['DepEd (K-12)','American','IB']},
  'Egypt':{privacy:'PDPL (Law 151 of 2020)',authority:'Data Protection Center',tax:'VAT 14% · education exempt',residency:'Egypt residency supported',grading:['MOE (Egypt)','British','American','IB']},
  'Australia':{privacy:'Privacy Act 1988 (APPs)',authority:'OAIC',tax:'GST · education GST-free',residency:'Australia residency supported',grading:['ATAR','IB','Cambridge']}};
CFG.gradingSystem=(COMPLIANCE[CFG.country]||{}).grading?COMPLIANCE[CFG.country].grading[0]:'MOE (UAE)';
function schoolArabicDigits(s){
  if(typeof LANG==='undefined'||LANG==='en'||!s) return String(s);
  if(LANG==='ar') return String(s).replace(/\d/g,n=>'٠١٢٣٤٥٦٧٨٩'[Number(n)]);
  if(LANG==='ur') return String(s).replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[Number(n)]);
  if(LANG==='hi') return String(s).replace(/\d/g,n=>'०१२३४५६७८९'[Number(n)]);
  return String(s);
}
function money(n){const c=CURRENCIES[CFG.currency]||{sym:String(CFG.currency||'AED'),loc:'en-US'};let num=Number(n||0).toLocaleString(c.loc);if(LANG==='ar'||LANG==='ur'||LANG==='hi')num=schoolArabicDigits(num);return /^[A-Za-z]/.test(c.sym)?c.sym+' '+num:c.sym+num}
function previewMoney(n){const c=CURRENCIES[CFG.previewCurrency]||CURRENCIES.AED;let num=Number(n||0).toLocaleString(c.loc);if(LANG==='ar'||LANG==='ur'||LANG==='hi')num=schoolArabicDigits(num);return /^[A-Za-z]/.test(c.sym)?c.sym+' '+num:c.sym+num}
function aed(n){return money(n)}
function aedC(n){const c=CURRENCIES[CFG.currency]||{sym:String(CFG.currency||'AED')};const pre=/^[A-Za-z]/.test(c.sym)?c.sym+' ':c.sym;n=Number(n||0);let res;if(n>=1e6)res=pre+(n/1e6).toFixed(n%1e6?2:0).replace(/\.?0+$/,'')+'M';else if(n>=1e3)res=pre+Math.round(n/1e3)+'K';else res=pre+n;if(LANG==='ar'||LANG==='ur'||LANG==='hi')res=schoolArabicDigits(res);return res}
function applyRegion(country){const r=REGIONS[country];if(!r)return;CFG.country=country;CFG.previewCurrency=r.cur;CFG.language=r.lang;CFG.dir=r.dir;CFG.tz=r.tz;const c=COMPLIANCE[country];if(c&&c.grading)CFG.gradingSystem=c.grading[0];document.documentElement.setAttribute('dir',r.dir);document.documentElement.lang=(r.lang==='العربية')?'ar':'en';render();toast('Region preview · '+country+' · '+r.cur)}
function setCurrency(code){if(!CURRENCIES[code])return;CFG.previewCurrency=code;render();toast('Currency preview · '+code)}
/* ================= INTERNATIONALIZATION (EN / AR / UR / HI) ================= */
const LANGS={
  en:{name:'English',native:'English',dir:'ltr'},
  ar:{name:'Arabic',native:'العربية',dir:'rtl'},
  ur:{name:'Urdu',native:'اردو',dir:'rtl'},
  hi:{name:'Hindi',native:'हिन्दी',dir:'ltr'}};
var LANG='en';
var LANG_ENABLED=['en','ar','ur','hi'];
function langEnabled(){return LANG_ENABLED.filter(c=>LANGS[c])}
const I18N={
 'Overview':{ar:'نظرة عامة',ur:'جائزہ',hi:'अवलोकन'},
 'People':{ar:'الأشخاص',ur:'لوگ',hi:'लोग'},
 'Academics':{ar:'الأكاديمية',ur:'تعلیمی',hi:'शैक्षणिक'},
 'Wellbeing':{ar:'الصحة والرفاهية',ur:'فلاح و بہبود',hi:'कल्याण'},
 'Finance':{ar:'المالية',ur:'مالیات',hi:'वित्त'},
 'Operations':{ar:'العمليات',ur:'آپریشنز',hi:'संचालन'},
 'Engagement':{ar:'التفاعل',ur:'رابطہ',hi:'सहभागिता'},
 'Insights':{ar:'التحليلات',ur:'بصیرت',hi:'अंतर्दृष्टि'},
 'System':{ar:'النظام',ur:'نظام',hi:'सिस्टम'},
 'Dashboard':{ar:'لوحة القيادة',ur:'ڈیش بورڈ',hi:'डैशबोर्ड'},
 'Admissions':{ar:'القبول',ur:'داخلے',hi:'प्रवेश'},
 'Enrolment CRM':{ar:'إدارة التسجيل',ur:'اندراج سی آر ایم',hi:'नामांकन सीआरएम'},
 'Students':{ar:'الطلاب',ur:'طلبہ',hi:'छात्र'},
 'Staff & HR':{ar:'الموظفون والموارد البشرية',ur:'عملہ و ایچ آر',hi:'स्टाफ़ और एचआर'},
 'Parents':{ar:'أولياء الأمور',ur:'والدین',hi:'अभिभावक'},
 'Certificates':{ar:'الشهادات',ur:'اسناد',hi:'प्रमाणपत्र'},
 'Alumni':{ar:'الخريجون',ur:'فارغ التحصیل',hi:'पूर्व छात्र'},
 'Classes & Sections':{ar:'الفصول والشُعب',ur:'کلاسز و سیکشنز',hi:'कक्षाएँ और अनुभाग'},
 'Timetable':{ar:'الجدول الدراسي',ur:'ٹائم ٹیبل',hi:'समय-सारणी'},
 'Attendance':{ar:'الحضور',ur:'حاضری',hi:'उपस्थिति'},
 'Exams & Gradebook':{ar:'الامتحانات والدرجات',ur:'امتحانات و گریڈ بک',hi:'परीक्षा और ग्रेडबुक'},
 'Curriculum':{ar:'المناهج',ur:'نصاب',hi:'पाठ्यक्रम'},
 'Learning (LMS)':{ar:'التعلّم (LMS)',ur:'تعلیم (LMS)',hi:'लर्निंग (LMS)'},
 'Behaviour':{ar:'السلوك',ur:'رویہ',hi:'व्यवहार'},
 'Health & Clinic':{ar:'الصحة والعيادة',ur:'صحت و کلینک',hi:'स्वास्थ्य और क्लिनिक'},
 'Cafeteria':{ar:'المقصف',ur:'کیفے ٹیریا',hi:'कैफेटेरिया'},
 'Fees & Invoicing':{ar:'الرسوم والفواتير',ur:'فیس و انوائسنگ',hi:'शुल्क और चालान'},
 'Payroll':{ar:'الرواتب',ur:'تنخواہ',hi:'वेतन'},
 'Expenses':{ar:'المصروفات',ur:'اخراجات',hi:'व्यय'},
 'Library':{ar:'المكتبة',ur:'لائبریری',hi:'पुस्तकालय'},
 'Transport':{ar:'النقل',ur:'ٹرانسپورٹ',hi:'परिवहन'},
 'Hostel':{ar:'السكن الداخلي',ur:'ہاسٹل',hi:'छात्रावास'},
 'Inventory':{ar:'المخزون',ur:'انوینٹری',hi:'सूची'},
 'Biometric Sync':{ar:'المزامنة البيومترية',ur:'بایومیٹرک سِنک',hi:'बायोमेट्रिक सिंक'},
 'Visitor Management':{ar:'إدارة الزوار',ur:'وزیٹر مینجمنٹ',hi:'आगंतुक प्रबंधन'},
 'Facilities & Bookings':{ar:'المرافق والحجوزات',ur:'سہولیات و بکنگ',hi:'सुविधाएँ और बुकिंग'},
 'Helpdesk':{ar:'مكتب المساعدة',ur:'ہیلپ ڈیسک',hi:'हेल्पडेस्क'},
 'Communication':{ar:'التواصل',ur:'رابطہ کاری',hi:'संचार'},
 'Events Calendar':{ar:'تقويم الفعاليات',ur:'ایونٹس کیلنڈر',hi:'कार्यक्रम कैलेंडर'},
 'Surveys & Feedback':{ar:'الاستبيانات والتقييم',ur:'سروے و فیڈبیک',hi:'सर्वेक्षण और प्रतिक्रिया'},
 'AI Insights':{ar:'رؤى الذكاء الاصطناعي',ur:'اے آئی بصیرت',hi:'एआई अंतर्दृष्टि'},
 'Reports & Analytics':{ar:'التقارير والتحليلات',ur:'رپورٹس و اینالیٹکس',hi:'रिपोर्ट और विश्लेषण'},
 'Roles & Access':{ar:'الأدوار والصلاحيات',ur:'رولز و رسائی',hi:'भूमिकाएँ और पहुँच'},
 'Audit Log':{ar:'سجل التدقيق',ur:'آڈٹ لاگ',hi:'ऑडिट लॉग'},
 'Settings':{ar:'الإعدادات',ur:'ترتیبات',hi:'सेटिंग्स'},
 'Administrator':{ar:'المشرف',ur:'ایڈمنسٹریٹر',hi:'प्रशासक'},
 'Principal':{ar:'مدير المدرسة',ur:'پرنسپل',hi:'प्रधानाचार्य'},
 'Teacher':{ar:'معلم',ur:'استاد',hi:'शिक्षक'},
 'Accountant':{ar:'محاسب',ur:'اکاؤنٹنٹ',hi:'लेखाकार'},
 'Parent':{ar:'ولي الأمر',ur:'سرپرست',hi:'अभिभावक'},
 'Student':{ar:'طالب',ur:'طالبِ علم',hi:'छात्र'},
 'Quick action':{ar:'إجراء سريع',ur:'فوری عمل',hi:'त्वरित कार्य'},
 'Export':{ar:'تصدير',ur:'برآمد',hi:'निर्यात'},
 'Search':{ar:'بحث',ur:'تلاش',hi:'खोज'},
 'Add':{ar:'إضافة',ur:'شامل کریں',hi:'जोड़ें'},
 'New':{ar:'جديد',ur:'نیا',hi:'नया'},
 'Save':{ar:'حفظ',ur:'محفوظ کریں',hi:'सहेजें'},
 'Cancel':{ar:'إلغاء',ur:'منسوخ کریں',hi:'रद्द करें'},
 'Approvals':{ar:'الموافقات',ur:'منظوریاں',hi:'स्वीकृतियाँ'},
 'Notifications':{ar:'الإشعارات',ur:'اطلاعات',hi:'सूचनाएँ'},
 'Switch role':{ar:'تبديل الدور',ur:'کردار تبدیل کریں',hi:'भूमिका बदलें'},
 'Workspace':{ar:'مساحة العمل',ur:'ورک اسپیس',hi:'कार्यक्षेत्र'},
 'Appearance':{ar:'المظهر',ur:'ظاہری شکل',hi:'रूप-रंग'},
 'Theme':{ar:'السمة',ur:'تھیم',hi:'थीम'},
 'Light':{ar:'فاتح',ur:'ہلکا',hi:'हल्का'},
 'Dark':{ar:'داكن',ur:'گہرا',hi:'गहरा'},
 'Language':{ar:'اللغة',ur:'زبان',hi:'भाषा'},
 'Region & localization':{ar:'المنطقة والتوطين',ur:'خطہ و لوکلائزیشن',hi:'क्षेत्र और स्थानीयकरण'},
 'Data & compliance':{ar:'البيانات والامتثال',ur:'ڈیٹا و تعمیل',hi:'डेटा और अनुपालन'},
 'Country / region':{ar:'الدولة / المنطقة',ur:'ملک / خطہ',hi:'देश / क्षेत्र'},
 'Currency':{ar:'العملة',ur:'کرنسی',hi:'मुद्रा'},
 'Good morning':{ar:'صباح الخير',ur:'صبح بخیر',hi:'सुप्रभात'},
 'Accent colour':{ar:'لون التمييز',ur:'ایکسنٹ رنگ',hi:'एक्सेंट रंग'}
};
function t(s){if(LANG==='en'||!s)return s;const e=I18N[s];return (e&&e[LANG])||s;}
/* End-to-end content localizer — runs after every render/drawer.
   Translates whole text nodes and label attributes that match a dictionary key.
   Also translates a text node whose content is "<key> · <rest>" or "<key>: <rest>" by
   localizing the leading segment, so compound labels with dynamic tails still translate.
   Safe: proper nouns / data that aren't in the dictionary are left untouched. */
const schoolLocalizationOriginals=new WeakMap();
function localizeView(root){
  if(!root)return;
  if(typeof STUDENTS!=='undefined')STUDENTS.forEach(person=>{schoolRegisterPerson(person);if(person.guardian)schoolRegisterPerson({name:person.guardian,translations:Object.fromEntries(['ar','ur','hi'].map(lang=>[lang,{name:person.translations?.[lang]?.guardianName}]))});});
  if(typeof GUARDIANS!=='undefined'&&GUARDIANS)GUARDIANS.forEach(schoolRegisterPerson);
  if(typeof SCHOOLOS_ADAPTER!=='undefined'&&SCHOOLOS_ADAPTER.user)schoolRegisterPerson(SCHOOLOS_ADAPTER.user);
  const slots=selector=>[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
  const personHeaders=['Name','Student','Teacher','Guardian','Parent','Employee','Assigned staff','Actor','Holder'];
  slots('td').forEach(cell=>{
    if(cell.children.length||!schoolPersonNames.has(cell.textContent.trim()))return;
    const header=cell.closest('table')?.querySelectorAll('thead th')[cell.cellIndex]?.textContent.trim();
    if(personHeaders.some(label=>header===label||header===t(label)))cell.setAttribute('data-school-person-display','');
  });
  slots('[data-school-person-display]').forEach(el=>{if(!el.hasAttribute('data-school-name'))el.setAttribute('data-school-name',el.textContent);el.setAttribute('data-i18n-skip','true');});
  slots('[data-school-name]').forEach(el=>{
    let translations={};try{translations=JSON.parse(el.getAttribute('data-school-name-translations')||'{}')}catch{}
    const target=el.hasAttribute('data-school-name-container')?el.querySelector('.nm'):el;
    if(target){target.setAttribute('data-i18n-skip','true');const prefix=el.getAttribute('data-school-name-prefix');const value=(prefix?prefix+' · ':'')+schoolNameForLocale(el.getAttribute('data-school-name'),translations);if(target.textContent!==value)target.textContent=value;}
  });
  slots('[data-school-default-value]').forEach(el=>{const raw=el.getAttribute('data-school-default-value'),last=el.getAttribute('data-school-default-last');if(el.value===raw||el.value===last){const value=typeof schoolTranslateText==='function'?schoolTranslateText(raw):t(raw);el.value=value;el.setAttribute('data-school-default-last',value);}});
  slots('[data-school-phone]').forEach(el=>{const raw=el.getAttribute('data-school-phone');const value=typeof schoolArabicDigits==='function'?schoolArabicDigits(raw):raw;if(el.textContent!==value)el.textContent=value;});
  const translate=s=>typeof schoolTranslateText==='function'?schoolTranslateText(s):t(s);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||p.closest('[data-i18n-skip]')||['SCRIPT','STYLE','TEXTAREA','CODE','PRE'].includes(p.tagName))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
  const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
  nodes.forEach(n=>{
    const p=n.parentElement;
    if(p.tagName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',p.value);
    let saved=schoolLocalizationOriginals.get(n);
    if(!saved||n.nodeValue!==saved.lastApplied){
      saved={original:n.nodeValue,lastApplied:n.nodeValue};
      schoolLocalizationOriginals.set(n,saved);
    }
    const original=saved.original,key=original.trim();
    if(key){
      const label=p.getAttribute('aria-label')||'';
      const attButtons={ar:{P:'ح',L:'ت',A:'غ',E:'ع'},ur:{P:'ح',L:'ت',A:'غ',E:'ر'},hi:{P:'उ',L:'दे',A:'अ',E:'छू'}};
      let translated;
      if(attButtons[LANG]&&p.tagName==='BUTTON'&&['P','L','A','E'].includes(key)&&/^(Present|Late|Absent|Excused) for /.test(label)){
        translated=attButtons[LANG][key];
      }else{
        const named=schoolTranslateKnownNames(key);
        translated=named!==key?named:translate(key);
      }
      if(typeof schoolArabicDigits==='function'&&(LANG==='ar'||LANG==='ur'||LANG==='hi')){
        translated=schoolArabicDigits(translated);
      }
      n.nodeValue=original.replace(key,translated);
      saved.lastApplied=n.nodeValue;
    }
  });
  const attrEls=root.querySelectorAll?((root.matches&&root.matches('[placeholder],[title],[aria-label]'))?[root,...root.querySelectorAll('[placeholder],[title],[aria-label]')]:root.querySelectorAll('[placeholder],[title],[aria-label]')):[];
  attrEls.forEach(el=>{
    if(el.closest&&el.closest('[data-i18n-skip]'))return;
    let originals=schoolLocalizationOriginals.get(el);
    if(!originals){originals={};schoolLocalizationOriginals.set(el,originals)}
    ['placeholder','title','aria-label'].forEach(a=>{
      if(!el.hasAttribute(a))return;
      if(!(a in originals))originals[a]=el.getAttribute(a);
      let translated=translate(originals[a]);
      if(typeof schoolArabicDigits==='function'&&(LANG==='ar'||LANG==='ur'||LANG==='hi')){
        translated=schoolArabicDigits(translated);
      }
      el.setAttribute(a,translated);
    });
  });
}

Object.assign(I18N,{
 'Student':{ar:'الطالب',ur:'طالب علم',hi:'छात्र'},
 'Students':{ar:'الطلاب',ur:'طلبہ',hi:'छात्र'},
 'Grade':{ar:'الصف',ur:'گریڈ',hi:'कक्षा'},
 'Class':{ar:'الفصل',ur:'کلاس',hi:'कक्षा'},
 'Section':{ar:'الشعبة',ur:'سیکشن',hi:'अनुभाग'},
 'Stage':{ar:'المرحلة',ur:'مرحلہ',hi:'चरण'},
 'Source':{ar:'المصدر',ur:'ماخذ',hi:'स्रोत'},
 'Status':{ar:'الحالة',ur:'حیثیت',hi:'स्थिति'},
 'Amount':{ar:'المبلغ',ur:'رقم',hi:'राशि'},
 'Date':{ar:'التاريخ',ur:'تاریخ',hi:'तिथि'},
 'Name':{ar:'الاسم',ur:'نام',hi:'नाम'},
 'Role':{ar:'الدور',ur:'کردار',hi:'भूमिका'},
 'Department':{ar:'القسم',ur:'شعبہ',hi:'विभाग'},
 'Type':{ar:'النوع',ur:'قسم',hi:'प्रकार'},
 'Category':{ar:'الفئة',ur:'زمرہ',hi:'श्रेणी'},
 'Priority':{ar:'الأولوية',ur:'ترجیح',hi:'प्राथमिकता'},
 'Phone':{ar:'الهاتف',ur:'فون',hi:'फ़ोन'},
 'Email':{ar:'البريد الإلكتروني',ur:'ای میل',hi:'ईमेल'},
 'Guardian':{ar:'ولي الأمر',ur:'سرپرست',hi:'अभिभावक'},
 'Teacher':{ar:'المعلم',ur:'استاد',hi:'शिक्षक'},
 'Subject':{ar:'المادة',ur:'مضمون',hi:'विषय'},
 'Time':{ar:'الوقت',ur:'وقت',hi:'समय'},
 'Venue':{ar:'المكان',ur:'مقام',hi:'स्थान'},
 'Duration':{ar:'المدة',ur:'دورانیہ',hi:'अवधि'},
 'Author':{ar:'المؤلف',ur:'مصنف',hi:'लेखक'},
 'Title':{ar:'العنوان',ur:'عنوان',hi:'शीर्षक'},
 'Borrower':{ar:'المستعير',ur:'مستعیر',hi:'उधारकर्ता'},
 'Due':{ar:'مستحق',ur:'واجب الادا',hi:'देय'},
 'Reference':{ar:'المرجع',ur:'حوالہ',hi:'संदर्भ'},
 'Purpose':{ar:'الغرض',ur:'مقصد',hi:'उद्देश्य'},
 'Host':{ar:'المضيف',ur:'میزبان',hi:'मेज़बान'},
 'Action':{ar:'الإجراء',ur:'عمل',hi:'कार्रवाई'},
 'Note':{ar:'ملاحظة',ur:'نوٹ',hi:'टिप्पणी'},
 'Points':{ar:'النقاط',ur:'پوائنٹس',hi:'अंक'},
 'Contact':{ar:'جهة الاتصال',ur:'رابطہ',hi:'संपर्क'},
 'Details':{ar:'التفاصيل',ur:'تفصیلات',hi:'विवरण'},
 'Owner':{ar:'المالك',ur:'مالک',hi:'स्वामी'},
 'Updated':{ar:'آخر تحديث',ur:'اپ ڈیٹ',hi:'अद्यतन'},
 'Rank':{ar:'الترتيب',ur:'درجہ',hi:'रैंक'},
 'Average':{ar:'المعدل',ur:'اوسط',hi:'औसत'},
 'Marks':{ar:'الدرجات',ur:'نمبر',hi:'अंक'},
 'Progress':{ar:'التقدم',ur:'پیش رفت',hi:'प्रगति'},
 'Capacity':{ar:'السعة',ur:'گنجائش',hi:'क्षमता'},
 'Route':{ar:'المسار',ur:'روٹ',hi:'मार्ग'},
 'Driver':{ar:'السائق',ur:'ڈرائیور',hi:'चालक'},
 'Vehicle':{ar:'المركبة',ur:'گاڑی',hi:'वाहन'},
 'Item':{ar:'الصنف',ur:'آئٹم',hi:'वस्तु'},
 'Facility':{ar:'المرفق',ur:'سہولت',hi:'सुविधा'},
 'Ticket':{ar:'التذكرة',ur:'ٹکٹ',hi:'टिकट'},
 'Audience':{ar:'الجمهور',ur:'سامعین',hi:'दर्शक'},
 'Responses':{ar:'الردود',ur:'جوابات',hi:'प्रतिक्रियाएँ'},
 'Batch':{ar:'الدفعة',ur:'بیچ',hi:'बैच'},
 'Employee':{ar:'الموظف',ur:'ملازم',hi:'कर्मचारी'},
 'Method':{ar:'الطريقة',ur:'طریقہ',hi:'तरीका'},
 'Description':{ar:'الوصف',ur:'تفصیل',hi:'विवरण'},
 'Balance':{ar:'الرصيد',ur:'بیلنس',hi:'शेष'},
 'Applicant':{ar:'مقدم الطلب',ur:'درخواست گزار',hi:'आवेदक'},
 'Result':{ar:'النتيجة',ur:'نتیجہ',hi:'परिणाम'},
 'Module':{ar:'الوحدة',ur:'ماڈیول',hi:'मॉड्यूल'},
 'User':{ar:'المستخدم',ur:'صارف',hi:'उपयोगकर्ता'},
 'Room':{ar:'الغرفة',ur:'کمرہ',hi:'कमरा'},
 'Members':{ar:'الأعضاء',ur:'ممبران',hi:'सदस्य'},
 'Member':{ar:'عضو',ur:'ممبر',hi:'सदस्य'},
 'Channel':{ar:'القناة',ur:'چینل',hi:'चैनल'},
 'Location':{ar:'الموقع',ur:'مقام',hi:'स्थान'},
 'Reason':{ar:'السبب',ur:'وجہ',hi:'कारण'},
 'Score':{ar:'النتيجة',ur:'اسکور',hi:'स्कोर'},
 'Roll':{ar:'رقم القيد',ur:'رول',hi:'रोल'},
 'Fee':{ar:'الرسوم',ur:'فیس',hi:'शुल्क'},
 'Invoice':{ar:'الفاتورة',ur:'انوائس',hi:'चालान'},
 'Plan':{ar:'الخطة',ur:'پلان',hi:'योजना'},
 'Rate':{ar:'المعدل',ur:'شرح',hi:'दर'},
 'Limit':{ar:'الحد',ur:'حد',hi:'सीमा'},
 'Min':{ar:'الأدنى',ur:'کم از کم',hi:'न्यूनतम'},
 'Mode':{ar:'الوضع',ur:'موڈ',hi:'मोड'},
 'Gross':{ar:'الإجمالي',ur:'مجموعی',hi:'सकल'},
 'Net':{ar:'الصافي',ur:'خالص',hi:'शुद्ध'},
 'Copies':{ar:'النسخ',ur:'کاپیاں',hi:'प्रतियाँ'},
 'Dates':{ar:'التواريخ',ur:'تاریخیں',hi:'तिथियाँ'},
 'Stop':{ar:'المحطة',ur:'اسٹاپ',hi:'पड़ाव'},
 'Temp':{ar:'الحرارة',ur:'ٹیمپ',hi:'तापमान'},
 'Records':{ar:'السجلات',ur:'ریکارڈز',hi:'रिकॉर्ड'},
 'Document':{ar:'مستند',ur:'دستاویز',hi:'दस्तावेज़'},
 'Documents':{ar:'المستندات',ur:'دستاویزات',hi:'दस्तावेज़'},
 'Visitor':{ar:'الزائر',ur:'وزیٹر',hi:'आगंतुक'},
 'Enquiry':{ar:'استفسار',ur:'انکوائری',hi:'पूछताछ'},
 'Lead':{ar:'عميل محتمل',ur:'لیڈ',hi:'लीड'},
 'Leads':{ar:'العملاء المحتملون',ur:'لیڈز',hi:'लीड'},
 'Employees':{ar:'الموظفون',ur:'ملازمین',hi:'कर्मचारी'},
 'Grades':{ar:'الصفوف',ur:'گریڈز',hi:'कक्षाएँ'},
 'Units':{ar:'الوحدات',ur:'یونٹس',hi:'इकाइयाँ'},
 'Modules':{ar:'الوحدات',ur:'ماڈیولز',hi:'मॉड्यूल'},
 'Users':{ar:'المستخدمون',ur:'صارفین',hi:'उपयोगकर्ता'},
 'Tickets':{ar:'التذاكر',ur:'ٹکٹس',hi:'टिकट'},
 'Vendors':{ar:'الموردون',ur:'وینڈرز',hi:'विक्रेता'},
 'Mentors':{ar:'الموجهون',ur:'مینٹرز',hi:'मार्गदर्शक'},
 'Facilities':{ar:'المرافق',ur:'سہولیات',hi:'सुविधाएँ'},
 'Alumnus':{ar:'خريج',ur:'فارغ التحصیل',hi:'पूर्व छात्र'},
 'Survey':{ar:'استبيان',ur:'سروے',hi:'सर्वेक्षण'},
 'Budget':{ar:'الميزانية',ur:'بجٹ',hi:'बजट'},
 'Spent':{ar:'المصروف',ur:'خرچ',hi:'खर्च'},
 'Signals':{ar:'الإشارات',ur:'سگنلز',hi:'संकेत'},
 'Risk':{ar:'المخاطر',ur:'خطرہ',hi:'जोखिम'},
 'Share':{ar:'مشاركة',ur:'شیئر',hi:'साझा'},
 'Read':{ar:'مقروء',ur:'پڑھا',hi:'पढ़ा'},
 'Sent':{ar:'أُرسل',ur:'بھیجا',hi:'भेजा'},
 'Delivered':{ar:'تم التسليم',ur:'پہنچایا',hi:'पहुँचाया'},
 'Completed':{ar:'مكتمل',ur:'مکمل',hi:'पूर्ण'},
 'Started':{ar:'بدأ',ur:'شروع',hi:'शुरू'},
 'Statement':{ar:'كشف الحساب',ur:'اسٹیٹمنٹ',hi:'विवरण'},
 'Active':{ar:'نشط',ur:'فعال',hi:'सक्रिय'},
 'Paid':{ar:'مدفوع',ur:'ادا شدہ',hi:'भुगतान'},
 'Overdue':{ar:'متأخر',ur:'زائد المیعاد',hi:'बकाया'},
 'Pending':{ar:'قيد الانتظار',ur:'زیر التوا',hi:'लंबित'},
 'Approved':{ar:'موافق عليه',ur:'منظور شدہ',hi:'स्वीकृत'},
 'Resolved':{ar:'تم الحل',ur:'حل شدہ',hi:'हल'},
 'Open':{ar:'مفتوح',ur:'کھلا',hi:'खुला'},
 'In progress':{ar:'قيد التنفيذ',ur:'جاری',hi:'प्रगति पर'},
 'Confirmed':{ar:'مؤكد',ur:'تصدیق شدہ',hi:'पुष्ट'},
 'On-site':{ar:'في الموقع',ur:'موقع پر',hi:'साइट पर'},
 'Checked out':{ar:'غادر',ur:'روانہ',hi:'चेक-आउट'},
 'Onboarding':{ar:'قيد الإلحاق',ur:'شمولیت',hi:'नियुक्ति'},
 'On Leave':{ar:'في إجازة',ur:'رخصت پر',hi:'अवकाश पर'},
 'On leave today':{ar:'في إجازة اليوم',ur:'آج رخصت پر',hi:'आज अवकाश पर'},
 'Probation':{ar:'تحت المراقبة',ur:'زیر آزمائش',hi:'परिवीक्षा'},
 'Issued':{ar:'صادر',ur:'جاری شدہ',hi:'जारी'},
 'Draft':{ar:'مسودة',ur:'مسودہ',hi:'मसौदा'},
 'Live':{ar:'مباشر',ur:'لائیو',hi:'लाइव'},
 'Closed':{ar:'مغلق',ur:'بند',hi:'बंद'},
 'On track':{ar:'على المسار',ur:'درست سمت',hi:'सही राह पर'},
 'Reserved':{ar:'محجوز',ur:'محفوظ',hi:'आरक्षित'},
 'Present':{ar:'حاضر',ur:'حاضر',hi:'उपस्थित'},
 'Absent':{ar:'غائب',ur:'غیر حاضر',hi:'अनुपस्थित'},
 'Late':{ar:'متأخر',ur:'دیر',hi:'देर'},
 'Available':{ar:'متاح',ur:'دستیاب',hi:'उपलब्ध'},
 'In stock':{ar:'متوفر',ur:'اسٹاک میں',hi:'स्टॉक में'},
 'Export':{ar:'تصدير',ur:'برآمد',hi:'निर्यात'},
 'Export CSV':{ar:'تصدير CSV',ur:'CSV برآمد',hi:'CSV निर्यात'},
 'Export map':{ar:'تصدير الخريطة',ur:'نقشہ برآمد',hi:'मानचित्र निर्यात'},
 'Export log':{ar:'تصدير السجل',ur:'لاگ برآمد',hi:'लॉग निर्यात'},
 'Export results':{ar:'تصدير النتائج',ur:'نتائج برآمد',hi:'परिणाम निर्यात'},
 'Add':{ar:'إضافة',ur:'شامل کریں',hi:'जोड़ें'},
 'New':{ar:'جديد',ur:'نیا',hi:'नया'},
 'Save':{ar:'حفظ',ur:'محفوظ کریں',hi:'सहेजें'},
 'Cancel':{ar:'إلغاء',ur:'منسوخ کریں',hi:'रद्द करें'},
 'Send reminders':{ar:'إرسال تذكيرات',ur:'یاد دہانیاں بھیجیں',hi:'अनुस्मारक भेजें'},
 'Record payment':{ar:'تسجيل دفعة',ur:'ادائیگی درج کریں',hi:'भुगतान दर्ज करें'},
 'Generate report cards':{ar:'إنشاء بطاقات التقارير',ur:'رپورٹ کارڈ بنائیں',hi:'रिपोर्ट कार्ड बनाएँ'},
 'Enter marks':{ar:'إدخال الدرجات',ur:'نمبر درج کریں',hi:'अंक दर्ज करें'},
 'Enter grades':{ar:'إدخال الدرجات',ur:'گریڈ درج کریں',hi:'ग्रेड दर्ज करें'},
 'Add employee':{ar:'إضافة موظف',ur:'ملازم شامل کریں',hi:'कर्मचारी जोड़ें'},
 'Add student':{ar:'إضافة طالب',ur:'طالب علم شامل کریں',hi:'छात्र जोड़ें'},
 'New application':{ar:'طلب جديد',ur:'نئی درخواست',hi:'नया आवेदन'},
 'New lead':{ar:'عميل محتمل جديد',ur:'نیا لیڈ',hi:'नया लीड'},
 'Message parents':{ar:'مراسلة أولياء الأمور',ur:'والدین کو پیغام',hi:'अभिभावकों को संदेश'},
 'Message guardian':{ar:'مراسلة ولي الأمر',ur:'سرپرست کو پیغام',hi:'अभिभावक को संदेश'},
 'Add section':{ar:'إضافة شعبة',ur:'سیکشن شامل کریں',hi:'अनुभाग जोड़ें'},
 'New announcement':{ar:'إعلان جديد',ur:'نیا اعلان',hi:'नई घोषणा'},
 'Issue certificate':{ar:'إصدار شهادة',ur:'سرٹیفکیٹ جاری کریں',hi:'प्रमाणपत्र जारी करें'},
 'New ticket':{ar:'تذكرة جديدة',ur:'نیا ٹکٹ',hi:'नया टिकट'},
 'New survey':{ar:'استبيان جديد',ur:'نیا سروے',hi:'नया सर्वेक्षण'},
 'Book facility':{ar:'حجز مرفق',ur:'سہولت بک کریں',hi:'सुविधा बुक करें'},
 'Top up wallet':{ar:'شحن المحفظة',ur:'والٹ ری چارج',hi:'वॉलेट टॉप-अप'},
 'Allocate room':{ar:'تخصيص غرفة',ur:'کمرہ مختص کریں',hi:'कमरा आवंटित करें'},
 'Add device':{ar:'إضافة جهاز',ur:'ڈیوائس شامل کریں',hi:'डिवाइस जोड़ें'},
 'Add route':{ar:'إضافة مسار',ur:'روٹ شامل کریں',hi:'मार्ग जोड़ें'},
 'Add vehicle':{ar:'إضافة مركبة',ur:'گاڑی شامل کریں',hi:'वाहन जोड़ें'},
 'Issue book':{ar:'إعارة كتاب',ur:'کتاب جاری کریں',hi:'पुस्तक जारी करें'},
 'Add title':{ar:'إضافة عنوان',ur:'عنوان شامل کریں',hi:'शीर्षक जोड़ें'},
 'Log expense':{ar:'تسجيل مصروف',ur:'خرچ درج کریں',hi:'व्यय दर्ज करें'},
 'New visit':{ar:'زيارة جديدة',ur:'نیا وزٹ',hi:'नई विज़िट'},
 'Add event':{ar:'إضافة فعالية',ur:'ایونٹ شامل کریں',hi:'कार्यक्रम जोड़ें'},
 'New course':{ar:'دورة جديدة',ur:'نیا کورس',hi:'नया कोर्स'},
 'Run payroll':{ar:'تشغيل الرواتب',ur:'پے رول چلائیں',hi:'वेतन चलाएँ'},
 'Refresh':{ar:'تحديث',ur:'ریفریش',hi:'ताज़ा करें'},
 'Sync now':{ar:'مزامنة الآن',ur:'ابھی سِنک کریں',hi:'अभी सिंक करें'},
 'Add unit':{ar:'إضافة وحدة',ur:'یونٹ شامل کریں',hi:'यूनिट जोड़ें'},
 'Approve':{ar:'موافقة',ur:'منظور کریں',hi:'स्वीकृत करें'},
 'Apply':{ar:'تقديم',ur:'درخواست دیں',hi:'आवेदन करें'},
 'Publish':{ar:'نشر',ur:'شائع کریں',hi:'प्रकाशित करें'},
 'Add alumnus':{ar:'إضافة خريج',ur:'فارغ التحصیل شامل کریں',hi:'पूर्व छात्र जोड़ें'},
 'Add item':{ar:'إضافة صنف',ur:'آئٹم شامل کریں',hi:'वस्तु जोड़ें'},
 'Add role':{ar:'إضافة دور',ur:'کردار شامل کریں',hi:'भूमिका जोड़ें'},
 'All surveys':{ar:'جميع الاستبيانات',ur:'تمام سروے',hi:'सभी सर्वेक्षण'},
 'Generate WPS file':{ar:'إنشاء ملف WPS',ur:'WPS فائل بنائیں',hi:'WPS फ़ाइल बनाएँ'},
 'Live map':{ar:'خريطة مباشرة',ur:'لائیو نقشہ',hi:'लाइव मानचित्र'},
 'Notify overdue':{ar:'تنبيه المتأخرين',ur:'زائد المیعاد اطلاع',hi:'बकाया सूचित करें'},
 'Raise PO':{ar:'إصدار أمر شراء',ur:'PO جاری کریں',hi:'PO बनाएँ'},
 'Print badge':{ar:'طباعة البطاقة',ur:'بیج پرنٹ',hi:'बैज प्रिंट'},
 'Take attendance':{ar:'تسجيل الحضور',ur:'حاضری لیں',hi:'उपस्थिति लें'},
 'Post assignment':{ar:'نشر واجب',ur:'اسائنمنٹ پوسٹ',hi:'असाइनमेंट पोस्ट'},
 'Subscribe':{ar:'اشتراك',ur:'سبسکرائب',hi:'सदस्यता लें'},
 'Check in':{ar:'تسجيل دخول',ur:'چیک اِن',hi:'चेक-इन'},
 'Check-in':{ar:'تسجيل الدخول',ur:'چیک اِن',hi:'चेक-इन'},
 'Check-out':{ar:'تسجيل الخروج',ur:'چیک آؤٹ',hi:'चेक-आउट'},
 'Total students':{ar:'إجمالي الطلاب',ur:'کل طلبہ',hi:'कुल छात्र'},
 'Today\'s attendance':{ar:'حضور اليوم',ur:'آج کی حاضری',hi:'आज की उपस्थिति'},
 'Open admissions':{ar:'القبول المفتوح',ur:'کھلے داخلے',hi:'खुले प्रवेश'},
 'Total applications':{ar:'إجمالي الطلبات',ur:'کل درخواستیں',hi:'कुल आवेदन'},
 'In pipeline':{ar:'قيد المعالجة',ur:'پائپ لائن میں',hi:'पाइपलाइन में'},
 'Offers out':{ar:'العروض المرسلة',ur:'جاری کردہ آفرز',hi:'भेजे गए ऑफ़र'},
 'Conversion':{ar:'التحويل',ur:'کنورژن',hi:'रूपांतरण'},
 'Total leads':{ar:'إجمالي العملاء المحتملين',ur:'کل لیڈز',hi:'कुल लीड'},
 'In follow-up':{ar:'قيد المتابعة',ur:'فالو اپ میں',hi:'फ़ॉलो-अप में'},
 'Tours':{ar:'الجولات',ur:'دورے',hi:'दौरे'},
 'Total staff':{ar:'إجمالي الموظفين',ur:'کل عملہ',hi:'कुल स्टाफ़'},
 'Present today':{ar:'الحاضرون اليوم',ur:'آج حاضر',hi:'आज उपस्थित'},
 'Monthly payroll':{ar:'الرواتب الشهرية',ur:'ماہانہ تنخواہ',hi:'मासिक वेतन'},
 'Class average':{ar:'معدل الفصل',ur:'کلاس اوسط',hi:'कक्षा औसत'},
 'Pass rate':{ar:'نسبة النجاح',ur:'کامیابی کی شرح',hi:'उत्तीर्ण दर'},
 'Need support':{ar:'يحتاجون دعمًا',ur:'مدد درکار',hi:'सहायता चाहिए'},
 'Top scorer':{ar:'الأعلى درجة',ur:'ٹاپ اسکورر',hi:'शीर्ष अंक'},
 'Active courses':{ar:'الدورات النشطة',ur:'فعال کورسز',hi:'सक्रिय कोर्स'},
 'Assignments':{ar:'الواجبات',ur:'اسائنمنٹس',hi:'असाइनमेंट'},
 'Submissions':{ar:'التسليمات',ur:'جمع شدہ',hi:'सबमिशन'},
 'Subjects':{ar:'المواد',ur:'مضامین',hi:'विषय'},
 'Resources':{ar:'الموارد',ur:'وسائل',hi:'संसाधन'},
 'Coverage':{ar:'التغطية',ur:'کوریج',hi:'कवरेज'},
 'Titles':{ar:'العناوين',ur:'عنوانات',hi:'शीर्षक'},
 'On loan':{ar:'معارة',ur:'قرض پر',hi:'ऋण पर'},
 'Active routes':{ar:'المسارات النشطة',ur:'فعال روٹس',hi:'सक्रिय मार्ग'},
 'Riders':{ar:'الركاب',ur:'سوار',hi:'सवार'},
 'Alerts':{ar:'التنبيهات',ur:'الرٹس',hi:'चेतावनियाँ'},
 'On-time':{ar:'في الموعد',ur:'وقت پر',hi:'समय पर'},
 'Total beds':{ar:'إجمالي الأسرّة',ur:'کل بستر',hi:'कुल बिस्तर'},
 'Occupancy':{ar:'الإشغال',ur:'قبضہ',hi:'अधिभोग'},
 'Open requests':{ar:'الطلبات المفتوحة',ur:'کھلی درخواستیں',hi:'खुले अनुरोध'},
 'Wardens':{ar:'المشرفون',ur:'وارڈن',hi:'वार्डन'},
 'Asset items':{ar:'أصناف الأصول',ur:'اثاثہ اشیاء',hi:'संपत्ति मद'},
 'Total value':{ar:'القيمة الإجمالية',ur:'کل مالیت',hi:'कुल मूल्य'},
 'Low stock':{ar:'مخزون منخفض',ur:'کم اسٹاک',hi:'कम स्टॉक'},
 'Upcoming':{ar:'القادمة',ur:'آئندہ',hi:'आगामी'},
 'Exam days':{ar:'أيام الامتحانات',ur:'امتحانی دن',hi:'परीक्षा दिन'},
 'Holidays':{ar:'العطلات',ur:'تعطیلات',hi:'अवकाश'},
 'Devices online':{ar:'الأجهزة المتصلة',ur:'آن لائن ڈیوائسز',hi:'ऑनलाइन डिवाइस'},
 'Offline':{ar:'غير متصل',ur:'آف لائن',hi:'ऑफ़लाइन'},
 'On-site now':{ar:'في الموقع الآن',ur:'ابھی موقع پر',hi:'अभी साइट पर'},
 'Today total':{ar:'إجمالي اليوم',ur:'آج کا کل',hi:'आज कुल'},
 'Incidents':{ar:'الحوادث',ur:'واقعات',hi:'घटनाएँ'},
 'Detentions':{ar:'الاحتجازات',ur:'ڈیٹینشنز',hi:'निरोध'},
 'Visits today':{ar:'زيارات اليوم',ur:'آج کے وزٹ',hi:'आज विज़िट'},
 'Sent home':{ar:'أُرسلوا للمنزل',ur:'گھر بھیجا',hi:'घर भेजा'},
 'Subscriptions':{ar:'الاشتراكات',ur:'سبسکرپشنز',hi:'सदस्यताएँ'},
 'Wallet balance':{ar:'رصيد المحفظة',ur:'والٹ بیلنس',hi:'वॉलेट शेष'},
 'Templates':{ar:'القوالب',ur:'ٹیمپلیٹس',hi:'टेम्पलेट'},
 'System roles':{ar:'أدوار النظام',ur:'سسٹم رولز',hi:'सिस्टम भूमिकाएँ'},
 'Events today':{ar:'أحداث اليوم',ur:'آج کے ایونٹس',hi:'आज कार्यक्रम'},
 'Active users':{ar:'المستخدمون النشطون',ur:'فعال صارفین',hi:'सक्रिय उपयोगकर्ता'},
 'Failed logins':{ar:'محاولات دخول فاشلة',ur:'ناکام لاگ اِن',hi:'विफल लॉगिन'},
 'Exports':{ar:'التصديرات',ur:'برآمدات',hi:'निर्यात'},
 'Annual budget':{ar:'الميزانية السنوية',ur:'سالانہ بجٹ',hi:'वार्षिक बजट'},
 'Spent to date':{ar:'المصروف حتى الآن',ur:'اب تک خرچ',hi:'अब तक खर्च'},
 'Total alumni':{ar:'إجمالي الخريجين',ur:'کل فارغ التحصیل',hi:'कुल पूर्व छात्र'},
 'Total responses':{ar:'إجمالي الردود',ur:'کل جوابات',hi:'कुल प्रतिक्रियाएँ'},
 'Active surveys':{ar:'الاستبيانات النشطة',ur:'فعال سروے',hi:'सक्रिय सर्वेक्षण'},
 'Bookings today':{ar:'حجوزات اليوم',ur:'آج کی بکنگ',hi:'आज बुकिंग'},
 'Available now':{ar:'متاح الآن',ur:'ابھی دستیاب',hi:'अभी उपलब्ध'},
 'Under maintenance':{ar:'تحت الصيانة',ur:'زیر مرمت',hi:'रखरखाव में'},
 'Guardian accounts':{ar:'حسابات أولياء الأمور',ur:'سرپرست اکاؤنٹس',hi:'अभिभावक खाते'},
 'Portal active':{ar:'البوابة نشطة',ur:'پورٹل فعال',hi:'पोर्टल सक्रिय'},
 'Fees cleared':{ar:'الرسوم المسددة',ur:'فیس ادا',hi:'शुल्क चुकता'},
 'At-risk students':{ar:'الطلاب المعرضون للخطر',ur:'خطرے میں طلبہ',hi:'जोखिम वाले छात्र'},
 'Model confidence':{ar:'ثقة النموذج',ur:'ماڈل اعتماد',hi:'मॉडल विश्वास'},
 'Anomalies detected':{ar:'الحالات الشاذة المكتشفة',ur:'بے قاعدگیاں',hi:'विसंगतियाँ मिलीं'},
 'Modules governed':{ar:'الوحدات المُدارة',ur:'زیر انتظام ماڈیولز',hi:'शासित मॉड्यूल'},
 'Permission grants':{ar:'منح الصلاحيات',ur:'اجازت گرانٹس',hi:'अनुमति अनुदान'},
 'Punches today':{ar:'التسجيلات اليوم',ur:'آج کے پنچ',hi:'आज पंच'},
 'Last full sync':{ar:'آخر مزامنة كاملة',ur:'آخری مکمل سِنک',hi:'अंतिम पूर्ण सिंक'},
 'Last sync':{ar:'آخر مزامنة',ur:'آخری سِنک',hi:'अंतिम सिंक'},
 'Papers to grade':{ar:'أوراق للتصحيح',ur:'گریڈ کے پرچے',hi:'ग्रेड करने के पेपर'},
 'Pending approval':{ar:'بانتظار الموافقة',ur:'منظوری زیر التوا',hi:'स्वीकृति लंबित'},
 'Pending requests':{ar:'الطلبات المعلقة',ur:'زیر التوا درخواستیں',hi:'लंबित अनुरोध'},
 'Open POs':{ar:'أوامر الشراء المفتوحة',ur:'کھلے PO',hi:'खुले PO'},
 'Overdue invoices':{ar:'الفواتير المتأخرة',ur:'زائد المیعاد انوائسز',hi:'बकाया चालान'},
 'Leave balance':{ar:'رصيد الإجازات',ur:'رخصت بیلنس',hi:'अवकाश शेष'},
 'Resolved today':{ar:'تم الحل اليوم',ur:'آج حل شدہ',hi:'आज हल'},
 'Response rate':{ar:'معدل الاستجابة',ur:'جوابی شرح',hi:'प्रतिक्रिया दर'},
 'Verified online':{ar:'موثّق عبر الإنترنت',ur:'آن لائن تصدیق شدہ',hi:'ऑनलाइन सत्यापित'},
 'Utilisation':{ar:'الاستغلال',ur:'استعمال',hi:'उपयोग'},
 'Top house':{ar:'البيت المتصدر',ur:'سرفہرست ہاؤس',hi:'शीर्ष हाउस'},
 'Units mapped':{ar:'الوحدات المخططة',ur:'میپ شدہ یونٹس',hi:'मैप की गई इकाइयाँ'},
 'System health':{ar:'صحة النظام',ur:'سسٹم صحت',hi:'सिस्टम स्वास्थ्य'},
 'New messages':{ar:'رسائل جديدة',ur:'نئے پیغامات',hi:'नए संदेश'},
 'Subscribers':{ar:'المشتركون',ur:'سبسکرائبرز',hi:'सदस्य'},
 'Flagged allergies':{ar:'الحساسيات المميزة',ur:'نشان زد الرجیز',hi:'चिह्नित एलर्जी'},
 'Immunisation':{ar:'التطعيم',ur:'حفاظتی ٹیکے',hi:'टीकाकरण'},
 'Allergy plans':{ar:'خطط الحساسية',ur:'الرجی پلانز',hi:'एलर्जी योजनाएँ'},
 'Leaderboard':{ar:'لوحة المتصدرين',ur:'لیڈر بورڈ',hi:'लीडरबोर्ड'},
 'Perfect attendance':{ar:'حضور مثالي',ur:'مکمل حاضری',hi:'पूर्ण उपस्थिति'},
 'Working days':{ar:'أيام العمل',ur:'کام کے دن',hi:'कार्य दिवस'},
 'Chronic absentees':{ar:'الغياب المزمن',ur:'مسلسل غیر حاضر',hi:'लगातार अनुपस्थित'},
 'Avg attendance':{ar:'متوسط الحضور',ur:'اوسط حاضری',hi:'औसत उपस्थिति'},
 'GPA':{ar:'المعدل التراكمي',ur:'GPA',hi:'GPA'},
 'My GPA':{ar:'معدلي التراكمي',ur:'میرا GPA',hi:'मेरा GPA'},
 'Term GPA':{ar:'المعدل الفصلي',ur:'ٹرم GPA',hi:'टर्म GPA'},
 'Directory':{ar:'الدليل',ur:'ڈائریکٹری',hi:'निर्देशिका'},
 'Leave & attendance':{ar:'الإجازات والحضور',ur:'رخصت و حاضری',hi:'अवकाश और उपस्थिति'},
 'Daily register':{ar:'السجل اليومي',ur:'روزانہ رجسٹر',hi:'दैनिक रजिस्टर'},
 'Monthly summary':{ar:'الملخص الشهري',ur:'ماہانہ خلاصہ',hi:'मासिक सारांश'},
 'Analytics':{ar:'التحليلات',ur:'اینالیٹکس',hi:'विश्लेषण'},
 'Results':{ar:'النتائج',ur:'نتائج',hi:'परिणाम'},
 'Exam schedule':{ar:'جدول الامتحانات',ur:'امتحانی شیڈول',hi:'परीक्षा कार्यक्रम'},
 'Subject analysis':{ar:'تحليل المواد',ur:'مضمون تجزیہ',hi:'विषय विश्लेषण'},
 'Invoices':{ar:'الفواتير',ur:'انوائسز',hi:'चालान'},
 'Fee structure':{ar:'هيكل الرسوم',ur:'فیس ڈھانچہ',hi:'शुल्क संरचना'},
 'Collections':{ar:'التحصيلات',ur:'وصولیاں',hi:'संग्रह'},
 'Circulation':{ar:'الإعارة',ur:'گردش',hi:'परिचालन'},
 'Catalogue':{ar:'الفهرس',ur:'کیٹلاگ',hi:'सूची-पत्र'},
 'Meetings':{ar:'الاجتماعات',ur:'ملاقاتیں',hi:'बैठकें'},
 'Routes':{ar:'المسارات',ur:'روٹس',hi:'मार्ग'},
 'Fleet & drivers':{ar:'الأسطول والسائقون',ur:'فلیٹ و ڈرائیورز',hi:'बेड़ा और चालक'},
 'Announcements':{ar:'الإعلانات',ur:'اعلانات',hi:'घोषणाएँ'},
 'Newsletter':{ar:'النشرة الإخبارية',ur:'نیوز لیٹر',hi:'न्यूज़लेटर'},
 'Assessment':{ar:'التقييم',ur:'تشخیص',hi:'मूल्यांकन'},
 'Boarding':{ar:'الإقامة',ur:'بورڈنگ',hi:'बोर्डिंग'},
 'Portal':{ar:'البوابة',ur:'پورٹل',hi:'पोर्टल'},
 'Branding':{ar:'الهوية',ur:'برانڈنگ',hi:'ब्रांडिंग'},
 'Availability':{ar:'التوفر',ur:'دستیابی',hi:'उपलब्धता'},
 'Recent announcements':{ar:'أحدث الإعلانات',ur:'حالیہ اعلانات',hi:'हालिया घोषणाएँ'},
 'Channels':{ar:'القنوات',ur:'چینلز',hi:'चैनल'},
 'Recent payments':{ar:'المدفوعات الأخيرة',ur:'حالیہ ادائیگیاں',hi:'हाल के भुगतान'},
 'Payment methods':{ar:'طرق الدفع',ur:'ادائیگی کے طریقے',hi:'भुगतान के तरीके'},
 'Grade distribution':{ar:'توزيع الدرجات',ur:'گریڈ تقسیم',hi:'ग्रेड वितरण'},
 'Subject averages':{ar:'معدلات المواد',ur:'مضامین اوسط',hi:'विषय औसत'},
 'Recent entries':{ar:'الإدخالات الأخيرة',ur:'حالیہ اندراجات',hi:'हाल की प्रविष्टियाँ'},
 'Recent loans':{ar:'الإعارات الأخيرة',ur:'حالیہ قرضے',hi:'हाल के ऋण'},
 'Recent grades':{ar:'الدرجات الأخيرة',ur:'حالیہ گریڈز',hi:'हाल के ग्रेड'},
 'Recent requests':{ar:'الطلبات الأخيرة',ur:'حالیہ درخواستیں',hi:'हाल के अनुरोध'},
 'Meal plans':{ar:'خطط الوجبات',ur:'کھانے کے منصوبے',hi:'भोजन योजनाएँ'},
 'Device status':{ar:'حالة الأجهزة',ur:'ڈیوائس کی حالت',hi:'डिवाइस स्थिति'},
 'Leave requests':{ar:'طلبات الإجازة',ur:'رخصت کی درخواستیں',hi:'अवकाश अनुरोध'},
 'In onboarding':{ar:'قيد الإلحاق',ur:'شمولیت میں',hi:'नियुक्ति में'},
 'Summary':{ar:'ملخص',ur:'خلاصہ',hi:'सारांश'},
 'Pipeline':{ar:'المسار',ur:'پائپ لائن',hi:'पाइपलाइन'},
 'Recommended actions':{ar:'الإجراءات الموصى بها',ur:'تجویز کردہ اقدامات',hi:'अनुशंसित कार्रवाई'},
 'Recent activity':{ar:'النشاط الأخير',ur:'حالیہ سرگرمی',hi:'हाल की गतिविधि'},
 'Priority insights':{ar:'رؤى ذات أولوية',ur:'ترجیحی بصیرت',hi:'प्राथमिकता अंतर्दृष्टि'},
 'Permission matrix':{ar:'مصفوفة الصلاحيات',ur:'اجازت میٹرکس',hi:'अनुमति मैट्रिक्स'},
 'Enrolment by grade':{ar:'التسجيل حسب الصف',ur:'گریڈ وار اندراج',hi:'ग्रेड अनुसार नामांकन'},
 'Fee collection':{ar:'تحصيل الرسوم',ur:'فیس وصولی',hi:'शुल्क संग्रह'},
 'Fee collection rate':{ar:'معدل تحصيل الرسوم',ur:'فیس وصولی شرح',hi:'शुल्क संग्रह दर'},
 'Attendance this week':{ar:'الحضور هذا الأسبوع',ur:'اس ہفتے حاضری',hi:'इस सप्ताह उपस्थिति'},
 'Admissions pipeline':{ar:'مسار القبول',ur:'داخلہ پائپ لائن',hi:'प्रवेश पाइपलाइन'},
 'Lead funnel':{ar:'قمع العملاء المحتملين',ur:'لیڈ فنل',hi:'लीड फ़नल'},
 'Quick actions':{ar:'إجراءات سريعة',ur:'فوری اعمال',hi:'त्वरित कार्य'},
 'Documents & downloads':{ar:'المستندات والتنزيلات',ur:'دستاویزات و ڈاؤن لوڈز',hi:'दस्तावेज़ और डाउनलोड'},
 'Catalogue by category':{ar:'الفهرس حسب الفئة',ur:'زمرہ وار کیٹلاگ',hi:'श्रेणी अनुसार सूची'},
 'Riders & route assignment':{ar:'الركاب وتوزيع المسارات',ur:'سوار و روٹ تفویض',hi:'सवार व मार्ग आवंटन'},
 'Stock levels':{ar:'مستويات المخزون',ur:'اسٹاک لیول',hi:'स्टॉक स्तर'},
 'Students needing support':{ar:'الطلاب المحتاجون للدعم',ur:'مدد درکار طلبہ',hi:'सहायता चाहने वाले छात्र'},
 'Recent messages to parents':{ar:'رسائل حديثة لأولياء الأمور',ur:'والدین کو حالیہ پیغامات',hi:'अभिभावकों को हाल के संदेश'},
 'Fee status':{ar:'حالة الرسوم',ur:'فیس کی حیثیت',hi:'शुल्क स्थिति'},
 'Fee head':{ar:'بند الرسوم',ur:'فیس مد',hi:'शुल्क मद'},
 'Fee statement':{ar:'كشف الرسوم',ur:'فیس اسٹیٹمنٹ',hi:'शुल्क विवरण'},
 'Report card':{ar:'بطاقة التقرير',ur:'رپورٹ کارڈ',hi:'रिपोर्ट कार्ड'},
 'My report card':{ar:'بطاقة تقريري',ur:'میرا رپورٹ کارڈ',hi:'मेरा रिपोर्ट कार्ड'},
 'My documents':{ar:'مستنداتي',ur:'میری دستاویزات',hi:'मेरे दस्तावेज़'},
 'My classes today':{ar:'فصولي اليوم',ur:'آج میری کلاسز',hi:'आज मेरी कक्षाएँ'},
 'Today\'s classes':{ar:'فصول اليوم',ur:'آج کی کلاسز',hi:'आज की कक्षाएँ'},
 'Today\'s schedule':{ar:'جدول اليوم',ur:'آج کا شیڈول',hi:'आज का कार्यक्रम'},
 'Today\'s clinic log':{ar:'سجل العيادة اليوم',ur:'آج کا کلینک لاگ',hi:'आज का क्लिनिक लॉग'},
 'Today\'s visitor log':{ar:'سجل زوار اليوم',ur:'آج کا وزیٹر لاگ',hi:'आज का आगंतुक लॉग'},
 'Weak area':{ar:'منطقة الضعف',ur:'کمزور شعبہ',hi:'कमज़ोर क्षेत्र'},
 'Students taught':{ar:'الطلاب المُدرَّسون',ur:'پڑھائے گئے طلبہ',hi:'पढ़ाए गए छात्र'},
 'Linked student':{ar:'الطالب المرتبط',ur:'منسلک طالب علم',hi:'संबद्ध छात्र'},
 'Current path':{ar:'المسار الحالي',ur:'موجودہ راہ',hi:'वर्तमान पथ'},
 'Active network':{ar:'الشبكة النشطة',ur:'فعال نیٹ ورک',hi:'सक्रिय नेटवर्क'},
 'Raised by':{ar:'مقدَّم من',ur:'جمع کرانے والا',hi:'द्वारा उठाया'},
 'Booked by':{ar:'حجز بواسطة',ur:'بک کردہ',hi:'बुक किया'},
 'Applies to':{ar:'ينطبق على',ur:'لاگو',hi:'लागू'},
 'Per term':{ar:'لكل فصل',ur:'فی ٹرم',hi:'प्रति टर्म'},
 'This term':{ar:'هذا الفصل',ur:'اس ٹرم',hi:'इस टर्म'},
 'Deductions':{ar:'الخصومات',ur:'کٹوتیاں',hi:'कटौती'},
 'Maths':{ar:'الرياضيات',ur:'ریاضی',hi:'गणित'},
 'Science':{ar:'العلوم',ur:'سائنس',hi:'विज्ञान'},
 'No students match':{ar:'لا يوجد طلاب مطابقون',ur:'کوئی طالب علم نہیں',hi:'कोई छात्र नहीं'},
 'No staff match':{ar:'لا يوجد موظفون مطابقون',ur:'کوئی عملہ نہیں',hi:'कोई स्टाफ़ नहीं'},
 'No applications match':{ar:'لا توجد طلبات مطابقة',ur:'کوئی درخواست نہیں',hi:'कोई आवेदन नहीं'},
 'No leads in this view':{ar:'لا عملاء محتملون في هذا العرض',ur:'اس منظر میں کوئی لیڈ نہیں',hi:'इस दृश्य में कोई लीड नहीं'},
 'No students at risk':{ar:'لا طلاب معرضون للخطر',ur:'خطرے میں کوئی طالب نہیں',hi:'कोई छात्र जोखिम में नहीं'},
 'No classes match':{ar:'لا توجد فصول مطابقة',ur:'کوئی کلاس نہیں',hi:'कोई कक्षा नहीं'},
 'No events match':{ar:'لا توجد فعاليات مطابقة',ur:'کوئی ایونٹ نہیں',hi:'कोई कार्यक्रम नहीं'},
 'No guardians match':{ar:'لا يوجد أولياء أمور مطابقون',ur:'کوئی سرپرست نہیں',hi:'कोई अभिभावक नहीं'},
 'No alumni match':{ar:'لا يوجد خريجون مطابقون',ur:'کوئی فارغ التحصیل نہیں',hi:'कोई पूर्व छात्र नहीं'},
 'No active onboarding':{ar:'لا إلحاق نشط',ur:'کوئی فعال شمولیت نہیں',hi:'कोई सक्रिय नियुक्ति नहीं'},
 'Collections, dues and payroll status for June 2025.':{ar:'التحصيلات والمستحقات وحالة الرواتب ليونيو 2025.',ur:'جون 2025 کے لیے وصولیاں، واجبات اور تنخواہ کی حالت۔',hi:'जून 2025 के लिए संग्रह, बकाया और वेतन स्थिति।'},
 '1,486 enrolled across 14 grades. Click any student for their full profile.':{ar:'1,486 مسجلين في 14 صفًا. انقر على أي طالب لعرض ملفه الكامل.',ur:'14 گریڈز میں 1,486 اندراج۔ مکمل پروفائل کے لیے کسی طالب علم پر کلک کریں۔',hi:'14 कक्षाओं में 1,486 नामांकित। पूरी प्रोफ़ाइल के लिए किसी छात्र पर क्लिक करें।'},
 'Linked guardian accounts with portal access, communication and meetings.':{ar:'حسابات أولياء أمور مرتبطة مع وصول للبوابة وتواصل واجتماعات.',ur:'پورٹل رسائی، رابطہ اور ملاقاتوں کے ساتھ منسلک سرپرست اکاؤنٹس۔',hi:'पोर्टल पहुँच, संचार और बैठकों सहित संबद्ध अभिभावक खाते।'},
 'Broadcast announcements and message families via in-app, email and SMS.':{ar:'بث الإعلانات ومراسلة العائلات عبر التطبيق والبريد والرسائل النصية.',ur:'ایپ، ای میل اور SMS کے ذریعے اعلانات اور خاندانوں کو پیغام۔',hi:'ऐप, ईमेल और SMS के ज़रिए घोषणाएँ और परिवारों को संदेश।'},
 'Cross-module insight on enrolment, attendance, academics and finance.':{ar:'رؤى شاملة حول التسجيل والحضور والأكاديميات والمالية.',ur:'اندراج، حاضری، تعلیم اور مالیات پر بصیرت۔',hi:'नामांकन, उपस्थिति, शिक्षा और वित्त पर अंतर्दृष्टि।'},
 'Subject units, learning outcomes and teaching coverage per grade and term.':{ar:'وحدات المواد ونواتج التعلم وتغطية التدريس لكل صف وفصل.',ur:'فی گریڈ و ٹرم مضمون یونٹس، نتائج اور تدریسی کوریج۔',hi:'प्रति ग्रेड व टर्म विषय इकाइयाँ, परिणाम और शिक्षण कवरेज।'},
 'Courses, assignments and digital lessons delivered to every class.':{ar:'دورات وواجبات ودروس رقمية تُقدَّم لكل فصل.',ur:'ہر کلاس کے لیے کورسز، اسائنمنٹس اور ڈیجیٹل اسباق۔',hi:'हर कक्षा के लिए कोर्स, असाइनमेंट और डिजिटल पाठ।'},
 'Catalogue, issue and return, reservations and overdue tracking.':{ar:'الفهرس والإعارة والإرجاع والحجوزات وتتبع المتأخرات.',ur:'کیٹلاگ، اجرا و واپسی، ریزرویشنز اور زائد المیعاد ٹریکنگ۔',hi:'सूची, जारी व वापसी, आरक्षण और बकाया ट्रैकिंग।'},
 'Room allocation, occupancy, wardens and boarder welfare.':{ar:'تخصيص الغرف والإشغال والمشرفين ورعاية المقيمين.',ur:'کمرہ تفویض، قبضہ، وارڈن اور رہائشیوں کی فلاح۔',hi:'कमरा आवंटन, अधिभोग, वार्डन और छात्रावासी कल्याण।'},
 'Assets, lab and IT stock, purchase orders and reorder alerts.':{ar:'الأصول ومخزون المختبرات وتقنية المعلومات وأوامر الشراء وتنبيهات إعادة الطلب.',ur:'اثاثے، لیب و IT اسٹاک، خریداری آرڈرز اور ری آرڈر الرٹس۔',hi:'संपत्ति, लैब व IT स्टॉक, क्रय आदेश और पुनःऑर्डर चेतावनी।'},
 'Academic calendar, exams, holidays and school-wide events for Term 2.':{ar:'التقويم الأكاديمي والامتحانات والعطلات وفعاليات المدرسة للفصل 2.',ur:'ٹرم 2 کے لیے تعلیمی کیلنڈر، امتحانات، تعطیلات اور ایونٹس۔',hi:'टर्म 2 हेतु शैक्षणिक कैलेंडर, परीक्षाएँ, अवकाश और कार्यक्रम।'},
 'Face, fingerprint and card devices feeding live attendance into the register.':{ar:'أجهزة الوجه والبصمة والبطاقات تُغذّي الحضور المباشر في السجل.',ur:'چہرہ، فنگر پرنٹ اور کارڈ ڈیوائسز رجسٹر میں لائیو حاضری بھیجتے ہیں۔',hi:'चेहरा, फ़िंगरप्रिंट और कार्ड डिवाइस रजिस्टर में लाइव उपस्थिति भेजते हैं।'},
 'Merits, incidents and pastoral notes — house points roll up to the leaderboard.':{ar:'نقاط الجدارة والحوادث والملاحظات التربوية — نقاط البيوت تُجمع في لوحة المتصدرين.',ur:'میرٹ، واقعات اور رہنمائی نوٹس — ہاؤس پوائنٹس لیڈر بورڈ میں۔',hi:'मेरिट, घटनाएँ और पास्टोरल नोट्स — हाउस अंक लीडरबोर्ड में।'},
 'Clinic visits, medical records, allergies and immunisation tracking.':{ar:'زيارات العيادة والسجلات الطبية والحساسيات وتتبع التطعيمات.',ur:'کلینک وزٹ، طبی ریکارڈ، الرجیز اور حفاظتی ٹیکوں کی ٹریکنگ۔',hi:'क्लिनिक विज़िट, चिकित्सा रिकॉर्ड, एलर्जी और टीकाकरण ट्रैकिंग।'},
 'Rooms, labs, halls and shared resources with live availability and scheduling.':{ar:'الغرف والمختبرات والقاعات والموارد المشتركة مع توفر مباشر وجدولة.',ur:'کمرے، لیبز، ہال اور مشترکہ وسائل لائیو دستیابی و شیڈولنگ کے ساتھ۔',hi:'लाइव उपलब्धता व शेड्यूलिंग सहित कमरे, लैब, हॉल और साझा संसाधन।'},
 'IT and facilities support tickets with priority, SLA and resolution tracking.':{ar:'تذاكر دعم تقنية المعلومات والمرافق مع الأولوية واتفاقية الخدمة وتتبع الحل.',ur:'IT و سہولیات سپورٹ ٹکٹس، ترجیح، SLA اور حل ٹریکنگ کے ساتھ۔',hi:'प्राथमिकता, SLA व समाधान ट्रैकिंग सहित IT व सुविधा टिकट।'},
 'Parent, staff and student surveys with response tracking and sentiment.':{ar:'استبيانات أولياء الأمور والموظفين والطلاب مع تتبع الردود والمشاعر.',ur:'والدین، عملہ اور طلبہ کے سروے، جوابی ٹریکنگ اور رجحان کے ساتھ۔',hi:'अभिभावक, स्टाफ़ व छात्र सर्वेक्षण, प्रतिक्रिया ट्रैकिंग व भावना सहित।'},
 'You have 4 classes and 1 assessment due today.':{ar:'لديك 4 حصص وتقييم واحد مستحق اليوم.',ur:'آج آپ کی 4 کلاسز اور 1 تشخیص ہے۔',hi:'आज आपकी 4 कक्षाएँ और 1 मूल्यांकन देय है।'}
});
Object.assign(I18N,{
 'Approval centre':{ar:'مركز الموافقات',ur:'منظوری مرکز',hi:'स्वीकृति केंद्र'},
 'Review':{ar:'مراجعة',ur:'جائزہ',hi:'समीक्षा'},
 'Request details':{ar:'تفاصيل الطلب',ur:'درخواست کی تفصیلات',hi:'अनुरोध विवरण'},
 'Approval chain':{ar:'سلسلة الموافقة',ur:'منظوری سلسلہ',hi:'स्वीकृति श्रृंखला'},
 'Reject / return':{ar:'رفض / إعادة',ur:'مسترد / واپس',hi:'अस्वीकार / वापस'},
 'Notifications':{ar:'الإشعارات',ur:'اطلاعات',hi:'सूचनाएँ'},
 'All caught up':{ar:'كل شيء منجز',ur:'سب مکمل',hi:'सब पूर्ण'},
 'All clear':{ar:'لا تنبيهات',ur:'سب صاف',hi:'सब ठीक'},
 'System health':{ar:'صحة النظام',ur:'سسٹم صحت',hi:'सिस्टम स्वास्थ्य'},
 'Modules active':{ar:'الوحدات النشطة',ur:'فعال ماڈیولز',hi:'सक्रिय मॉड्यूल'},
 'Open alerts':{ar:'التنبيهات المفتوحة',ur:'کھلے الرٹس',hi:'खुली चेतावनियाँ'},
 'Audit events':{ar:'أحداث التدقيق',ur:'آڈٹ ایونٹس',hi:'ऑडिट घटनाएँ'},
 'Languages enabled':{ar:'اللغات المفعلة',ur:'فعال زبانیں',hi:'सक्षम भाषाएँ'},
 'Events logged':{ar:'الأحداث المسجلة',ur:'درج ایونٹس',hi:'दर्ज घटनाएँ'},
 'Activity stream':{ar:'سجل النشاط',ur:'سرگرمی سلسلہ',hi:'गतिविधि प्रवाह'},
 'Severity':{ar:'الخطورة',ur:'شدت',hi:'गंभीरता'},
 'Critical':{ar:'حرج',ur:'نازک',hi:'गंभीर'},
 'Warning':{ar:'تحذير',ur:'انتباہ',hi:'चेतावनी'},
 'Info':{ar:'معلومة',ur:'معلومات',hi:'सूचना'},
 'Log integrity':{ar:'سلامة السجل',ur:'لاگ سالمیت',hi:'लॉग अखंडता'},
 'AM Session':{ar:'الفترة الصباحية',ur:'صبح کی نشست',hi:'सुबह सत्र'},
 'PM Session':{ar:'الفترة المسائية',ur:'دوپہر کی نشست',hi:'दोपहर सत्र'},
 'Submit register':{ar:'تسليم السجل',ur:'رجسٹر جمع کریں',hi:'रजिस्टर जमा करें'},
 'Launch survey':{ar:'إطلاق الاستبيان',ur:'سروے شروع کریں',hi:'सर्वेक्षण शुरू करें'},
 'Close survey':{ar:'إغلاق الاستبيان',ur:'سروے بند کریں',hi:'सर्वेक्षण बंद करें'},
 'Export results':{ar:'تصدير النتائج',ur:'نتائج برآمد',hi:'परिणाम निर्यात'},
 'Export log':{ar:'تصدير السجل',ur:'لاگ برآمد',hi:'लॉग निर्यात'},
 'Students · roster':{ar:'الطلاب · السجل',ur:'طلبہ · فہرست',hi:'छात्र · सूची'},
 'Fees collected':{ar:'الرسوم المحصلة',ur:'وصول شدہ فیس',hi:'एकत्रित शुल्क'}
});
Object.assign(I18N,{
 'Follow-ups due':{ar:'متابعات مستحقة',ur:'فالو اپ واجب',hi:'फ़ॉलो-अप देय'},
 'Scheduled':{ar:'مجدول',ur:'شیڈول شدہ',hi:'निर्धारित'},
 'Archived':{ar:'مؤرشف',ur:'محفوظ شدہ',hi:'संग्रहीत'},
 'Follow-ups':{ar:'المتابعات',ur:'فالو اپس',hi:'फ़ॉलो-अप'},
 'Overdue':{ar:'متأخر',ur:'زائد المیعاد',hi:'अतिदेय'},
 'Due today':{ar:'مستحق اليوم',ur:'آج واجب',hi:'आज देय'},
 'Upcoming':{ar:'القادمة',ur:'آئندہ',hi:'आगामी'},
 'No follow-up scheduled':{ar:'لا متابعة مجدولة',ur:'کوئی فالو اپ نہیں',hi:'कोई फ़ॉलो-अप नहीं'},
 'Next follow-up':{ar:'المتابعة القادمة',ur:'اگلا فالو اپ',hi:'अगला फ़ॉलो-अप'},
 'Follow later':{ar:'متابعة لاحقًا',ur:'بعد میں فالو',hi:'बाद में फ़ॉलो'},
 'Schedule':{ar:'جدولة',ur:'شیڈول',hi:'निर्धारित करें'},
 'Schedule follow-up':{ar:'جدولة متابعة',ur:'فالو اپ شیڈول',hi:'फ़ॉलो-अप निर्धारित करें'},
 'Archive':{ar:'أرشفة',ur:'محفوظ کریں',hi:'संग्रह करें'},
 'Archive all stale':{ar:'أرشفة كل الراكدة',ur:'تمام پرانے محفوظ کریں',hi:'सभी पुराने संग्रहित करें'},
 'Restore':{ar:'استعادة',ur:'بحال کریں',hi:'पुनर्स्थापित करें'},
 'Delete':{ar:'حذف',ur:'حذف کریں',hi:'हटाएँ'},
 'Mark lost':{ar:'تعليم كمفقود',ur:'کھویا نشان زد',hi:'खोया चिह्नित करें'},
 'Mark lost & archive':{ar:'تعليم كمفقود وأرشفة',ur:'کھویا اور محفوظ',hi:'खोया और संग्रह'},
 'Log activity':{ar:'تسجيل نشاط',ur:'سرگرمی درج کریں',hi:'गतिविधि दर्ज करें'},
 'Manage':{ar:'إدارة',ur:'نظم کریں',hi:'प्रबंधन'},
 'Activity log':{ar:'سجل النشاط',ur:'سرگرمی لاگ',hi:'गतिविधि लॉग'},
 'Archived leads':{ar:'العملاء المؤرشفون',ur:'محفوظ لیڈز',hi:'संग्रहीत लीड'},
 'Last activity':{ar:'آخر نشاط',ur:'آخری سرگرمی',hi:'अंतिम गतिविधि'},
 'Stale':{ar:'راكد',ur:'پرانا',hi:'पुराना'},
 'Reject':{ar:'رفض',ur:'مسترد',hi:'अस्वीकार'},
 'Review':{ar:'مراجعة',ur:'جائزہ',hi:'समीक्षा'},
 'Add employee':{ar:'إضافة موظف',ur:'ملازم شامل کریں',hi:'कर्मचारी जोड़ें'},
 'Documents':{ar:'المستندات',ur:'دستاویزات',hi:'दस्तावेज़'},
 'Documents on file':{ar:'المستندات المحفوظة',ur:'فائل میں دستاویزات',hi:'फ़ाइल में दस्तावेज़'},
 'Degree certificate':{ar:'شهادة الدرجة',ur:'ڈگری سرٹیفکیٹ',hi:'डिग्री प्रमाणपत्र'},
 'Passport / Emirates ID':{ar:'جواز السفر / الهوية الإماراتية',ur:'پاسپورٹ / ایمریٹس آئی ڈی',hi:'पासपोर्ट / एमिरेट्स ID'},
 'Passport-size photo':{ar:'صورة بحجم جواز السفر',ur:'پاسپورٹ سائز تصویر',hi:'पासपोर्ट साइज़ फ़ोटो'},
 'Experience / relieving letter':{ar:'خطاب الخبرة / إخلاء الطرف',ur:'تجربہ / ریلیونگ لیٹر',hi:'अनुभव / रिलीविंग पत्र'},
 'Visa / work permit':{ar:'التأشيرة / تصريح العمل',ur:'ویزا / ورک پرمٹ',hi:'वीज़ा / वर्क परमिट'},
 'Certificate attestation':{ar:'تصديق الشهادة',ur:'سرٹیفکیٹ تصدیق',hi:'प्रमाणपत्र सत्यापन'},
 'Start onboarding':{ar:'بدء الإلحاق',ur:'شمولیت شروع کریں',hi:'नियुक्ति शुरू करें'},
 'Activate employee':{ar:'تفعيل الموظف',ur:'ملازم فعال کریں',hi:'कर्मचारी सक्रिय करें'},
 'Onboarding checklist':{ar:'قائمة مهام الإلحاق',ur:'شمولیت چیک لسٹ',hi:'नियुक्ति चेकलिस्ट'},
 'Apply for leave':{ar:'طلب إجازة',ur:'رخصت کی درخواست',hi:'अवकाश आवेदन'},
 'Rejected':{ar:'مرفوض',ur:'مسترد',hi:'अस्वीकृत'},
 'Nationality':{ar:'الجنسية',ur:'قومیت',hi:'राष्ट्रीयता'},
 'ID / passport':{ar:'الهوية / جواز السفر',ur:'آئی ڈی / پاسپورٹ',hi:'ID / पासपोर्ट'},
 'Convert to application':{ar:'تحويل إلى طلب',ur:'درخواست میں تبدیل',hi:'आवेदन में बदलें'},
 'Advance stage':{ar:'تقديم المرحلة',ur:'مرحلہ آگے بڑھائیں',hi:'चरण आगे बढ़ाएँ'}
});
Object.assign(I18N,{
 'Rooms & blocks':{ar:'الغرف والمباني',ur:'کمرے اور بلاکس',hi:'कमरे और ब्लॉक'},
 'Boarders':{ar:'المقيمون',ur:'بورڈرز',hi:'छात्रावासी'},
 'Roll-call':{ar:'تفقد الحضور',ur:'حاضری',hi:'रोल-कॉल'},
 'Leave & gate pass':{ar:'الإجازات وتصاريح الخروج',ur:'رخصت و گیٹ پاس',hi:'अवकाश और गेट पास'},
 'Weekly menu':{ar:'قائمة الأسبوع',ur:'ہفتہ وار مینو',hi:'साप्ताहिक मेन्यू'},
 'Meal plans':{ar:'خطط الوجبات',ur:'کھانے کے منصوبے',hi:'भोजन योजनाएँ'},
 'Wallets':{ar:'المحافظ',ur:'والٹس',hi:'वॉलेट'},
 'Allergies':{ar:'الحساسيات',ur:'الرجیز',hi:'एलर्जी'},
 'Kitchen stock':{ar:'مخزون المطبخ',ur:'کچن اسٹاک',hi:'रसोई स्टॉक'},
 'Boarder roster':{ar:'سجل المقيمين',ur:'بورڈر فہرست',hi:'छात्रावासी सूची'},
 'Nightly roll-call':{ar:'تفقد الحضور الليلي',ur:'رات کی حاضری',hi:'रात्रि रोल-कॉल'},
 'Maintenance requests':{ar:'طلبات الصيانة',ur:'مرمت کی درخواستیں',hi:'रखरखाव अनुरोध'},
 'Recent transactions':{ar:'المعاملات الأخيرة',ur:'حالیہ لین دین',hi:'हाल के लेन-देन'},
 'Top sellers today':{ar:'الأكثر مبيعًا اليوم',ur:'آج کے بہترین فروخت',hi:'आज के शीर्ष विक्रेता'},
 'Student wallets':{ar:'محافظ الطلاب',ur:'طلبہ کے والٹس',hi:'छात्र वॉलेट'},
 'Allergy & dietary care plans':{ar:'خطط الحساسية والتغذية',ur:'الرجی و غذائی منصوبے',hi:'एलर्जी और आहार देखभाल योजनाएँ'},
 'Today\'s menu':{ar:'قائمة اليوم',ur:'آج کا مینو',hi:'आज का मेन्यू'},
 'Boarder':{ar:'المقيم',ur:'بورڈر',hi:'छात्रावासी'},
 'Block':{ar:'المبنى',ur:'بلاک',hi:'ब्लॉक'},
 'Floor':{ar:'الطابق',ur:'منزل',hi:'मंज़िल'},
 'Occupancy':{ar:'الإشغال',ur:'قبضہ',hi:'अधिभोग'},
 'Occupants':{ar:'الشاغلون',ur:'مکین',hi:'रहने वाले'},
 'Medical':{ar:'طبي',ur:'طبی',hi:'चिकित्सा'},
 'Curfew check-in':{ar:'تسجيل حظر التجول',ur:'کرفیو چیک اِن',hi:'कर्फ़्यू चेक-इन'},
 'From':{ar:'من',ur:'سے',hi:'से'},
 'To':{ar:'إلى',ur:'تک',hi:'तक'},
 'Ref':{ar:'المرجع',ur:'حوالہ',hi:'संदर्भ'},
 'Meals included':{ar:'الوجبات المشمولة',ur:'شامل کھانے',hi:'शामिल भोजन'},
 'Termly price':{ar:'سعر الفصل',ur:'ٹرم قیمت',hi:'टर्म मूल्य'},
 'Subscribers':{ar:'المشتركون',ur:'سبسکرائبرز',hi:'सदस्य'},
 'Allergens':{ar:'مسببات الحساسية',ur:'الرجن',hi:'एलर्जन'},
 'Severity':{ar:'الشدة',ur:'شدت',hi:'गंभीरता'},
 'Care plan':{ar:'خطة الرعاية',ur:'نگہداشت منصوبہ',hi:'देखभाल योजना'},
 'In stock':{ar:'المتوفر',ur:'اسٹاک میں',hi:'स्टॉक में'},
 'Last top-up':{ar:'آخر شحن',ur:'آخری ری چارج',hi:'अंतिम टॉप-अप'},
 'Full':{ar:'ممتلئ',ur:'بھرا',hi:'भरा'},
 'Out':{ar:'خارج',ur:'باہر',hi:'बाहर'},
 'Returned':{ar:'عاد',ur:'واپس',hi:'लौटा'},
 'Requested':{ar:'مطلوب',ur:'درخواست شدہ',hi:'अनुरोधित'},
 'Severe':{ar:'شديد',ur:'شدید',hi:'गंभीर'},
 'Moderate':{ar:'متوسط',ur:'معتدل',hi:'मध्यम'},
 'Mild':{ar:'خفيف',ur:'معمولی',hi:'हल्का'},
 'Veg':{ar:'نباتي',ur:'سبزی',hi:'शाकाहारी'},
 'Non-veg':{ar:'غير نباتي',ur:'نان ویج',hi:'मांसाहारी'},
 'Reorder':{ar:'إعادة طلب',ur:'دوبارہ آرڈر',hi:'पुनःऑर्डर'},
 'Total beds':{ar:'إجمالي الأسرّة',ur:'کل بستر',hi:'कुल बिस्तर'},
 'On leave':{ar:'في إجازة',ur:'رخصت پر',hi:'अवकाश पर'},
 'Open requests':{ar:'الطلبات المفتوحة',ur:'کھلی درخواستیں',hi:'खुले अनुरोध'},
 'Revenue · today':{ar:'الإيرادات · اليوم',ur:'آمدنی · آج',hi:'राजस्व · आज'},
 'Meals served · today':{ar:'الوجبات المقدمة · اليوم',ur:'پیش کردہ کھانے · آج',hi:'परोसे भोजन · आज'},
 'Allocate room':{ar:'تخصيص غرفة',ur:'کمرہ مختص کریں',hi:'कमरा आवंटित करें'},
 'New request':{ar:'طلب جديد',ur:'نئی درخواست',hi:'नया अनुरोध'},
 'Log request':{ar:'تسجيل طلب',ur:'درخواست درج کریں',hi:'अनुरोध दर्ज करें'},
 'Mark all present':{ar:'تعليم الكل حاضر',ur:'سب کو حاضر لگائیں',hi:'सभी उपस्थित'},
 'Mark returned':{ar:'تعليم كعائد',ur:'واپس نشان زد',hi:'लौटा चिह्नित करें'},
 'Resolve':{ar:'حل',ur:'حل کریں',hi:'हल करें'},
 'Reject':{ar:'رفض',ur:'مسترد',hi:'अस्वीकार'},
 'Top up wallet':{ar:'شحن المحفظة',ur:'والٹ ری چارج',hi:'वॉलेट टॉप-अप'},
 'Top up':{ar:'شحن',ur:'ری چارج',hi:'टॉप-अप'},
 'Add menu item':{ar:'إضافة صنف للقائمة',ur:'مینو آئٹم شامل کریں',hi:'मेन्यू आइटम जोड़ें'},
 'Add plan':{ar:'إضافة خطة',ur:'پلان شامل کریں',hi:'योजना जोड़ें'},
 'Add item':{ar:'إضافة صنف',ur:'آئٹم شامل کریں',hi:'वस्तु जोड़ें'},
 'Raise PO':{ar:'إصدار أمر شراء',ur:'PO جاری کریں',hi:'PO बनाएँ'},
 'Present tonight':{ar:'الحاضرون الليلة',ur:'آج رات حاضر',hi:'आज रात उपस्थित'},
 'On approved leave':{ar:'في إجازة معتمدة',ur:'منظور شدہ رخصت پر',hi:'स्वीकृत अवकाश पर'},
 'Curfew compliance':{ar:'الالتزام بحظر التجول',ur:'کرفیو کی پابندی',hi:'कर्फ़्यू अनुपालन'},
 'Wardens on duty':{ar:'المشرفون في الخدمة',ur:'ڈیوٹی پر وارڈن',hi:'ड्यूटी पर वार्डन'},
 'Wallet float':{ar:'رصيد المحافظ',ur:'والٹ فلوٹ',hi:'वॉलेट फ़्लोट'},
 'Low balances':{ar:'أرصدة منخفضة',ur:'کم بیلنس',hi:'कम शेष'},
 'Low stock items':{ar:'أصناف قليلة المخزون',ur:'کم اسٹاک اشیاء',hi:'कम स्टॉक वस्तुएँ'},
 'Avg. spend / day':{ar:'متوسط الإنفاق / يوم',ur:'اوسط خرچ / دن',hi:'औसत खर्च / दिन'},
 'Total subscribers':{ar:'إجمالي المشتركين',ur:'کل سبسکرائبرز',hi:'कुल सदस्य'},
 'Plans offered':{ar:'الخطط المتاحة',ur:'دستیاب پلانز',hi:'उपलब्ध योजनाएँ'},
 'Avg. plan price':{ar:'متوسط سعر الخطة',ur:'اوسط پلان قیمت',hi:'औसत योजना मूल्य'},
 'Present':{ar:'حاضر',ur:'حاضر',hi:'उपस्थित'},
 'Late return':{ar:'عودة متأخرة',ur:'دیر سے واپسی',hi:'देर से लौटना'},
 'Unaccounted':{ar:'غير محتسب',ur:'غیر حاضر',hi:'अनुपस्थित'},
 'Guardian & contact':{ar:'ولي الأمر والتواصل',ur:'سرپرست و رابطہ',hi:'अभिभावक और संपर्क'},
 'Boarding':{ar:'الإقامة',ur:'بورڈنگ',hi:'बोर्डिंग'},
 'Recent activity':{ar:'النشاط الأخير',ur:'حالیہ سرگرمی',hi:'हाल की गतिविधि'},
 'Breakfast':{ar:'الفطور',ur:'ناشتہ',hi:'नाश्ता'},
 'Lunch':{ar:'الغداء',ur:'دوپہر کا کھانا',hi:'दोपहर का भोजन'},
 'Snack':{ar:'وجبة خفيفة',ur:'اسنیک',hi:'नाश्ता'},
 'Message guardian':{ar:'مراسلة ولي الأمر',ur:'سرپرست کو پیغام',hi:'अभिभावक को संदेश'},
 'View leave':{ar:'عرض الإجازة',ur:'رخصت دیکھیں',hi:'अवकाश देखें'},
 'Log maintenance':{ar:'تسجيل صيانة',ur:'مرمت درج کریں',hi:'रखरखाव दर्ज करें'},
 'Recent activity ':{ar:'النشاط الأخير',ur:'حالیہ سرگرمی',hi:'हाल की गतिविधि'}
});
Object.assign(I18N,{
 'All':{ar:'الكل',ur:'تمام',hi:'सभी'},
 'Board':{ar:'لوحة',ur:'بورڈ',hi:'बोर्ड'},
 'Booked':{ar:'محجوز',ur:'بک شدہ',hi:'बुक'},
 'Delayed':{ar:'متأخر',ur:'تاخیر',hi:'विलंबित'},
 'Depot':{ar:'المستودع',ur:'ڈپو',hi:'डिपो'},
 'Event':{ar:'فعالية',ur:'ایونٹ',hi:'कार्यक्रम'},
 'Exam':{ar:'امتحان',ur:'امتحان',hi:'परीक्षा'},
 'Face':{ar:'الوجه',ur:'چہرہ',hi:'चेहरा'},
 'Fingerprint':{ar:'البصمة',ur:'فنگر پرنٹ',hi:'फ़िंगरप्रिंट'},
 'Face + Card':{ar:'الوجه + البطاقة',ur:'چہرہ + کارڈ',hi:'चेहरा + कार्ड'},
 'High':{ar:'مرتفع',ur:'زیادہ',hi:'उच्च'},
 'Holiday':{ar:'عطلة',ur:'تعطیل',hi:'अवकाश'},
 'Hot':{ar:'ساخن',ur:'گرم',hi:'गर्म'},
 'Low':{ar:'منخفض',ur:'کم',hi:'कम'},
 'Medium':{ar:'متوسط',ur:'درمیانہ',hi:'मध्यम'},
 'Maintenance':{ar:'صيانة',ur:'مرمت',hi:'रखरखाव'},
 'Online':{ar:'متصل',ur:'آن لائن',hi:'ऑनलाइन'},
 'Near limit':{ar:'قرب الحد',ur:'حد کے قریب',hi:'सीमा के निकट'},
 'Over budget':{ar:'تجاوز الميزانية',ur:'بجٹ سے زیادہ',hi:'बजट से अधिक'},
 'Reorder':{ar:'إعادة طلب',ur:'دوبارہ آرڈر',hi:'पुनःऑर्डर'},
 'Primary':{ar:'ابتدائي',ur:'پرائمری',hi:'प्राथमिक'},
 'Processed':{ar:'تمت المعالجة',ur:'کارروائی شدہ',hi:'संसाधित'},
 'Foundation':{ar:'التأسيس',ur:'فاؤنڈیشن',hi:'फ़ाउंडेशन'},
 'Academic':{ar:'أكاديمي',ur:'تعلیمی',hi:'शैक्षणिक'},
 'Commerce':{ar:'تجاري',ur:'کامرس',hi:'वाणिज्य'},
 'General':{ar:'عام',ur:'عام',hi:'सामान्य'},
 'Card':{ar:'البطاقة',ur:'کارڈ',hi:'कार्ड'},
 'Menu':{ar:'القائمة',ur:'مینو',hi:'मेन्यू'},
 'Review list':{ar:'قائمة المراجعة',ur:'جائزہ فہرست',hi:'समीक्षा सूची'},
 'Mark all present':{ar:'تعليم الكل حاضر',ur:'سب کو حاضر لگائیں',hi:'सभी उपस्थित'},
 'Open attendance':{ar:'فتح الحضور',ur:'حاضری کھولیں',hi:'उपस्थिति खोलें'},
 'Open exams':{ar:'فتح الامتحانات',ur:'امتحانات کھولیں',hi:'परीक्षाएँ खोलें'},
 'Open fees':{ar:'فتح الرسوم',ur:'فیس کھولیں',hi:'शुल्क खोलें'},
 'Open inventory':{ar:'فتح المخزون',ur:'انوینٹری کھولیں',hi:'सूची खोलें'},
 'Ask AI':{ar:'اسأل الذكاء الاصطناعي',ur:'اے آئی سے پوچھیں',hi:'एआई से पूछें'},
 'By name':{ar:'حسب الاسم',ur:'نام سے',hi:'नाम अनुसार'},
 'By rank':{ar:'حسب الترتيب',ur:'درجہ سے',hi:'रैंक अनुसार'},
 'AM Session':{ar:'الفترة الصباحية',ur:'صبح کی نشست',hi:'सुबह सत्र'},
 'PM Session':{ar:'الفترة المسائية',ur:'دوپہر کی نشست',hi:'दोपहर सत्र'},
 'Attendance trend (6 mo)':{ar:'اتجاه الحضور (6 أشهر)',ur:'حاضری رجحان (6 ماہ)',hi:'उपस्थिति रुझान (6 माह)'},
 'Budget vs. actual by category':{ar:'الميزانية مقابل الفعلي حسب الفئة',ur:'بجٹ بمقابلہ اصل بلحاظ زمرہ',hi:'श्रेणी अनुसार बजट बनाम वास्तविक'},
 'Click a student for the full risk profile':{ar:'انقر على طالب لعرض ملف المخاطر الكامل',ur:'مکمل رسک پروفائل کے لیے طالب علم پر کلک کریں',hi:'पूर्ण जोखिम प्रोफ़ाइल हेतु छात्र पर क्लिक करें'},
 'Next 2 weeks':{ar:'الأسبوعان القادمان',ur:'اگلے 2 ہفتے',hi:'अगले 2 सप्ताह'},
 'On road':{ar:'على الطريق',ur:'سڑک پر',hi:'रास्ते में'},
 'Attendance trend':{ar:'اتجاه الحضور',ur:'حاضری رجحان',hi:'उपस्थिति रुझान'},
 'Enrolment trend':{ar:'اتجاه التسجيل',ur:'اندراج رجحان',hi:'नामांकन रुझान'},
 'Open behaviour':{ar:'فتح السلوك',ur:'رویہ کھولیں',hi:'व्यवहार खोलें'},
 'Open library':{ar:'فتح المكتبة',ur:'لائبریری کھولیں',hi:'पुस्तकालय खोलें'}
});
function setLanguage(code){
  if(!LANGS[code]){const found=Object.keys(LANGS).find(k=>LANGS[k].native===code||LANGS[k].name===code);code=found||'en';}
  LANG=code;const L=LANGS[code];CFG.language=L.native;CFG.dir=L.dir;
  document.documentElement.setAttribute('dir',L.dir);
  document.documentElement.lang=code;
  saveTheme();renderNav();render();if(typeof botRender==='function')botRender();if(typeof schoolLocalizeShell==='function')schoolLocalizeShell();localizeView(document.getElementById('drawer'));localizeView(document.getElementById('toasts'));
  const it=(typeof flatItems==='function'?flatItems():[]).find(x=>x.id===state.module)||{label:'Dashboard',group:'Overview'};
  const cr=document.getElementById('crumb'),tb=document.getElementById('tbTitle');
  if(cr)cr.textContent=t(it.group);if(tb)tb.textContent=t(it.label);
  const lp=document.getElementById('langPill');if(lp)lp.textContent=code.toUpperCase();
  if(!document.body.classList.contains('authed')&&typeof renderLanding==='function')renderLanding();
  toast(t('Language')+' · '+L.native);
}
function cycleLang(){const codes=langEnabled();if(codes.length<2){if(typeof toast==='function')toast('Enable more languages in Settings');return}const i=codes.indexOf(LANG);setLanguage(codes[(i+1)%codes.length])}
function toggleLangEnabled(code){if(!LANGS[code])return;const i=LANG_ENABLED.indexOf(code);
  if(i>=0){if(LANG_ENABLED.length<=1){if(typeof toast==='function')toast('At least one language must stay enabled');return}LANG_ENABLED.splice(i,1);if(LANG===code)LANG=LANG_ENABLED[0];}
  else LANG_ENABLED.push(code);
  if(LANG_ENABLED.length===1)LANG=LANG_ENABLED[0];
  setLanguage(LANG);}
function setDefaultLang(code){if(!LANGS[code])return;if(LANG_ENABLED.indexOf(code)<0)LANG_ENABLED.push(code);setLanguage(code);}
function toggleDir(){CFG.dir=CFG.dir==='rtl'?'ltr':'rtl';document.documentElement.setAttribute('dir',CFG.dir);render();toast('Layout · '+(CFG.dir==='rtl'?'Right-to-left':'Left-to-right'))}

const STUDENT_NAME_DICTIONARY = {
  adam: { ar: 'آدم', ur: 'آدم', hi: 'आदम' },
  farouk: { ar: 'فاروق', ur: 'فاروق', hi: 'फारूक' },
  farooq: { ar: 'فاروق', ur: 'فاروق', hi: 'फारूक' },
  nabil: { ar: 'نبيل', ur: 'نبیل', hi: 'नबील' },
  mensah: { ar: 'منساه', ur: 'منسا', hi: 'मेंसा' },
  aisha: { ar: 'عائشة', ur: 'عائشہ', hi: 'आयशा' },
  noor: { ar: 'نور', ur: 'نور', hi: 'नूर' },
  salim: { ar: 'سالم', ur: 'سالم', hi: 'सलीम' },
  saeed: { ar: 'سعيد', ur: 'سعید', hi: 'सईद' },
  amara: { ar: 'عمارة', ur: 'عمارہ', hi: 'अमारा' },
  rahman: { ar: 'رحمن', ur: 'رحمٰن', hi: 'रहमान' },
  anaya: { ar: 'عناية', ur: 'عنایہ', hi: 'अनाया' },
  chen: { ar: 'تشن', ur: 'چن', hi: 'चेन' },
  aryan: { ar: 'آريان', ur: 'آریان', hi: 'आर्यन' },
  khan: { ar: 'خان', ur: 'خان', hi: 'खान' },
  bilal: { ar: 'بلال', ur: 'بلال', hi: 'बिलाल' },
  daniel: { ar: 'دانيال', ur: 'ڈینیل', hi: 'डैनियल' },
  george: { ar: 'جورج', ur: 'جارج', hi: 'जॉर्ज' },
  diego: { ar: 'دييغو', ur: 'ڈیاگو', hi: 'डिएगो' },
  reyes: { ar: 'رييس', ur: 'ریز', hi: 'रेयेस' },
  dina: { ar: 'دينا', ur: 'دینا', hi: 'दीना' },
  costa: { ar: 'كوستا', ur: 'کوسٹا', hi: 'कोस्टा' },
  elena: { ar: 'إيلينا', ur: 'ایلینا', hi: 'ऐलेना' },
  ethan: { ar: 'إيثان', ur: 'ایتھن', hi: 'एथन' },
  pereira: { ar: 'بيريرا', ur: 'پریرا', hi: 'परेरा' },
  petrov: { ar: 'بيتروف', ur: 'پیٹروو', hi: 'पेट्रोव' },
  faisal: { ar: 'فيصل', ur: 'فیصل', hi: 'फ़ैसल' },
  novak: { ar: 'نوفاك', ur: 'نوواک', hi: 'नोवाक' },
  fatima: { ar: 'فاطمة', ur: 'فاطمہ', hi: 'फातिमा' },
  ahmed: { ar: 'أحمد', ur: 'احمد', hi: 'अहमद' },
  al: { ar: 'ال', ur: 'ال', hi: 'अल' },
  hashimi: { ar: 'الهاشمي', ur: 'الہاشمی', hi: 'हाशमी' },
  grace: { ar: 'غريس', ur: 'گریس', hi: 'ग्रेस' },
  haddad: { ar: 'حداد', ur: 'حداد', hi: 'हद्दाद' },
  hamza: { ar: 'حمزة', ur: 'حمزہ', hi: 'हमज़ा' },
  ali: { ar: 'علي', ur: 'علی', hi: 'अली' },
  hana: { ar: 'هناء', ur: 'ہنا', hi: 'हाना' },
  yousef: { ar: 'يوسف', ur: 'یوسف', hi: 'यूसुफ़' },
  yusuf: { ar: 'يوسف', ur: 'یوسف', hi: 'यूसुफ़' },
  hassan: { ar: 'حسن', ur: 'حسن', hi: 'हसन' },
  hind: { ar: 'هند', ur: 'ہند', hi: 'हिंद' },
  osei: { ar: 'أوسي', ur: 'اوسی', hi: 'ओसेई' },
  ibrahim: { ar: 'إبراهيم', ur: 'ابراہیم', hi: 'इब्राहिम' },
  idris: { ar: 'إدريس', ur: 'ادریس', hi: 'इदरीस' },
  ivan: { ar: 'إيفان', ur: 'ایوان', hi: 'इवान' },
  patel: { ar: 'باتيل', ur: 'پٹیل', hi: 'पटेल' },
  kabir: { ar: 'كبير', ur: 'کبیر', hi: 'कबीर' },
  nair: { ar: 'ناير', ur: 'نائر', hi: 'नायर' },
  khalid: { ar: 'خالد', ur: 'خالد', hi: 'खालिद' },
  layla: { ar: 'ليلى', ur: 'لیلیٰ', hi: 'लैला' },
  mansour: { ar: 'منصور', ur: 'منصور', hi: 'मंसूर' },
  leon: { ar: 'ليون', ur: 'لیون', hi: 'लियोन' },
  fernandes: { ar: 'فرنانديز', ur: 'فرنینڈس', hi: 'फर्नांडीस' },
  lina: { ar: 'لينا', ur: 'لینا', hi: 'लीना' },
  linda: { ar: 'ليندا', ur: 'لنڈا', hi: 'लिंडा' },
  mariam: { ar: 'مريم', ur: 'مریم', hi: 'मरियम' },
  mary: { ar: 'ماري', ur: 'میری', hi: 'मैरी' },
  nadia: { ar: 'نادية', ur: 'نادیہ', hi: 'नादिया' },
  roy: { ar: 'روي', ur: 'رائے', hi: 'रॉय' },
  noah: { ar: 'نوح', ur: 'نوح', hi: 'नोआ' },
  omar: { ar: 'عمر', ur: 'عمر', hi: 'उमर' },
  siddiqui: { ar: 'صديقي', ur: 'صدیقی', hi: 'सिद्दीकी' },
  priya: { ar: 'بريا', ur: 'پریا', hi: 'प्रिया' },
  reema: { ar: 'ريما', ur: 'ریما', hi: 'रीमा' },
  rohan: { ar: 'روهان', ur: 'روہن', hi: 'रोहन' },
  mehta: { ar: 'مهتا', ur: 'مہتا', hi: 'मेहता' },
  sami: { ar: 'سامي', ur: 'سامی', hi: 'सामी' },
  sara: { ar: 'سارة', ur: 'سارہ', hi: 'सारा' },
  tarek: { ar: 'طارق', ur: 'طارق', hi: 'तारिक' },
  zara: { ar: 'زارا', ur: 'زارا', hi: 'ज़ारा' },
  sheikh: { ar: 'الشيخ', ur: 'شیخ', hi: 'शेख' },
  zaid: { ar: 'زيد', ur: 'زید', hi: 'ज़ैद' },
  zayd: { ar: 'زيد', ur: 'زید', hi: 'ज़ैद' },
  saleh: { ar: 'صالح', ur: 'صالح', hi: 'सालेह' },
  fahad: { ar: 'فهد', ur: 'فہد', hi: 'फ़हद' },
  nasser: { ar: 'ناصر', ur: 'ناصر', hi: 'नासर' },
  qureshi: { ar: 'قريشي', ur: 'قریشی', hi: 'कुरैशी' },
  karim: { ar: 'كريم', ur: 'کریم', hi: 'करीम' },
  huda: { ar: 'هدى', ur: 'ہدیٰ', hi: 'हुदा' },
  hanan: { ar: 'حنان', ur: 'حنان', hi: 'हनान' },
  tariq: { ar: 'طارق', ur: 'طارق', hi: 'तारिक' },
  wei: { ar: 'وي', ur: 'وی', hi: 'वेई' },
  basheer: { ar: 'بشير', ur: 'بشیر', hi: 'बशीर' },
  abdullah: { ar: 'عبد الله', ur: 'عبد اللہ', hi: 'अब्दुल्ला' },
  adeel: { ar: 'عديل', ur: 'عدیل', hi: 'अदील' },
  bakr: { ar: 'بكر', ur: 'بکر', hi: 'बक्र' },
  haider: { ar: 'حيدر', ur: 'حیدر', hi: 'हैदर' },
  anil: { ar: 'أنيل', ur: 'انیل', hi: 'अनिल' },
  anna: { ar: 'آنا', ur: 'آنا', hi: 'अन्ना' },
  petrova: { ar: 'بيتروفا', ur: 'پیٹرووا', hi: 'पेट्रोवा' },
  suhail: { ar: 'سهيل', ur: 'سہیل', hi: 'सुहेल' },
  rana: { ar: 'رانا', ur: 'رانا', hi: 'राणा' },
  hala: { ar: 'هالة', ur: 'ہالہ', hi: 'हाला' },
  aziz: { ar: 'عزيز', ur: 'عزیز', hi: 'अज़ीज़' },
  joan: { ar: 'جوان', ur: 'جوآن', hi: 'जोन' },
  mathew: { ar: 'ماثيو', ur: 'میتھیو', hi: 'मैथ्यू' },
  reem: { ar: 'ريم', ur: 'ریم', hi: 'रीम' },
  adel: { ar: 'عادل', ur: 'عادل', hi: 'आदिल' },
  noura: { ar: 'نورة', ur: 'نورہ', hi: 'नूरा' },
  saif: { ar: 'سيف', ur: 'سیف', hi: 'सैफ़' },
  khalil: { ar: 'خليل', ur: 'خلیل', hi: 'खलील' },
  sharif: { ar: 'شريف', ur: 'شریف', hi: 'शरीफ' },
  rania: { ar: 'رانيا', ur: 'رانیا', hi: 'रानिया' },
  rami: { ar: 'رامي', ur: 'رامی', hi: 'रामी' },
  marri: { ar: 'المري', ur: 'المری', hi: 'अल मर्री' },
  suwaidi: { ar: 'السويدي', ur: 'السویدی', hi: 'अल सुवैदी' },
  rakesh: { ar: 'راكيش', ur: 'راکیش', hi: 'राकेश' },
  sunil: { ar: 'سونيل', ur: 'سنیل', hi: 'सुनील' },
  sana: { ar: 'سناء', ur: 'ثناء', hi: 'सना' },
  iqbal: { ar: 'إقبال', ur: 'اقبال', hi: 'इकबाल' },
  noori: { ar: 'نوري', ur: 'نوری', hi: 'नूरी' },
  kwame: { ar: 'كوامي', ur: 'کوامے', hi: 'क्वामे' },
  marcus: { ar: 'ماركوس', ur: 'مارکوس', hi: 'मार्कस' },
  reed: { ar: 'ريد', ur: 'ریڈ', hi: 'रीड' },
  emily: { ar: 'إيميلي', ur: 'ایملی', hi: 'एमिली' },
  watson: { ar: 'واتسون', ur: 'واٹسن', hi: 'वाटसन' },
  karen: { ar: 'كارين', ur: 'کارن', hi: 'करेन' },
  bradley: { ar: 'برادلي', ur: 'بریڈلی', hi: 'ब्रैडली' },
  tom: { ar: 'توم', ur: 'ٹام', hi: 'टॉम' },
  musa: { ar: 'موسى', ur: 'موسیٰ', hi: 'मूसा' },
  diallo: { ar: 'ديالو', ur: 'ڈیالو', hi: 'डियालो' },
  yara: { ar: 'يارا', ur: 'یارا', hi: 'यारा' },
  khalifa: { ar: 'خليفة', ur: 'خلیفہ', hi: 'खलीफा' },
  qadir: { ar: 'قادر', ur: 'قادر', hi: 'कादिर' },
  imran: { ar: 'عمران', ur: 'عمران', hi: 'इमरान' },
  harper: { ar: 'هاربر', ur: 'ہارپر', hi: 'हार्पर' },
  lee: { ar: 'لي', ur: 'لی', hi: 'ली' },
  stephen: { ar: 'ستيفن', ur: 'سٹیفن', hi: 'स्टीफन' },
  hawking: { ar: 'هوكينغ', ur: 'ہاکنگ', hi: 'हॉकिंग' },
  paulo: { ar: 'باولو', ur: 'پاؤلو', hi: 'पाउलो' },
  coelho: { ar: 'كويلهو', ur: 'کوئلہو', hi: 'कोएल्हो' },
  tolkien: { ar: 'تولكين', ur: 'ٹولکین', hi: 'टोल्किन' },
  cormen: { ar: 'كورمن', ur: 'کورمین', hi: 'कॉरमेन' },
  harari: { ar: 'هراري', ur: 'ہراری', hi: 'हरारी' },
  sophia: { ar: 'صوفيا', ur: 'صوفیہ', hi: 'सोफिया' },
  lin: { ar: 'لين', ur: 'لن', hi: 'लिन' },
  maktoum: { ar: 'مكتوم', ur: 'مکتوم', hi: 'मकतूम' },
  salma: { ar: 'سلمى', ur: 'سلمیٰ', hi: 'सलमा' },
  rashid: { ar: 'راشد', ur: 'راشد', hi: 'राशिद' },
  joseph: { ar: 'جوزيف', ur: 'جوزف', hi: 'जोसेफ' },
  thomas: { ar: 'توماس', ur: 'تھامس', hi: 'थॉमस' },
  father: { ar: 'الأب', ur: 'والد', hi: 'पिता' },
  mother: { ar: 'الأم', ur: 'والدہ', hi: 'माता' },
  guardian: { ar: 'ولي الأمر', ur: 'سرپرست', hi: 'अभिभावक' },
  other: { ar: 'آخر', ur: 'دیگر', hi: 'अन्य' }
};

function transliterateStudentWord(word, targetLang){
  if(!word) return '';
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  if(STUDENT_NAME_DICTIONARY[lower] && STUDENT_NAME_DICTIONARY[lower][targetLang]){
    return STUDENT_NAME_DICTIONARY[lower][targetLang];
  }
  let clean = word.toLowerCase();
  if(targetLang === 'ar'){
    return clean
      .replace(/th/gi, 'ث').replace(/kh/gi, 'خ').replace(/sh/gi, 'ش').replace(/ch/gi, 'تش')
      .replace(/ph/gi, 'ف').replace(/gh/gi, 'غ').replace(/dh/gi, 'ذ')
      .replace(/b/gi, 'ب').replace(/c/gi, 'ك').replace(/d/gi, 'د').replace(/f/gi, 'ف')
      .replace(/g/gi, 'ج').replace(/h/gi, 'ه').replace(/j/gi, 'ج').replace(/k/gi, 'ك')
      .replace(/l/gi, 'ل').replace(/m/gi, 'م').replace(/n/gi, 'ن').replace(/p/gi, 'ب')
      .replace(/q/gi, 'ق').replace(/r/gi, 'ر').replace(/s/gi, 'س').replace(/t/gi, 'ت')
      .replace(/v/gi, 'ف').replace(/w/gi, 'و').replace(/x/gi, 'كس').replace(/y/gi, 'ي')
      .replace(/z/gi, 'ز').replace(/a/gi, 'ا').replace(/e/gi, 'ي').replace(/i/gi, 'ي')
      .replace(/o/gi, 'و').replace(/u/gi, 'و');
  }
  if(targetLang === 'ur'){
    return clean
      .replace(/th/gi, 'تھ').replace(/kh/gi, 'کھ').replace(/sh/gi, 'ش').replace(/ch/gi, 'چ')
      .replace(/ph/gi, 'پھ').replace(/gh/gi, 'غ').replace(/dh/gi, 'دھ')
      .replace(/b/gi, 'ب').replace(/c/gi, 'ک').replace(/d/gi, 'ڈ').replace(/f/gi, 'ف')
      .replace(/g/gi, 'گ').replace(/h/gi, 'ہ').replace(/j/gi, 'ج').replace(/k/gi, 'ک')
      .replace(/l/gi, 'ل').replace(/m/gi, 'م').replace(/n/gi, 'ن').replace(/p/gi, 'پ')
      .replace(/q/gi, 'ق').replace(/r/gi, 'ر').replace(/s/gi, 'س').replace(/t/gi, 'ٹ')
      .replace(/v/gi, 'و').replace(/w/gi, 'و').replace(/x/gi, 'کس').replace(/y/gi, 'ی')
      .replace(/z/gi, 'ز').replace(/a/gi, 'ا').replace(/e/gi, 'ے').replace(/i/gi, 'ی')
      .replace(/o/gi, 'و').replace(/u/gi, 'و');
  }
  return clean
    .replace(/th/gi, 'थ').replace(/kh/gi, 'ख').replace(/sh/gi, 'श').replace(/ch/gi, 'च')
    .replace(/ph/gi, 'फ').replace(/gh/gi, 'घ').replace(/dh/gi, 'ध')
    .replace(/b/gi, 'ब').replace(/c/gi, 'क').replace(/d/gi, 'द').replace(/f/gi, 'फ़')
    .replace(/g/gi, 'ग').replace(/h/gi, 'ह').replace(/j/gi, 'ज').replace(/k/gi, 'क')
    .replace(/l/gi, 'ल').replace(/m/gi, 'म').replace(/n/gi, 'न').replace(/p/gi, 'प')
    .replace(/q/gi, 'क').replace(/r/gi, 'र').replace(/s/gi, 'स').replace(/t/gi, 'त')
    .replace(/v/gi, 'व').replace(/w/gi, 'व').replace(/x/gi, 'क्स').replace(/y/gi, 'य')
    .replace(/z/gi, 'ज़').replace(/a/gi, 'ा').replace(/e/gi, 'े').replace(/i/gi, 'ि')
    .replace(/o/gi, 'ो').replace(/u/gi, 'ु');
}

function translateStudentFullName(fullName, targetLang){
  if(!fullName) return '';
  const words=fullName.trim().split(/\s+/),result=[];
  for(let i=0;i<words.length;i++){
    if(['ar','ur'].includes(targetLang)&&/^al$/i.test(words[i])&&words[i+1]){
      const next=transliterateStudentWord(words[++i],targetLang);result.push(next.startsWith('ال')?next:'ال'+next);
    }else result.push(transliterateStudentWord(words[i],targetLang));
  }
  return result.join(' ');
}

function generateStudentTranslations(name, guardianName){
  const cleanName = (name || '').trim();
  const cleanGuardian = (guardianName || '').trim();
  return {
    en: { name: cleanName, guardianName: cleanGuardian || undefined },
    ar: { name: translateStudentFullName(cleanName, 'ar'), guardianName: cleanGuardian ? translateStudentFullName(cleanGuardian, 'ar') : undefined },
    ur: { name: translateStudentFullName(cleanName, 'ur'), guardianName: cleanGuardian ? translateStudentFullName(cleanGuardian, 'ur') : undefined },
    hi: { name: translateStudentFullName(cleanName, 'hi'), guardianName: cleanGuardian ? translateStudentFullName(cleanGuardian, 'hi') : undefined }
  };
}

function schoolNameForLocale(raw,translations={}){
  if(LANG==='en')return raw||'';
  const saved=translations[LANG]||schoolPersonNames.get(raw)?.[LANG];
  return (typeof saved==='string'?saved:saved?.name)||translateStudentFullName(raw||'',LANG);
}

// Personal names are registered from authenticated entity data, never arbitrary prose.
const schoolPersonNames=new Map();
function schoolRegisterPerson(person){
  if(!person||typeof person.name!=='string'||!person.name.trim())return;
  const raw=person.name.trim(),translations={};
  ['ar','ur','hi'].forEach(lang=>{const entry=person.translations?.[lang];const value=typeof entry==='string'?entry:entry?.name;if(value)translations[lang]=value;});
  schoolPersonNames.set(raw,Object.assign({},schoolPersonNames.get(raw),translations));
}
function schoolRegisterResponseNames(path,body){
  const personRoute=/^\/(students|staff|guardians|users|auth|crm)(?:[/?]|$)/.test(path);
  const relations=new Set(['student','students','guardian','guardians','teacher','staff','user','users','parent','employee','actor','bookedGuardian','bookedBy','bookedForStudent','requestedBy','assignedTo','raisedBy','subject','employeeSnapshot','studentIds']);
  function walk(value,personal=false){
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(v=>walk(v,personal));return;}
    if(personal)schoolRegisterPerson(value);
    Object.entries(value).forEach(([key,child])=>{
      if(['studentName','guardianName','teacherName','employeeName','staffName','parentName','actorName'].includes(key)&&typeof child==='string')schoolRegisterPerson({name:child,translations:Object.fromEntries(['ar','ur','hi'].map(lang=>[lang,{name:value.translations?.[lang]?.[key]}]))});
      if(child&&typeof child==='object')walk(child,relations.has(key)||((key==='data'||key==='items')&&personal));
    });
  }
  walk(body,personRoute);
}
function schoolTranslateKnownNames(text){
  if(LANG==='en')return text;
  return text.split(/( · | — | \| | → )/).map(part=>{
    const raw=part.trim();
    // Single-word labels such as Active must not become person-name translations.
    if(!/\s/.test(raw)||!schoolPersonNames.has(raw))return part;
    return part.replace(raw,schoolNameForLocale(raw,schoolPersonNames.get(raw)));
  }).join('');
}

/**
 * Multilingual transliteration and translation utility for student and user-authored content.
 * Generates Arabic (ar), Urdu (ur), and Hindi (hi) representations for names and text.
 */

export interface TranslatedEntity {
  name: string;
  guardianName?: string;
}

export interface MultilingualTranslations extends Record<string, TranslatedEntity> {
  en: TranslatedEntity;
  ar: TranslatedEntity;
  ur: TranslatedEntity;
  hi: TranslatedEntity;
}

const NAME_DICTIONARY: Record<string, { ar: string; ur: string; hi: string }> = {
  // First names & common components
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
  zayd: { ar: 'زيد', ur: 'زید', hi: 'ज़ैद' },
  zaid: { ar: 'زيد', ur: 'زید', hi: 'ज़ैद' },
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
  other: { ar: 'آخر', ur: 'دیگر', hi: 'अन्य' },
};

/**
 * Phonetic character transliterators for names not in the explicit dictionary.
 */
function transliterateWord(word: string, targetLang: 'ar' | 'ur' | 'hi'): string {
  const clean = word.trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();

  // Exact dictionary lookup
  if (NAME_DICTIONARY[lower]) {
    return NAME_DICTIONARY[lower][targetLang];
  }

  // Handle common prefixes like Al- or Al
  if (lower.startsWith('al-') || lower.startsWith('al ')) {
    const rest = lower.slice(3);
    const tr = transliterateWord(rest, targetLang);
    if (targetLang === 'ar') return 'ال' + tr;
    if (targetLang === 'ur') return 'ال' + tr;
    if (targetLang === 'hi') return 'अल ' + tr;
  }

  // Fallback to phonetic character mapping
  if (targetLang === 'ar') {
    return clean
      .replace(/th/gi, 'ث')
      .replace(/kh/gi, 'خ')
      .replace(/sh/gi, 'ش')
      .replace(/ch/gi, 'تش')
      .replace(/ph/gi, 'ف')
      .replace(/gh/gi, 'غ')
      .replace(/dh/gi, 'ذ')
      .replace(/b/gi, 'ب')
      .replace(/c/gi, 'ك')
      .replace(/d/gi, 'د')
      .replace(/f/gi, 'ف')
      .replace(/g/gi, 'غ')
      .replace(/h/gi, 'ه')
      .replace(/j/gi, 'ج')
      .replace(/k/gi, 'ك')
      .replace(/l/gi, 'ل')
      .replace(/m/gi, 'م')
      .replace(/n/gi, 'ن')
      .replace(/p/gi, 'ب')
      .replace(/q/gi, 'ق')
      .replace(/r/gi, 'ر')
      .replace(/s/gi, 'س')
      .replace(/t/gi, 'ت')
      .replace(/v/gi, 'ف')
      .replace(/w/gi, 'و')
      .replace(/x/gi, 'كس')
      .replace(/y/gi, 'ي')
      .replace(/z/gi, 'ز')
      .replace(/a/gi, 'ا')
      .replace(/e/gi, 'ي')
      .replace(/i/gi, 'ي')
      .replace(/o/gi, 'و')
      .replace(/u/gi, 'و');
  }

  if (targetLang === 'ur') {
    return clean
      .replace(/th/gi, 'تھ')
      .replace(/kh/gi, 'خ')
      .replace(/sh/gi, 'ش')
      .replace(/ch/gi, 'چ')
      .replace(/ph/gi, 'ف')
      .replace(/gh/gi, 'غ')
      .replace(/dh/gi, 'دھ')
      .replace(/b/gi, 'ب')
      .replace(/c/gi, 'ک')
      .replace(/d/gi, 'د')
      .replace(/f/gi, 'ف')
      .replace(/g/gi, 'گ')
      .replace(/h/gi, 'ہ')
      .replace(/j/gi, 'ج')
      .replace(/k/gi, 'ک')
      .replace(/l/gi, 'ل')
      .replace(/m/gi, 'م')
      .replace(/n/gi, 'ن')
      .replace(/p/gi, 'پ')
      .replace(/q/gi, 'ق')
      .replace(/r/gi, 'ر')
      .replace(/s/gi, 'س')
      .replace(/t/gi, 'ٹ')
      .replace(/v/gi, 'و')
      .replace(/w/gi, 'و')
      .replace(/x/gi, 'کس')
      .replace(/y/gi, 'ی')
      .replace(/z/gi, 'ز')
      .replace(/a/gi, 'ا')
      .replace(/e/gi, 'ے')
      .replace(/i/gi, 'ی')
      .replace(/o/gi, 'و')
      .replace(/u/gi, 'و');
  }

  // Hindi (Devanagari)
  return clean
    .replace(/th/gi, 'थ')
    .replace(/kh/gi, 'ख')
    .replace(/sh/gi, 'श')
    .replace(/ch/gi, 'च')
    .replace(/ph/gi, 'फ')
    .replace(/gh/gi, 'घ')
    .replace(/dh/gi, 'ध')
    .replace(/b/gi, 'ब')
    .replace(/c/gi, 'क')
    .replace(/d/gi, 'द')
    .replace(/f/gi, 'फ़')
    .replace(/g/gi, 'ग')
    .replace(/h/gi, 'ह')
    .replace(/j/gi, 'ज')
    .replace(/k/gi, 'क')
    .replace(/l/gi, 'ल')
    .replace(/m/gi, 'म')
    .replace(/n/gi, 'न')
    .replace(/p/gi, 'प')
    .replace(/q/gi, 'क')
    .replace(/r/gi, 'र')
    .replace(/s/gi, 'स')
    .replace(/t/gi, 'त')
    .replace(/v/gi, 'व')
    .replace(/w/gi, 'व')
    .replace(/x/gi, 'क्स')
    .replace(/y/gi, 'य')
    .replace(/z/gi, 'ज़')
    .replace(/a/gi, 'ा')
    .replace(/e/gi, 'े')
    .replace(/i/gi, 'ि')
    .replace(/o/gi, 'ो')
    .replace(/u/gi, 'ु');
}

/**
 * Translates/transliterates a full name into the given language.
 */
export function translateFullName(fullName: string, targetLang: 'ar' | 'ur' | 'hi'): string {
  if (!fullName) return '';
  const words = fullName.trim().split(/\s+/);
  const result: string[] = [];
  for (let index = 0; index < words.length; index++) {
    if (['ar', 'ur'].includes(targetLang) && /^al$/i.test(words[index]) && words[index + 1]) {
      const next = transliterateWord(words[++index], targetLang);
      result.push(next.startsWith('ال') ? next : 'ال' + next);
    } else result.push(transliterateWord(words[index], targetLang));
  }
  return result.join(' ');
}

/**
 * Builds the complete multi-lingual representation for a student and guardian across all 4 languages.
 */
export function generateStudentTranslations(name: string, guardianName?: string): MultilingualTranslations {
  const cleanName = (name || '').trim();
  const cleanGuardian = (guardianName || '').trim();

  return {
    en: {
      name: cleanName,
      guardianName: cleanGuardian || undefined,
    },
    ar: {
      name: translateFullName(cleanName, 'ar'),
      guardianName: cleanGuardian ? translateFullName(cleanGuardian, 'ar') : undefined,
    },
    ur: {
      name: translateFullName(cleanName, 'ur'),
      guardianName: cleanGuardian ? translateFullName(cleanGuardian, 'ur') : undefined,
    },
    hi: {
      name: translateFullName(cleanName, 'hi'),
      guardianName: cleanGuardian ? translateFullName(cleanGuardian, 'hi') : undefined,
    },
  };
}

// Seeded, deterministic demo data for Greenhill Academy (EduMaster)

export const SCHOOL = {
  name: "Greenhill Academy",
  motto: "Knowledge · Character · Service",
  principal: "Mrs. Kamau",
  term: "Term 2, 2026",
};

export const GRADES = [
  "PP1",
  "PP2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
] as const;

export type Grade = (typeof GRADES)[number];

export const SUBJECTS = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Integrated Science",
  "Social Studies",
  "CRE",
  "Creative Arts",
];

// ---- deterministic pseudo random ----
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_M = [
  "Brian","Kevin","Collins","Dennis","Elvis","Felix","Gideon","Hillary","Isaac","John",
  "Kelvin","Lewis","Mark","Nelson","Oscar","Peter","Samuel","Timothy","Victor","Wycliffe",
];
const FIRST_F = [
  "Achieng","Beatrice","Cynthia","Damaris","Esther","Faith","Grace","Hellen","Irene","Joy",
  "Karen","Lydia","Mercy","Nancy","Purity","Rose","Sharon","Tabitha","Valentine","Winnie",
];
const LAST = [
  "Kamau","Otieno","Wanjiru","Kiptoo","Mwangi","Achieng","Njoroge","Chebet","Omondi","Wafula",
  "Muthoni","Kirui","Ndung'u","Atieno","Barasa","Cheruiyot","Gitonga","Kilonzo","Mutiso","Owino",
  "Nyambura","Rotich","Simiyu","Wekesa","Auma","Karanja","Maina","Njeri","Onyango","Waweru",
];

export type Student = {
  id: string;
  name: string;
  adm: string;
  nemis: string;
  grade: Grade;
  stream: string;
  gender: "Male" | "Female";
  guardian: string;
  guardianPhone: string;
  feeBilled: number;
  feePaid: number;
  balance: number;
  status: "Active" | "Suspended" | "Transferred";
  dob: string;
  county: string;
  admittedOn: string;
};

const COUNTIES = ["Nairobi", "Kiambu", "Nakuru", "Kisumu", "Machakos", "Uasin Gishu", "Kakamega"];

function buildStudents(): Student[] {
  const rand = mulberry32(20260726);
  const total = 847;
  const out: Student[] = [];
  for (let i = 0; i < total; i++) {
    const gender = rand() > 0.49 ? "Female" : ("Male" as Student["gender"]);
    const first = gender === "Female"
      ? FIRST_F[Math.floor(rand() * FIRST_F.length)]
      : FIRST_M[Math.floor(rand() * FIRST_M.length)];
    const mid = LAST[Math.floor(rand() * LAST.length)];
    const last = LAST[Math.floor(rand() * LAST.length)];
    const grade = GRADES[Math.floor(rand() * GRADES.length)];
    const stream = ["A", "B", "C"][Math.floor(rand() * 3)];
    const billed = 12000 + Math.floor(rand() * 6) * 3500;
    const paidRatio = rand();
    const paid = Math.round((paidRatio > 0.75 ? 1 : paidRatio) * billed * 100) / 100;
    const gFirst = rand() > 0.5
      ? FIRST_F[Math.floor(rand() * FIRST_F.length)]
      : FIRST_M[Math.floor(rand() * FIRST_M.length)];
    out.push({
      id: `stu-${i + 1}`,
      name: `${first} ${mid} ${last}`,
      adm: `GHA/${(1000 + i).toString()}/${2020 + (i % 6)}`,
      nemis: `${20000000 + i * 37}`,
      grade,
      stream,
      gender,
      guardian: `${gFirst} ${last}`,
      guardianPhone: `+2547${Math.floor(10000000 + rand() * 89999999)}`,
      feeBilled: billed,
      feePaid: Math.round(paid),
      balance: Math.max(0, billed - Math.round(paid)),
      status: rand() > 0.985 ? "Transferred" : rand() > 0.99 ? "Suspended" : "Active",
      dob: `${2010 + (i % 9)}-0${1 + (i % 9)}-1${i % 9}`,
      county: COUNTIES[Math.floor(rand() * COUNTIES.length)],
      admittedOn: `${2020 + (i % 6)}-01-${10 + (i % 15)}`,
    });
  }
  return out;
}

export const STUDENTS: Student[] = buildStudents();

export const KES = (n: number) =>
  `KES ${Math.round(n).toLocaleString("en-KE")}`;

export type CbcLevel = "EE" | "ME" | "AE" | "BE";

export function cbcLevel(pct: number): CbcLevel {
  if (pct >= 80) return "EE";
  if (pct >= 65) return "ME";
  if (pct >= 50) return "AE";
  return "BE";
}

export const CBC_LABEL: Record<CbcLevel, string> = {
  EE: "Exceeding Expectation",
  ME: "Meeting Expectation",
  AE: "Approaching Expectation",
  BE: "Below Expectation",
};

// ---------- dashboard datasets ----------
export const KPIS = (() => {
  const totalStudents = STUDENTS.length;
  const collected = STUDENTS.reduce((s, x) => s + x.feePaid, 0);
  const billed = STUDENTS.reduce((s, x) => s + x.feeBilled, 0);
  return {
    totalStudents,
    staff: 54,
    collected,
    outstanding: billed - collected,
    attendance: 94.2,
    activeExams: 4,
    meanScore: 68.7,
  };
})();

export const feeTrend = [
  { month: "Jan", collected: 4.2, outstanding: 2.1 },
  { month: "Feb", collected: 5.6, outstanding: 1.8 },
  { month: "Mar", collected: 6.9, outstanding: 1.5 },
  { month: "Apr", collected: 5.1, outstanding: 2.4 },
  { month: "May", collected: 7.8, outstanding: 1.2 },
  { month: "Jun", collected: 8.4, outstanding: 1.6 },
  { month: "Jul", collected: 9.1, outstanding: 1.1 },
];

export const genderSplit = (() => {
  const f = STUDENTS.filter((s) => s.gender === "Female").length;
  return [
    { name: "Girls", value: f },
    { name: "Boys", value: STUDENTS.length - f },
  ];
})();

export const weeklyAttendance = [
  { day: "Mon", present: 812, absent: 35 },
  { day: "Tue", present: 826, absent: 21 },
  { day: "Wed", present: 798, absent: 49 },
  { day: "Thu", present: 831, absent: 16 },
  { day: "Fri", present: 774, absent: 73 },
];

export const performanceByGrade = GRADES.map((g, i) => ({
  grade: g,
  term1: 58 + ((i * 7) % 22),
  term2: 61 + ((i * 5) % 24),
}));

export const recentPayments = STUDENTS.slice(0, 6).map((s, i) => ({
  id: s.id,
  name: s.name,
  grade: s.grade,
  amount: 4500 + i * 2750,
  method: ["M-Pesa", "Bank", "M-Pesa", "Cash", "Bank", "M-Pesa"][i],
  ref: `RJK${(72910 + i * 13).toString()}`,
  date: `26 Jul, ${9 + i}:${(10 + i * 7).toString().padStart(2, "0")} AM`,
}));

export const notifications = [
  { title: "Term 2 exam timetable published", time: "12 min ago", tone: "info" as const },
  { title: "18 students crossed KES 20,000 fee balance", time: "1 hr ago", tone: "warn" as const },
  { title: "Grade 6 science marks submitted by Mr. Otieno", time: "3 hrs ago", tone: "ok" as const },
  { title: "Bus KBX 442Q service due Friday", time: "Yesterday", tone: "warn" as const },
];

export const upcomingEvents = [
  { title: "Mid-Term CAT Week", date: "Mon, 3 Aug", tag: "Academics" },
  { title: "Parents' Consultation Day", date: "Sat, 8 Aug", tag: "Community" },
  { title: "Inter-House Ball Games", date: "Wed, 12 Aug", tag: "Sports" },
  { title: "CBC Assessment Moderation", date: "Fri, 21 Aug", tag: "Academics" },
];

// ---------- examinations ----------
export type Exam = {
  id: string;
  name: string;
  term: string;
  grades: string;
  subjects: number;
  start: string;
  end: string;
  status: "Active" | "Draft" | "Completed" | "Marking";
  entered: number;
};

export const EXAMS: Exam[] = [
  { id: "ex-1", name: "Term 2 Mid-Term Assessment", term: "Term 2, 2026", grades: "Grade 4 – Grade 9", subjects: 7, start: "03 Aug", end: "07 Aug", status: "Active", entered: 62 },
  { id: "ex-2", name: "Term 2 Opener CAT", term: "Term 2, 2026", grades: "PP1 – Grade 9", subjects: 5, start: "12 May", end: "15 May", status: "Completed", entered: 100 },
  { id: "ex-3", name: "Grade 9 KJSEA Mock 1", term: "Term 2, 2026", grades: "Grade 9", subjects: 7, start: "18 Aug", end: "22 Aug", status: "Draft", entered: 0 },
  { id: "ex-4", name: "Lower Primary Literacy Check", term: "Term 2, 2026", grades: "PP1 – Grade 3", subjects: 3, start: "29 Jul", end: "30 Jul", status: "Marking", entered: 41 },
];

export type MarkRow = {
  studentId: string;
  name: string;
  adm: string;
  marks: Record<string, number>;
};

export function marksFor(grade: Grade, count = 24): MarkRow[] {
  const rand = mulberry32(grade.length * 977 + grade.charCodeAt(grade.length - 1));
  return STUDENTS.filter((s) => s.grade === grade)
    .slice(0, count)
    .map((s) => {
      const marks: Record<string, number> = {};
      SUBJECTS.forEach((sub) => {
        marks[sub] = Math.min(100, Math.max(22, Math.round(38 + rand() * 58)));
      });
      return { studentId: s.id, name: s.name, adm: s.adm, marks };
    });
}

// ---------- academic terms ----------
export type Term = {
  id: string;
  label: string;
  short: string;
  year: number;
  window: string;
  status: "Closed" | "Current" | "Upcoming";
};

export const TERMS: Term[] = [
  { id: "2025-t3", label: "Term 3, 2025", short: "T3 '25", year: 2025, window: "Sep – Nov 2025", status: "Closed" },
  { id: "2026-t1", label: "Term 1, 2026", short: "T1 '26", year: 2026, window: "Jan – Apr 2026", status: "Closed" },
  { id: "2026-t2", label: "Term 2, 2026", short: "T2 '26", year: 2026, window: "May – Aug 2026", status: "Current" },
  { id: "2026-t3", label: "Term 3, 2026", short: "T3 '26", year: 2026, window: "Sep – Nov 2026", status: "Upcoming" },
];

export const CURRENT_TERM_ID = "2026-t2";

export function getTerm(id: string): Term {
  return TERMS.find((t) => t.id === id) ?? TERMS[2];
}

function termSeed(id: string) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 0 for closed past terms, growing for recent ones. */
function termIndex(id: string) {
  return Math.max(0, TERMS.findIndex((t) => t.id === id));
}

export function kpisFor(termId: string) {
  const t = getTerm(termId);
  const i = termIndex(termId);
  const rand = mulberry32(termSeed(termId));
  const upcoming = t.status === "Upcoming";
  const ratio = upcoming ? 0.08 : t.status === "Current" ? 0.72 : 0.97;
  const billed = STUDENTS.reduce((s, x) => s + x.feeBilled, 0) * (0.92 + i * 0.03);
  const collected = billed * ratio;
  return {
    term: t,
    totalStudents: KPIS.totalStudents - (3 - i) * 11,
    staff: 54 - (3 - i),
    collected,
    outstanding: billed - collected,
    attendance: Math.round((91 + rand() * 4) * 10) / 10,
    activeExams: upcoming ? 1 : t.status === "Current" ? 4 : 3,
    meanScore: Math.round((63 + i * 1.8 + rand() * 3) * 10) / 10,
    marksEntered: upcoming ? 0 : t.status === "Current" ? 62 : 100,
  };
}

const TERM_MONTHS: Record<string, string[]> = {
  "2025-t3": ["Sep", "Oct", "Nov"],
  "2026-t1": ["Jan", "Feb", "Mar", "Apr"],
  "2026-t2": ["May", "Jun", "Jul", "Aug"],
  "2026-t3": ["Sep", "Oct", "Nov"],
};

export function feeTrendFor(termId: string) {
  const rand = mulberry32(termSeed(termId));
  const t = getTerm(termId);
  return (TERM_MONTHS[termId] ?? TERM_MONTHS["2026-t2"]).map((month, idx) => {
    const base = t.status === "Upcoming" ? 1.2 : 4.5 + idx * 1.1;
    return {
      month,
      collected: Math.round((base + rand() * 2.4) * 10) / 10,
      outstanding: Math.round((0.9 + rand() * 1.7) * 10) / 10,
    };
  });
}

export function performanceForTerm(termId: string) {
  const i = termIndex(termId);
  const prev = TERMS[Math.max(0, i - 1)];
  const rand = mulberry32(termSeed(termId));
  return GRADES.map((g, k) => ({
    grade: g,
    previous: 55 + ((k * 7 + i * 3) % 24) + Math.round(rand() * 4),
    current: 58 + ((k * 5 + i * 5) % 26) + Math.round(rand() * 5),
    previousLabel: prev.short,
    currentLabel: getTerm(termId).short,
  }));
}

export function weeklyAttendanceFor(termId: string) {
  const rand = mulberry32(termSeed(termId) + 5);
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => {
    const absent = 14 + Math.round(rand() * 60);
    return { day, present: 847 - absent, absent };
  });
}

export function examsFor(termId: string): Exam[] {
  const t = getTerm(termId);
  const rand = mulberry32(termSeed(termId) + 11);
  const templates =
    t.status === "Upcoming"
      ? [
          { name: `${t.label.split(",")[0]} Opener CAT`, grades: "PP1 – Grade 9", subjects: 5, start: "14 Sep", end: "17 Sep", status: "Draft" as const },
          { name: "Grade 9 KJSEA Mock 3", grades: "Grade 9", subjects: 7, start: "05 Oct", end: "09 Oct", status: "Draft" as const },
        ]
      : [
          { name: `${t.label.split(",")[0]} Opener CAT`, grades: "PP1 – Grade 9", subjects: 5, start: "12 " + (TERM_MONTHS[termId]?.[0] ?? "May"), end: "15 " + (TERM_MONTHS[termId]?.[0] ?? "May"), status: "Completed" as const },
          { name: `${t.label.split(",")[0]} Mid-Term Assessment`, grades: "Grade 4 – Grade 9", subjects: 7, start: "03 " + (TERM_MONTHS[termId]?.[1] ?? "Jun"), end: "07 " + (TERM_MONTHS[termId]?.[1] ?? "Jun"), status: t.status === "Current" ? ("Active" as const) : ("Completed" as const) },
          { name: "Lower Primary Literacy Check", grades: "PP1 – Grade 3", subjects: 3, start: "29 " + (TERM_MONTHS[termId]?.[1] ?? "Jun"), end: "30 " + (TERM_MONTHS[termId]?.[1] ?? "Jun"), status: t.status === "Current" ? ("Marking" as const) : ("Completed" as const) },
          { name: `${t.label.split(",")[0]} End-Term Examination`, grades: "PP1 – Grade 9", subjects: 7, start: "18 " + (TERM_MONTHS[termId]?.slice(-1)[0] ?? "Aug"), end: "22 " + (TERM_MONTHS[termId]?.slice(-1)[0] ?? "Aug"), status: t.status === "Current" ? ("Draft" as const) : ("Completed" as const) },
        ];
  return templates.map((x, i) => ({
    id: `${termId}-ex-${i + 1}`,
    term: t.label,
    entered:
      x.status === "Completed" ? 100 : x.status === "Draft" ? 0 : 30 + Math.round(rand() * 60),
    ...x,
  }));
}

/** Term-aware marks: same learners, term-specific scores. */
export function marksForTerm(grade: Grade, termId: string, count = 24): MarkRow[] {
  const drift = termIndex(termId) * 3 - 3;
  const rand = mulberry32(
    grade.length * 977 + grade.charCodeAt(grade.length - 1) + termSeed(termId),
  );
  return STUDENTS.filter((s) => s.grade === grade)
    .slice(0, count)
    .map((s) => {
      const marks: Record<string, number> = {};
      SUBJECTS.forEach((sub) => {
        marks[sub] = Math.min(100, Math.max(20, Math.round(38 + drift + rand() * 58)));
      });
      return { studentId: s.id, name: s.name, adm: s.adm, marks };
    });
}

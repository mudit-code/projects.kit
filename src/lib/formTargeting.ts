import studentsData from "@/data/students.json";

export type StudentRecord = {
  id: number;
  name: string;
  afn: string;
  rollNumber: string;
  email: string;
  year: string;
  batch: string;
  course: string;
  section: string;
  stream: string;
  gender: string;
};

/**
 * Returns a strict canonical branch code to prevent false substring collisions
 * (e.g. "Electrical & Electronics" contains "cs" + "e", which previously collided with "CSE").
 */
export function getCanonicalStream(stream?: string): string {
  if (!stream) return "";
  const s = stream.toLowerCase().trim();

  // AI & ML takes precedence over general computer science
  if (
    s.includes("ai") ||
    s.includes("artificial") ||
    s.includes("machine learning") ||
    s.includes("aiml")
  ) {
    return "CSE_AIML";
  }

  // Core Computer Science
  if (
    s.includes("computer science") ||
    s === "cse" ||
    s.startsWith("cse ") ||
    s.endsWith(" cse")
  ) {
    return "CSE";
  }

  // Information Technology
  if (s.includes("information technology") || s === "it") {
    return "IT";
  }

  // Electrical & Electronics Engineering (EEE)
  if (s.includes("electrical") || s === "eee") {
    return "EEE";
  }

  // Electronics & Communication (ECE)
  if (s.includes("communication") || s.includes("electronics") || s === "ece") {
    return "ECE";
  }

  // Mechanical Engineering (ME)
  if (s.includes("mechanical") || s === "me") {
    return "ME";
  }

  // Biotechnology (BT)
  if (s.includes("biotechnology") || s.includes("biotech") || s === "bt") {
    return "BT";
  }

  // Civil Engineering (CE)
  if (s.includes("civil") || s === "ce") {
    return "CE";
  }

  // Master of Computer Applications
  if (s.includes("mca")) {
    return "MCA";
  }

  return s.replace(/[^a-z0-9]/g, "");
}

/**
 * Checks whether a given student is strictly eligible for a published form.
 * Ensures that:
 * - Course matches (e.g. B.Tech)
 * - Year matches (e.g. 4th Year)
 * - Stream matches strictly (e.g. CSE only matches Core CSE, never EEE or ECE or AIML)
 * - Section matches strictly (e.g. Section A only matches Section A, not B or C)
 */
export function isStudentEligibleForForm(
  student: {
    course?: string;
    year?: string;
    stream?: string;
    section?: string;
  },
  form: {
    course?: string;
    year?: string;
    stream?: string;
    branch?: string;
    section?: string;
  }
): boolean {
  // 1. Course Match
  const formCourse = (form.course || "").trim();
  if (formCourse && formCourse !== "All" && formCourse !== "All Courses") {
    const studentCourse = (student.course || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const expectedCourse = formCourse.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (studentCourse !== expectedCourse) return false;
  }

  // 2. Year Match
  const formYear = (form.year || "").trim();
  if (formYear && formYear !== "All" && formYear !== "All Years") {
    const cleanFormYear = formYear.replace(/\s*Year/i, "").trim().toLowerCase();
    const cleanStudentYear = (student.year || "").replace(/\s*Year/i, "").trim().toLowerCase();
    if (cleanFormYear && cleanStudentYear && cleanFormYear !== cleanStudentYear) {
      return false;
    }
  }

  // 3. Stream / Branch Match
  const formBranch = form.stream || form.branch || "";
  if (formBranch && formBranch !== "All" && formBranch !== "All Branches") {
    const studentCanon = getCanonicalStream(student.stream);
    const formCanon = getCanonicalStream(formBranch);
    if (studentCanon !== formCanon) {
      return false;
    }
  }

  // 4. Section Match
  const formSecRaw = form.section || "";
  if (
    formSecRaw &&
    formSecRaw !== "All" &&
    formSecRaw !== "All Sections" &&
    formSecRaw !== "All"
  ) {
    const cleanFormSec = formSecRaw.replace(/SEC(?:TION)?\s*/i, "").trim().toUpperCase();
    const cleanStudentSec = (student.section || "").replace(/SEC(?:TION)?\s*/i, "").trim().toUpperCase();
    if (cleanFormSec && cleanStudentSec !== cleanFormSec) {
      return false;
    }
  }

  return true;
}

/**
 * Returns all student records that belong to the target cohort of a form.
 */
export function getEligibleStudentsForForm(form: {
  course?: string;
  year?: string;
  stream?: string;
  branch?: string;
  section?: string;
}): StudentRecord[] {
  const allStudents = studentsData as StudentRecord[];
  return allStudents.filter((student) => isStudentEligibleForForm(student, form));
}

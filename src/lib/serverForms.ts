import { prisma } from "./prisma";
import { getEligibleStudentsForForm, StudentRecord } from "./formTargeting";

export interface ServerForm {
  id: string;
  subjectCode: string;
  title: string;
  course: string;
  stream: string;
  year: string;
  section: string;
  category?: string;
  projectType?: string;
  customProjectName?: string;
  startDate?: string;
  deadline: string;
  publishedAt?: string;
  status: "Active" | "Completed" | "Draft" | string;
  publishedBy?: string;
  assignedTo?: string;
  coordinator?: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  };
  finalSubmissionOpen?: boolean;
  finalSubmissionDeadline?: string | null;
  presentationsScheduled?: boolean;
  presentationsConfig?: any;
  isTrashed?: boolean;
  trashedAt?: Date | null;
  trashExpiresAt?: Date | null;
  deletedBy?: string | null;
}

export interface ServerSubmission {
  id?: string;
  formId: string;
  projectName: string;
  projectDescription?: string;
  registrationType?: "Individual" | "Group" | string;
  submittedAt: string;
  verificationStatus?: string;
  approvalStatus?: string;
  student?: {
    id?: number;
    afn?: string;
    rollNumber?: string;
    name?: string;
    email?: string;
    course?: string;
    stream?: string;
    year?: string;
    whatsapp?: string;
  };
  teamMembers?: Array<{
    id?: number;
    afn?: string;
    rollNumber?: string;
    name?: string;
    email?: string;
  }>;
  form?: ServerForm;
}

/**
 * Maps a Prisma Form record to the ServerForm interface.
 */
function mapPrismaForm(f: any): ServerForm {
  let presentationsConfigParsed: any = null;
  if (f.presentationsConfig) {
    try {
      presentationsConfigParsed = JSON.parse(f.presentationsConfig);
    } catch {
      presentationsConfigParsed = f.presentationsConfig;
    }
  }

  return {
    id: f.id,
    subjectCode: f.subjectCode,
    title: f.title,
    course: f.course,
    stream: f.stream,
    year: f.year,
    section: f.section,
    category: f.category || "Academic",
    projectType: f.projectType || "Mini Project",
    customProjectName: f.customProjectName || undefined,
    startDate: f.startDate || undefined,
    deadline: f.deadline,
    publishedAt: f.publishedAt || undefined,
    status: f.status,
    publishedBy: f.publishedBy || undefined,
    assignedTo: f.assignedTo || "self",
    coordinator: {
      name: f.coordinatorName || "Rahul Singh",
      email: f.coordinatorEmail || "muditcodes@gmail.com",
      phone: f.coordinatorPhone || "+91 98765 43210",
      role: f.coordinatorRole || "HOD",
    },
    finalSubmissionOpen: Boolean(f.finalSubmissionOpen),
    finalSubmissionDeadline: f.finalSubmissionDeadline || null,
    presentationsScheduled: Boolean(f.presentationsScheduled),
    presentationsConfig: presentationsConfigParsed,
    isTrashed: Boolean(f.isTrashed),
    trashedAt: f.trashedAt || null,
    trashExpiresAt: f.trashExpiresAt || null,
    deletedBy: f.deletedBy || null,
  };
}

/**
 * Maps a Prisma Submission record to ServerSubmission interface.
 */
function mapPrismaSubmission(s: any): ServerSubmission {
  let parsedTeam: any[] = [];
  if (s.teamMembers) {
    try {
      parsedTeam = JSON.parse(s.teamMembers);
    } catch {
      parsedTeam = [];
    }
  }

  return {
    id: s.id,
    formId: s.formId,
    projectName: s.projectName,
    projectDescription: s.projectDescription || undefined,
    registrationType: s.registrationType || "Individual",
    submittedAt: s.submittedAt ? s.submittedAt.toISOString() : new Date().toISOString(),
    verificationStatus: s.verificationStatus || "pending",
    approvalStatus: s.approvalStatus || "pending",
    student: {
      afn: s.studentAfn,
      rollNumber: s.studentRollNumber,
      name: s.studentName,
      email: s.studentEmail,
      course: s.studentCourse || undefined,
      stream: s.studentStream || undefined,
      year: s.studentYear || undefined,
      whatsapp: s.studentPhone || undefined,
    },
    teamMembers: parsedTeam,
    ...(s.form ? { form: mapPrismaForm(s.form) } : {}),
  };
}

// In-memory cache for ultra-fast server reads
let cachedServerForms: ServerForm[] | null = null;
let formsCacheTimestamp = 0;
const FORMS_CACHE_TTL_MS = 15_000; // 15 seconds

export function invalidateServerFormsCache() {
  cachedServerForms = null;
  formsCacheTimestamp = 0;
}

export async function getAllServerForms(): Promise<ServerForm[]> {
  const now = Date.now();
  if (cachedServerForms && now - formsCacheTimestamp < FORMS_CACHE_TTL_MS) {
    return cachedServerForms;
  }
  try {
    const forms = await prisma.form.findMany({
      where: { isTrashed: false },
      orderBy: { createdAt: "desc" },
    });
    cachedServerForms = forms.map(mapPrismaForm);
    formsCacheTimestamp = now;
    return cachedServerForms;
  } catch (err: any) {
    if (cachedServerForms) return cachedServerForms;
    console.error("Failed to read server forms from database:", err);
    return [];
  }
}

export async function upsertServerForm(form: ServerForm): Promise<ServerForm> {
  invalidateServerFormsCache();
  const cleanId = (form.id || `INIT-${Date.now().toString(36).toUpperCase()}`).trim();

  const presentationsConfigStr = form.presentationsConfig
    ? typeof form.presentationsConfig === "string"
      ? form.presentationsConfig
      : JSON.stringify(form.presentationsConfig)
    : null;

  const data = {
    subjectCode: form.subjectCode || "BCS751",
    title: form.title || (form.customProjectName ? `${form.customProjectName} Registration Form` : (form.projectType ? `${form.projectType} Registration Form` : "Project Form")),
    course: form.course || "B.Tech",
    stream: form.stream || "Computer Science & Engineering",
    year: form.year || "4th Year",
    section: form.section || "A",
    category: form.category || "Academic",
    projectType: form.projectType || "Mini Project",
    customProjectName: form.customProjectName || null,
    startDate: form.startDate || null,
    deadline: form.deadline || "2026-11-30",
    publishedAt: form.publishedAt || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    status: form.status || "Active",
    publishedBy: form.publishedBy || "Rahul Singh",
    assignedTo: form.assignedTo || "self",
    coordinatorName: form.coordinator?.name || "Rahul Singh",
    coordinatorEmail: form.coordinator?.email || "muditcodes@gmail.com",
    coordinatorPhone: form.coordinator?.phone || "+91 98765 43210",
    coordinatorRole: form.coordinator?.role || "HOD",
    finalSubmissionOpen: Boolean(form.finalSubmissionOpen),
    finalSubmissionDeadline: form.finalSubmissionDeadline || null,
    presentationsScheduled: Boolean(form.presentationsScheduled),
    presentationsConfig: presentationsConfigStr,
    isTrashed: Boolean(form.isTrashed),
    trashedAt: form.trashedAt || null,
    trashExpiresAt: form.trashExpiresAt || null,
    deletedBy: form.deletedBy || null,
  };

  const saved = await prisma.form.upsert({
    where: { id: cleanId },
    update: data,
    create: {
      id: cleanId,
      ...data,
    },
  });

  invalidateServerFormsCache();
  return mapPrismaForm(saved);
}

export async function getServerForm(
  formId: string,
  fallbackMeta?: Partial<ServerForm>
): Promise<ServerForm | null> {
  const cleanId = decodeURIComponent(formId).trim();

  let form = await prisma.form.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { id: { equals: cleanId } },
        { subjectCode: cleanId },
      ],
    },
  });

  if (form) {
    if (fallbackMeta && Object.keys(fallbackMeta).length > 0) {
      const updated = await prisma.form.update({
        where: { id: form.id },
        data: {
          ...(fallbackMeta.title ? { title: fallbackMeta.title } : {}),
          ...(fallbackMeta.deadline ? { deadline: fallbackMeta.deadline } : {}),
          ...(fallbackMeta.coordinator?.name ? { coordinatorName: fallbackMeta.coordinator.name } : {}),
          ...(fallbackMeta.coordinator?.email ? { coordinatorEmail: fallbackMeta.coordinator.email } : {}),
        },
      });
      return mapPrismaForm(updated);
    }
    return mapPrismaForm(form);
  }

  // If not found in database, return in-memory representation if fallbackMeta was explicitly supplied (without persisting synthetic data to DB)
  if (fallbackMeta && (fallbackMeta.subjectCode || fallbackMeta.title)) {
    const defaultSubjectCode = fallbackMeta?.subjectCode || "BCS751";
    const defaultForm: ServerForm = {
      id: cleanId,
      subjectCode: defaultSubjectCode,
      title: fallbackMeta?.title || "Project Registration Form",
      course: fallbackMeta?.course || "B.Tech",
      stream: fallbackMeta?.stream || "Computer Science & Engineering",
      year: fallbackMeta?.year || "4th Year",
      section: fallbackMeta?.section || "A",
      deadline: fallbackMeta?.deadline || "2026-11-30",
      status: (fallbackMeta?.status as any) || "Active",
      publishedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      publishedBy: "Rahul Singh",
      assignedTo: "self",
      coordinator: {
        name: fallbackMeta?.coordinator?.name || "Rahul Singh",
        email: fallbackMeta?.coordinator?.email || "muditcodes@gmail.com",
        role: fallbackMeta?.coordinator?.role || "HOD",
      },
    };
    return defaultForm;
  }

  return null;
}

// In-memory cache for ultra-fast submissions reads
let cachedServerSubmissions: Record<string, ServerSubmission[]> | null = null;
let subsCacheTimestamp = 0;
const SUBS_CACHE_TTL_MS = 15_000; // 15 seconds

export function invalidateServerSubmissionsCache() {
  cachedServerSubmissions = null;
  subsCacheTimestamp = 0;
}

export async function getAllServerSubmissions(): Promise<Record<string, ServerSubmission[]>> {
  const now = Date.now();
  if (cachedServerSubmissions && now - subsCacheTimestamp < SUBS_CACHE_TTL_MS) {
    return cachedServerSubmissions;
  }
  try {
    const submissions = await prisma.submission.findMany({
      include: { form: true },
      orderBy: { submittedAt: "desc" },
    });

    const grouped: Record<string, ServerSubmission[]> = {};
    for (const sub of submissions) {
      if (!grouped[sub.formId]) {
        grouped[sub.formId] = [];
      }
      grouped[sub.formId].push(mapPrismaSubmission(sub));
    }
    cachedServerSubmissions = grouped;
    subsCacheTimestamp = now;
    return grouped;
  } catch (err) {
    if (cachedServerSubmissions) return cachedServerSubmissions;
    console.error("Failed to load submissions from database:", err);
    return {};
  }
}

export async function getServerSubmissionsForForm(formId: string): Promise<ServerSubmission[]> {
  const cleanId = decodeURIComponent(formId).trim();

  // Find all related form keys
  const matchingForms = await prisma.form.findMany({
    where: {
      OR: [{ id: cleanId }, { subjectCode: cleanId }],
    },
  });

  const formIds = [cleanId];
  for (const f of matchingForms) {
    if (!formIds.includes(f.id)) formIds.push(f.id);
  }

  const subs = await prisma.submission.findMany({
    where: {
      formId: { in: formIds },
    },
    include: { form: true },
    orderBy: { submittedAt: "desc" },
  });

  return subs.map(mapPrismaSubmission);
}

export async function saveServerSubmission(
  formId: string,
  submission: ServerSubmission | any
): Promise<ServerSubmission> {
  const cleanFormId = (formId || submission.formId || "").trim();

  // Ensure form exists in database
  let form = await prisma.form.findUnique({ where: { id: cleanFormId } });
  if (!form) {
    form = await prisma.form.create({
      data: {
        id: cleanFormId,
        subjectCode: submission.subjectCode || "PROJECT",
        title: submission.projectName || "Project Form",
        course: submission.student?.course || "B.Tech",
        stream: submission.student?.stream || "Computer Science & Engineering",
        year: submission.student?.year || "4th Year",
        section: submission.student?.section || "A",
        deadline: "2026-11-30",
        status: "Active",
      },
    });
  }

  const studentAfn = String(submission.student?.afn || "").trim();
  const studentRoll = String(submission.student?.rollNumber || "").trim();
  const studentName = String(submission.student?.name || "").trim();
  const studentEmail = String(submission.student?.email || "").trim();

  const teamMembersStr = submission.teamMembers
    ? typeof submission.teamMembers === "string"
      ? submission.teamMembers
      : JSON.stringify(submission.teamMembers)
    : null;

  // Check if student already submitted for this form
  const existing = await prisma.submission.findFirst({
    where: {
      formId: cleanFormId,
      OR: [
        ...(studentAfn ? [{ studentAfn }] : []),
        ...(studentRoll ? [{ studentRollNumber: studentRoll }] : []),
        ...(studentEmail ? [{ studentEmail }] : []),
      ],
    },
  });

  let savedRecord;
  if (existing) {
    savedRecord = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        projectName: submission.projectName,
        projectDescription: submission.projectDescription || null,
        registrationType: submission.registrationType || "Individual",
        verificationStatus: submission.verificationStatus || existing.verificationStatus,
        approvalStatus: submission.approvalStatus || existing.approvalStatus,
        studentName,
        studentPhone: submission.student?.whatsapp || submission.student?.phone || null,
        studentCourse: submission.student?.course || null,
        studentStream: submission.student?.stream || null,
        studentYear: submission.student?.year || null,
        studentSection: submission.student?.section || null,
        teamMembers: teamMembersStr,
      },
    });
  } else {
    savedRecord = await prisma.submission.create({
      data: {
        formId: cleanFormId,
        projectName: submission.projectName,
        projectDescription: submission.projectDescription || null,
        registrationType: submission.registrationType || "Individual",
        verificationStatus: submission.verificationStatus || "pending",
        approvalStatus: submission.approvalStatus || "pending",
        studentAfn,
        studentRollNumber: studentRoll,
        studentName,
        studentEmail,
        studentPhone: submission.student?.whatsapp || submission.student?.phone || null,
        studentCourse: submission.student?.course || null,
        studentStream: submission.student?.stream || null,
        studentYear: submission.student?.year || null,
        studentSection: submission.student?.section || null,
        teamMembers: teamMembersStr,
      },
    });
  }

  invalidateServerSubmissionsCache();
  return mapPrismaSubmission(savedRecord);
}

export async function getServerPendingStudentsForForm(
  formId: string,
  fallbackMeta?: Partial<ServerForm>
) {
  const form = await getServerForm(formId, fallbackMeta);
  if (!form) {
    return null;
  }

  // Calculate eligible cohort from students table
  const eligibleStudents = getEligibleStudentsForForm({
    course: form.course,
    year: form.year,
    stream: form.stream,
    branch: form.stream,
    section: form.section,
  });

  const subsList = await getServerSubmissionsForForm(form.id);

  const submittedAfns = new Set<string>();
  const submittedRolls = new Set<string>();
  const submittedEmails = new Set<string>();

  for (const sub of subsList) {
    if (sub.student?.afn) submittedAfns.add(sub.student.afn.toUpperCase());
    if (sub.student?.rollNumber) submittedRolls.add(sub.student.rollNumber.toUpperCase());
    if (sub.student?.email) submittedEmails.add(sub.student.email.toLowerCase());

    if (Array.isArray(sub.teamMembers)) {
      for (const member of sub.teamMembers) {
        if (member.afn) submittedAfns.add(member.afn.toUpperCase());
        if (member.rollNumber) submittedRolls.add(member.rollNumber.toUpperCase());
        if (member.email) submittedEmails.add(member.email.toLowerCase());
      }
    }
  }

  const isStudentSubmitted = (s: StudentRecord) => {
    return (
      (s.afn && submittedAfns.has(s.afn.toUpperCase())) ||
      (s.rollNumber && submittedRolls.has(s.rollNumber.toUpperCase())) ||
      (s.email && submittedEmails.has(s.email.toLowerCase()))
    );
  };

  const pendingStudents = eligibleStudents.filter((s) => !isStudentSubmitted(s));
  const submittedStudents = eligibleStudents.filter((s) => isStudentSubmitted(s));

  return {
    form,
    eligibleStudents,
    pendingStudents,
    submittedStudents,
  };
}

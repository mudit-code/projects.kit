import nodemailer, { type Transporter } from "nodemailer";
import { StudentRecord } from "../formTargeting";
import { ServerForm } from "../serverForms";

export interface EmailDispatchResult {
  studentId: string;
  studentAfn?: string;
  studentRollNumber?: string;
  studentEmail: string;
  studentName: string;
  status: "sent" | "failed";
  mode: "log" | "smtp";
  recipientActual: string;
  recipientEffective: string;
  messageId?: string;
  error?: string;
}

export interface SendRemindersOptions {
  form: ServerForm;
  students: StudentRecord[];
  senderEmail: string;
  senderName: string;
  customSubject?: string;
  customBody?: string;
}

/**
 * Builds HTML for a custom user-edited reminder message while preserving institutional branding.
 */
function buildCustomReminderHtml(options: {
  customBody: string;
  isTestRedirect: boolean;
  testRecipient?: string;
}): string {
  const { customBody, isTestRedirect, testRecipient } = options;

  // If the body already contains HTML from the rich editor, use directly; otherwise format paragraphs
  const isHtml = /<[a-z][\s\S]*>/i.test(customBody);
  const formattedBody = isHtml
    ? customBody
    : customBody
        .split(/\n\n+/)
        .map((paragraph) => {
          const line = paragraph
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");
          return `<p style="margin: 0 0 14px 0;">${line}</p>`;
        })
        .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Departmental Notification - Kanpur Institute of Technology</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(10, 42, 94, 0.05); }
    .header { background: #0A2A5E; padding: 26px 32px; text-align: left; border-bottom: 3px solid #F59E0B; }
    .header h1 { margin: 0; color: #ffffff; font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .banner-test { background: #fef3c7; border-bottom: 1px solid #fde68a; padding: 10px 24px; font-size: 12px; color: #92400e; font-weight: 600; }
    .content { padding: 32px; font-size: 14px; line-height: 1.65; color: #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p>Department of Computer Science &amp; Engineering</p>
      <h1>Kanpur Institute of Technology</h1>
    </div>

    ${
      isTestRedirect
        ? `<div class="banner-test">⚠️ TEST MODE ACTIVE: Outgoing mail redirected to ${testRecipient}</div>`
        : ""
    }

    <div class="content">
      ${formattedBody}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Builds the responsive HTML template matching the official public reminder wording.
 */
function buildReminderHtml(options: {
  projectName: string;
  subjectCode: string;
  lastDate: string;
  registrationLink: string;
  coordinatorName: string;
  isTestRedirect: boolean;
  testRecipient?: string;
}): string {
  const {
    projectName,
    subjectCode,
    lastDate,
    registrationLink,
    coordinatorName,
    isTestRedirect,
    testRecipient,
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Important Reminder: Registration Deadline for ${projectName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(10, 42, 94, 0.05); }
    .header { background: #0A2A5E; padding: 26px 32px; text-align: left; border-bottom: 3px solid #F59E0B; }
    .header h1 { margin: 0; color: #ffffff; font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .banner-test { background: #fef3c7; border-bottom: 1px solid #fde68a; padding: 10px 24px; font-size: 12px; color: #92400e; font-weight: 600; }
    .content { padding: 32px; font-size: 14px; line-height: 1.65; color: #334155; }
    .salutation { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
    .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .details-title { font-weight: 800; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; }
    .detail-row { margin-bottom: 8px; font-size: 13px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-label { color: #64748b; font-weight: 600; }
    .detail-value { color: #0f172a; font-weight: 700; }
    .deadline-highlight { color: #b91c1c; font-weight: 800; }
    .notice-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin: 22px 0; font-size: 13px; color: #78350f; line-height: 1.55; }
    .cta-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #0A2A5E; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 13px 30px; border-radius: 10px; box-shadow: 0 2px 6px rgba(10, 42, 94, 0.25); }
    .signature { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #475569; line-height: 1.5; }
    .signature strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p>Department of Computer Science &amp; Engineering</p>
      <h1>Kanpur Institute of Technology</h1>
    </div>

    ${
      isTestRedirect
        ? `<div class="banner-test">⚠️ TEST MODE ACTIVE: Outgoing mail redirected to ${testRecipient}</div>`
        : ""
    }

    <div class="content">
      <div class="salutation">Dear Students,</div>

      <p>
        This is an important reminder that the registration deadline for <strong>${projectName}</strong> is approaching soon. All students are required to complete their registration before the stipulated deadline.
      </p>

      <div class="details-card">
        <div class="details-title">Registration Details:</div>
        <div class="detail-row">
          <span class="detail-label">&bull; Project Name: </span>
          <span class="detail-value">${projectName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">&bull; Subject Code (Sub Code): </span>
          <span class="detail-value">${subjectCode}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">&bull; Last Date to Register: </span>
          <span class="detail-value deadline-highlight">${lastDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">&bull; Registration Link: </span>
          <span class="detail-value"><a href="${registrationLink}" target="_blank" style="color: #1E5BD8; text-decoration: underline;">${registrationLink}</a></span>
        </div>
      </div>

      <div class="cta-container">
        <a href="${registrationLink}" class="btn" target="_blank">Access Portal &amp; Submit Registration &rarr;</a>
      </div>

      <div class="notice-box">
        <strong>Important Notice:</strong> Registration is mandatory for all students. Failure to register before the deadline will be the sole responsibility of the student. The department will not be liable for any requests for assistance or exceptions arising from failure to complete the registration within the stipulated timeline.
      </div>

      <p>
        All students are advised to complete the registration process at the earliest to avoid any last-minute issues.
      </p>

      <div class="signature">
        Regards,<br>
        <strong>${coordinatorName}</strong><br>
        Department of Computer Science &amp; Engineering<br>
        Kanpur Institute of Technology
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Builds the plain text version matching the exact user specification.
 */
function buildReminderText(options: {
  projectName: string;
  subjectCode: string;
  lastDate: string;
  registrationLink: string;
  coordinatorName: string;
  isTestRedirect: boolean;
  testRecipient?: string;
}): string {
  const {
    projectName,
    subjectCode,
    lastDate,
    registrationLink,
    coordinatorName,
    isTestRedirect,
    testRecipient,
  } = options;

  return `
${isTestRedirect ? `[TEST MODE ACTIVE: Redirected to ${testRecipient}]\n\n` : ""}Dear Students,

This is an important reminder that the registration deadline for ${projectName} is approaching soon. All students are required to complete their registration before the stipulated deadline.

Registration Details:
- Project Name: ${projectName}
- Subject Code (Sub Code): ${subjectCode}
- Last Date to Register: ${lastDate}
- Registration Link: ${registrationLink}

Important Notice: Registration is mandatory for all students. Failure to register before the deadline will be the sole responsibility of the student. The department will not be liable for any requests for assistance or exceptions arising from failure to complete the registration within the stipulated timeline.

All students are advised to complete the registration process at the earliest to avoid any last-minute issues.

Regards,
${coordinatorName}
Department of Computer Science & Engineering
Kanpur Institute of Technology
  `.trim();
}

/**
 * Formats a clean date string for display (e.g. "21 Oct 2026").
 */
function formatDeadlineDisplay(rawDate?: string): string {
  if (!rawDate) return "21 Oct 2026";
  try {
    const d = new Date(rawDate);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return rawDate;
  }
}

/**
 * Dispatches public reminder emails to eligible pending students.
 *
 * Delivery Strategy:
 * - Uses BCC for multi-student cohort batches to:
 *   1. Ensure the HOD's sent box only has 1 clean email instead of 60 individual threads.
 *   2. Fully protect student privacy (recipients cannot see each other or reply-all).
 * - Records individual audit log entries for every student for 24h cooldown tracking.
 */
export async function sendReminderEmails(
  options: SendRemindersOptions
): Promise<EmailDispatchResult[]> {
  const { form, students, senderName, senderEmail, customSubject, customBody } =
    options;

  const emailMode = (process.env.EMAIL_MODE || "log").toLowerCase().trim();
  const testRecipient = (process.env.EMAIL_TEST_RECIPIENT || "").trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const projectName =
    form.title || form.customProjectName || "Mini Project Registration";
  const subjectCode = form.subjectCode || "BCS751";
  const lastDate = formatDeadlineDisplay(form.deadline);
  const coordinatorName =
    senderName || form.coordinator?.name || "Rahul Singh (HOD)";

  const defaultSubject = `[Important Reminder] Registration Deadline for ${projectName} (${subjectCode})`;
  const subject = customSubject?.trim() || defaultSubject;

  const isTestRedirect = Boolean(testRecipient);

  const textContent =
    customBody?.trim() ||
    buildReminderText({
      projectName,
      subjectCode,
      lastDate,
      registrationLink: appUrl,
      coordinatorName,
      isTestRedirect,
      testRecipient,
    });

  const htmlContent = customBody?.trim()
    ? buildCustomReminderHtml({
        customBody: customBody.trim(),
        isTestRedirect,
        testRecipient,
      })
    : buildReminderHtml({
        projectName,
        subjectCode,
        lastDate,
        registrationLink: appUrl,
        coordinatorName,
        isTestRedirect,
        testRecipient,
      });

  // If in SMTP mode, initialize transport with validation
  let transporter: Transporter | null = null;
  if (emailMode === "smtp") {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        "EMAIL_MODE is set to 'smtp' but required SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing from environment configuration."
      );
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
    });
  }

  const results: EmailDispatchResult[] = [];

  // Batch into chunks of 50 (standard SMTP recipient limit per envelope)
  const BATCH_SIZE = 50;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);

    const actualStudentEmails = batch.map(
      (s) => s.email || `${s.afn || s.rollNumber}@kit.ac.in`
    );

    // Strict Safety Guard: Never send to real @kit.ac.in student addresses during testing/development
    const safeStudentEmails = actualStudentEmails.map((email) => {
      if (email.toLowerCase().endsWith("@kit.ac.in")) {
        return testRecipient || "muditcodes@gmail.com";
      }
      return email;
    });

    // If test recipient is set, divert all BCC recipients to the test address
    const effectiveBccList = isTestRedirect
      ? [testRecipient]
      : safeStudentEmails;

    if (emailMode === "smtp" && transporter) {
      try {
        const fromHeader =
          process.env.EMAIL_FROM ||
          `"Department of Computer Science & Engineering" <${senderEmail}>`;
        const replyToHeader = process.env.EMAIL_REPLY_TO || senderEmail;

        let mailPayload: any = {
          from: fromHeader,
          replyTo: replyToHeader,
          subject,
          text: textContent,
          html: htmlContent,
        };

        if (batch.length === 1 && !isTestRedirect) {
          // Single student dispatch - redirect if kit.ac.in
          const target = actualStudentEmails[0];
          mailPayload.to = target.toLowerCase().endsWith("@kit.ac.in")
            ? (testRecipient || "muditcodes@gmail.com")
            : target;
        } else {
          // Cohort public reminder: sent to department, BCC to safe list
          mailPayload.to = fromHeader;
          mailPayload.bcc = effectiveBccList;
        }

        const info = await transporter.sendMail(mailPayload);

        for (let idx = 0; idx < batch.length; idx++) {
          const student = batch[idx];
          const actualEmail = actualStudentEmails[idx];
          results.push({
            studentId: String(student.id),
            studentAfn: student.afn,
            studentRollNumber: student.rollNumber,
            studentEmail: actualEmail,
            studentName: student.name,
            status: "sent",
            mode: "smtp",
            recipientActual: actualEmail,
            recipientEffective: isTestRedirect ? testRecipient : actualEmail,
            messageId: info.messageId,
          });
        }
      } catch (err: any) {
        for (let idx = 0; idx < batch.length; idx++) {
          const student = batch[idx];
          const actualEmail = actualStudentEmails[idx];
          results.push({
            studentId: String(student.id),
            studentAfn: student.afn,
            studentRollNumber: student.rollNumber,
            studentEmail: actualEmail,
            studentName: student.name,
            status: "failed",
            mode: "smtp",
            recipientActual: actualEmail,
            recipientEffective: isTestRedirect ? testRecipient : actualEmail,
            error: err?.message || String(err),
          });
        }
      }
    } else {
      // Default safe "log" mode
      const simulatedMessageId = `log-${Date.now()}-batch-${Math.random().toString(36).substring(2, 7)}`;

      console.log(
        `\n======================================================\n` +
          `[EMAIL_MODE=log] Public Reminder Dispatched\n` +
          `Subject: "${subject}"\n` +
          `To: ${process.env.EMAIL_FROM || senderEmail}\n` +
          `BCC (${effectiveBccList.length} recipients): ${effectiveBccList.slice(0, 5).join(", ")}${effectiveBccList.length > 5 ? ` ... +${effectiveBccList.length - 5} more` : ""}\n` +
          (isTestRedirect ? `[Redirected to test inbox: ${testRecipient}]\n` : "") +
          `Message ID: ${simulatedMessageId}\n` +
          `======================================================\n`
      );

      for (let idx = 0; idx < batch.length; idx++) {
        const student = batch[idx];
        const actualEmail = actualStudentEmails[idx];
        results.push({
          studentId: String(student.id),
          studentAfn: student.afn,
          studentRollNumber: student.rollNumber,
          studentEmail: actualEmail,
          studentName: student.name,
          status: "sent",
          mode: "log",
          recipientActual: actualEmail,
          recipientEffective: isTestRedirect ? testRecipient : actualEmail,
          messageId: simulatedMessageId,
        });
      }
    }
  }

  return results;
}

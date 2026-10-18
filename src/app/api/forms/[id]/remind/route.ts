import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedSession } from "@/lib/sessionAuth";
import { getServerPendingStudentsForForm } from "@/lib/serverForms";
import { reminderStore, ReminderLogEntry } from "@/lib/reminderStore";
import { sendReminderEmails } from "@/lib/email/sendReminderEmails";

const RemindRequestBodySchema = z.object({
  studentIds: z.array(z.string().min(1)).optional(),
  customRecipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .optional(),
  customSubject: z.string().max(250).optional(),
  customBody: z.string().max(10000).optional(),
  formMeta: z
    .object({
      id: z.string().optional(),
      subjectCode: z.string().optional(),
      title: z.string().optional(),
      course: z.string().optional(),
      stream: z.string().optional(),
      year: z.string().optional(),
      section: z.string().optional(),
      deadline: z.string().optional(),
      status: z.string().optional(),
      coordinator: z
        .object({
          name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          role: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/forms/[id]/remind
 * Returns reminder statistics, last sent timestamp, and pending count for the form.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const formId = decodeURIComponent(id);

    const formResult = await getServerPendingStudentsForForm(formId);
    if (!formResult) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    const stats = await reminderStore.getReminderStatsForForm(formResult.form.id);

    return NextResponse.json({
      formId: formResult.form.id,
      subjectCode: formResult.form.subjectCode,
      totalCohort: formResult.eligibleStudents.length,
      pendingCount: formResult.pendingStudents.length,
      submittedCount: formResult.submittedStudents.length,
      totalSent: stats.totalSent,
      lastSentAt: stats.lastSentAt,
      deadline: formResult.form.deadline,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve reminder statistics." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forms/[id]/remind
 * Dispatches reminder emails to pending students for this published form.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    // 1. Authorize: strictly HOD or COORDINATOR with valid signed session
    const session = requireAuthorizedSession(request, ["HOD", "COORDINATOR"]);

    // 2. Validate request body: strictly { studentIds?: string[], customRecipients?: ... }
    let rawBody = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        rawBody = JSON.parse(text);
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const parseResult = RemindRequestBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload. Accepts { studentIds?: string[], customRecipients?: { email, name }[] }.",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }
    const { studentIds, customRecipients, customSubject, customBody, formMeta } = parseResult.data;

    // 3. Resolve form and cohort completely server-side (auto-provisioning if not yet in forms.json)
    const { id } = await context.params;
    const formId = decodeURIComponent(id);

    const formResult = await getServerPendingStudentsForForm(formId, formMeta as any);
    if (!formResult) {
      return NextResponse.json(
        { error: `Departmental form '${formId}' was not found.` },
        { status: 404 }
      );
    }

    const { form, pendingStudents } = formResult;

    // Check status
    const statusLower = (form.status || "").toLowerCase();
    if (statusLower === "completed" || statusLower === "draft") {
      return NextResponse.json(
        {
          error: `Cannot send reminders: form status is '${form.status}'. Reminders can only be sent for Active forms.`,
        },
        { status: 400 }
      );
    }

    // Check deadline
    if (form.deadline) {
      const deadlineDate = new Date(form.deadline);
      // End of day deadline comparison
      deadlineDate.setHours(23, 59, 59, 999);
      if (Date.now() > deadlineDate.getTime()) {
        return NextResponse.json(
          {
            error: `Cannot send reminders: the submission deadline (${form.deadline}) has already expired.`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Filter target students / recipients
    let targetStudents: any[] = [];
    if (studentIds && studentIds.length > 0) {
      const idSet = new Set(studentIds.map((s) => String(s).trim().toUpperCase()));
      targetStudents = pendingStudents.filter((student) => {
        return (
          idSet.has(String(student.id)) ||
          (student.afn && idSet.has(student.afn.toUpperCase())) ||
          (student.rollNumber && idSet.has(student.rollNumber.toUpperCase()))
        );
      });
    } else if (!customRecipients || customRecipients.length === 0) {
      targetStudents = [...pendingStudents];
    }

    // Append custom/test recipients if provided
    if (customRecipients && customRecipients.length > 0) {
      for (const cr of customRecipients) {
        const cleanEmail = cr.email.trim().toLowerCase();
        if (!targetStudents.some((s) => s.email.toLowerCase() === cleanEmail)) {
          targetStudents.push({
            id: `custom-${cleanEmail}`,
            name: cr.name?.trim() || cleanEmail.split("@")[0],
            email: cleanEmail,
            afn: "CUSTOM",
            rollNumber: "TEST",
            course: form.course,
            stream: form.stream || "CSE",
            year: form.year,
            section: form.section,
            batch: "2023-2027",
            gender: "N/A",
          });
        }
      }
    }

    if (targetStudents.length === 0) {
      return NextResponse.json(
        {
          error: "No recipients selected for this reminder dispatch.",
        },
        { status: 400 }
      );
    }

    // 5. 24-hour Cooldown Enforcement (Fail-closed: if store cannot be read, throws error)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDispatch = [];
    let skippedCount = 0;

    for (const student of targetStudents) {
      const isCustomRecipient = String(student.id).startsWith("custom-");

      // Custom test recipients bypass 24h cooldown to facilitate active testing
      if (isCustomRecipient) {
        toDispatch.push(student);
        continue;
      }

      const recent = await reminderStore.getRecentReminders(
        form.id,
        String(student.id),
        twentyFourHoursAgo
      );

      if (recent.length > 0) {
        skippedCount++;
      } else {
        toDispatch.push(student);
      }
    }

    if (toDispatch.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        skipped: skippedCount,
        message:
          skippedCount === 1
            ? "This student received a reminder in the last 24 hours. Cooldown is active."
            : `All ${skippedCount} targeted students received a reminder within the last 24 hours.`,
      });
    }

    // 6. Dispatch emails
    const dispatchResults = await sendReminderEmails({
      form,
      students: toDispatch,
      senderName: session.name,
      senderEmail: session.email,
      customSubject,
      customBody,
    });

    // 7. Persist to audit log (Fail-closed: throws error if storage cannot write)
    const nowIso = new Date().toISOString();
    const logEntries: ReminderLogEntry[] = dispatchResults.map((r) => ({
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      formId: form.id,
      studentId: r.studentId,
      studentAfn: r.studentAfn,
      studentRollNumber: r.studentRollNumber,
      studentEmail: r.studentEmail,
      studentName: r.studentName,
      sentAt: nowIso,
      sentBy: session.email,
      status: r.status,
      mode: r.mode,
      recipientActual: r.recipientActual,
      recipientEffective: r.recipientEffective,
      messageId: r.messageId,
      error: r.error,
    }));

    await reminderStore.appendReminders(logEntries);

    const sentCount = dispatchResults.filter((r) => r.status === "sent").length;
    const failedCount = dispatchResults.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      lastSentAt: nowIso,
      message:
        sentCount > 0
          ? `Dispatched reminders to ${sentCount} students.` +
            (skippedCount > 0 ? ` (${skippedCount} skipped due to 24-hr cooldown)` : "")
          : "Failed to dispatch reminders.",
    });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      {
        error:
          err?.message ||
          "An unexpected server error occurred while processing student reminders.",
      },
      { status }
    );
  }
}

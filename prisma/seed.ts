import { PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning existing forms, submissions, projects, and reminder logs...");
  await prisma.submission.deleteMany();
  await prisma.project.deleteMany();
  await prisma.form.deleteMany();
  await prisma.reminderLog.deleteMany();
  console.log("Forms and projects cleared successfully.");

  console.log("Seeding real student directory into SQLite database...");
  const studentsPath = path.join(process.cwd(), "src", "data", "students.json");
  const raw = fs.readFileSync(studentsPath, "utf-8");
  const students = JSON.parse(raw);

  let count = 0;
  for (const s of students) {
    await prisma.student.upsert({
      where: { afn: String(s.afn) },
      update: {
        name: s.name,
        rollNumber: String(s.rollNumber),
        email: s.email,
        year: s.year || "4th Year",
        batch: s.batch || "2023-27",
        course: s.course || "B.Tech",
        section: s.section || "A",
        stream: s.stream || "COMPUTER SCIENCE AND ENGINEERING",
        gender: s.gender || "Male",
      },
      create: {
        afn: String(s.afn),
        rollNumber: String(s.rollNumber),
        name: s.name,
        email: s.email,
        year: s.year || "4th Year",
        batch: s.batch || "2023-27",
        course: s.course || "B.Tech",
        section: s.section || "A",
        stream: s.stream || "COMPUTER SCIENCE AND ENGINEERING",
        gender: s.gender || "Male",
      },
    });
    count++;
  }

  console.log(`Successfully seeded ${count} students into database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

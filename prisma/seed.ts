import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const english = await prisma.subject.upsert({
    where: { name: "英語" },
    update: {},
    create: { name: "英語", icon: "🇬🇧", order: 1 },
  });

  const units = [
    { name: "be動詞", nameEn: "Be Verbs", order: 1, grade: "中1" },
    { name: "一般動詞", nameEn: "General Verbs", order: 2, grade: "中1" },
    { name: "疑問詞", nameEn: "Question Words", order: 3, grade: "中1" },
    { name: "名詞・冠詞", nameEn: "Nouns & Articles", order: 4, grade: "中1" },
    { name: "代名詞", nameEn: "Pronouns", order: 5, grade: "中1" },
    { name: "形容詞・副詞", nameEn: "Adjectives & Adverbs", order: 6, grade: "中1" },
    { name: "命令文", nameEn: "Imperative Sentences", order: 7, grade: "中1" },
    { name: "三人称単数現在(三単現)", nameEn: "Third Person Singular", order: 8, grade: "中1" },
    { name: "現在進行形", nameEn: "Present Progressive", order: 9, grade: "中1" },
    { name: "過去形(規則動詞)", nameEn: "Past Tense (Regular)", order: 10, grade: "中2" },
    { name: "過去形(不規則動詞)", nameEn: "Past Tense (Irregular)", order: 11, grade: "中2" },
    { name: "過去進行形", nameEn: "Past Progressive", order: 12, grade: "中2" },
    { name: "未来表現(will/be going to)", nameEn: "Future Tense", order: 13, grade: "中2" },
    { name: "助動詞(can/must/may)", nameEn: "Modal Verbs", order: 14, grade: "中2" },
    { name: "不定詞(to + 動詞)", nameEn: "Infinitives", order: 15, grade: "中2" },
    { name: "動名詞(-ing)", nameEn: "Gerunds", order: 16, grade: "中2" },
    { name: "比較級・最上級", nameEn: "Comparatives & Superlatives", order: 17, grade: "中2" },
    { name: "接続詞(and/but/when/if)", nameEn: "Conjunctions", order: 18, grade: "中2" },
    { name: "受動態(受け身)", nameEn: "Passive Voice", order: 19, grade: "中3" },
    { name: "現在完了形", nameEn: "Present Perfect", order: 20, grade: "中3" },
    { name: "現在完了進行形", nameEn: "Present Perfect Progressive", order: 21, grade: "中3" },
    { name: "関係代名詞(who/which/that)", nameEn: "Relative Pronouns", order: 22, grade: "中3" },
    { name: "間接疑問文", nameEn: "Indirect Questions", order: 23, grade: "中3" },
    { name: "分詞の形容詞的用法", nameEn: "Participial Adjectives", order: 24, grade: "中3" },
    { name: "仮定法", nameEn: "Subjunctive Mood", order: 25, grade: "高1" },
    { name: "関係副詞(where/when/why)", nameEn: "Relative Adverbs", order: 26, grade: "高1" },
    { name: "分詞構文", nameEn: "Participial Constructions", order: 27, grade: "高1" },
    { name: "使役動詞(make/let/have)", nameEn: "Causative Verbs", order: 28, grade: "高1" },
    { name: "知覚動詞(see/hear/feel)", nameEn: "Perception Verbs", order: 29, grade: "高1" },
    { name: "強調・倒置", nameEn: "Emphasis & Inversion", order: 30, grade: "高2" },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { subjectId_order: { subjectId: english.id, order: unit.order } },
      update: { name: unit.name, nameEn: unit.nameEn, grade: unit.grade },
      create: {
        subjectId: english.id,
        name: unit.name,
        nameEn: unit.nameEn,
        order: unit.order,
        grade: unit.grade,
      },
    });
  }

  console.log(`Seed completed: 英語 subject with ${units.length} units`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

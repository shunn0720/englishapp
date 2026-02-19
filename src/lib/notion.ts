import { Client } from "@notionhq/client";

let _notion: Client | null = null;
let _databaseId: string | null = null;

function getNotion(): Client {
    if (!_notion) {
        if (!process.env.NOTION_TOKEN) {
            throw new Error("Missing NOTION_TOKEN environment variable");
        }
        _notion = new Client({
            auth: process.env.NOTION_TOKEN,
            notionVersion: "2022-06-28",
        });
    }
    return _notion;
}

function getDatabaseId(): string {
    if (!_databaseId) {
        if (!process.env.NOTION_DATABASE_ID) {
            throw new Error("Missing NOTION_DATABASE_ID environment variable");
        }
        _databaseId = process.env.NOTION_DATABASE_ID;
    }
    return _databaseId;
}

type Category = "英作文" | "単語" | "長文";

interface LogEntry {
    question: string;
    student: string;
    ai: string;
    correct: boolean;
    category: Category;
}

/**
 * Save a learning log entry to the Notion database.
 * Trims question to 200 characters if longer.
 */
export async function logToNotion(entry: LogEntry): Promise<void> {
    const notion = getNotion();
    const databaseId = getDatabaseId();

    const trimmedQuestion =
        entry.question.length > 200
            ? entry.question.slice(0, 200) + "..."
            : entry.question;

    await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
            Question: {
                title: [
                    {
                        text: {
                            content: trimmedQuestion,
                        },
                    },
                ],
            },
            Student_Answer: {
                rich_text: [
                    {
                        text: {
                            content: entry.student || "",
                        },
                    },
                ],
            },
            AI_Answer: {
                rich_text: [
                    {
                        text: {
                            content: entry.ai.length > 2000 ? entry.ai.slice(0, 2000) + "..." : entry.ai,
                        },
                    },
                ],
            },
            Correct: {
                checkbox: entry.correct,
            },
            Category: {
                select: {
                    name: entry.category,
                },
            },
            Timestamp: {
                date: {
                    start: new Date().toISOString(),
                },
            },
        },
    });
}

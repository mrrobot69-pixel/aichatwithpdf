"use server"

//import { Message } from "@/components/Chat";
import { generateLangchainCompletion } from "@/lib/langchain";
import { auth } from "@clerk/nextjs/server";
import { sql } from '@vercel/postgres';

// const FREE_LIMIT = 3; 
// const PREMIUM_LIMIT = 100;

export async function askQuestion(id: string, question: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Check message count
    const { rows: messageCount } = await sql`
        SELECT COUNT(*) 
        FROM chat_messages 
        WHERE file_id = ${id} 
        AND user_id = ${userId} 
        AND role = 'human'`;

    // Store user message
    await sql`
        INSERT INTO chat_messages (file_id, user_id, role, message)
        VALUES (${id}, ${userId}, 'human', ${question})`;

    // Generate AI response
    const reply = await generateLangchainCompletion(id, question);

    // Store AI message
    await sql`
        INSERT INTO chat_messages (file_id, user_id, role, message)
        VALUES (${id}, ${userId}, 'ai', ${reply})`;

    return { success: true, message: null };
}
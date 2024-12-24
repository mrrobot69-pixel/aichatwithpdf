import { auth } from "@clerk/nextjs/server";
import { sql } from '@vercel/postgres';
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        // Extract ID from URL
        const fileId = request.url.split('/').pop();

        const { rows } = await sql`
            SELECT id, role, message, created_at
            FROM chat_messages
            WHERE file_id = ${fileId}
            AND user_id = ${userId}
            ORDER BY created_at ASC
        `;

        return NextResponse.json({ messages: rows });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
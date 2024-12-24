import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
    try {
        const { fileId, userId, url, filename, uploadedAt, size } = await request.json();
        console.log("Received fileId:", fileId);
        
        console.log('Received file size:', size);

        await sql`
            INSERT INTO files (
                file_id,
                user_id,
                url,
                filename,
                size,
                uploaded_at
            )
            VALUES (
                ${fileId},
                ${userId},
                ${url},
                ${filename},
                ${size},
                ${uploadedAt}
            )
        `;

        return NextResponse.json({
            message: 'File metadata saved successfully'
        });

    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to save file metadata' },
            { status: 500 }
        );
    }
}
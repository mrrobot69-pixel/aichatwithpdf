import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { filename, file, userId } = await request.json();
        const blobName = `users/${userId}/${filename}`;

        const blob = await put(blobName, file, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
            
        });

        return NextResponse.json({ url: blob.url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
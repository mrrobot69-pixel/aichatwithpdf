"use client";
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { v4 as uuidv4 } from "uuid";
import { put } from '@vercel/blob';
import { generateEmbeddings } from '@/actions/generateEmbeddings';

export enum StatusText {
    UPLOADING = "Uploading file...",
    UPLOADED = "File uploaded successfully",
    SAVING = "Saving file to database...",
    GENERATING = "Generating AI Embeddings, This will only take a few seconds...",
}

export type Status = StatusText[keyof StatusText];

interface FileMetadata {
    fileId: string;
    userId: string;
    url: string;
    filename: string;
    uploadedAt: Date;
    size: number;
}

function useUpload() {
    const [progress, setProgress] = useState<number | null>(null);
    const [fileId, setFileId] = useState<string | null>(null);
    const [status, setStatus] = useState<Status | null>(null);
    const { user } = useUser();

    const saveFileMetadata = async (metadata: FileMetadata) => {
        try {
            const response = await fetch('/api/save-file-metadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
                    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
                },
                body: JSON.stringify(metadata),
            });

            if (!response.ok) {
                throw new Error('Failed to save file metadata');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving file metadata:', error);
            throw error;
        }
     };

    const handleUpload = async (file: File) => {
        if (!file || !user) return;

        console.log("Initial file size:", file.size);

        try {
            const fileIdToUploadTo = uuidv4();
            //setFileId(fileIdToUploadTo);

            // Start upload
            setStatus(StatusText.UPLOADING);
            setProgress(0);

            // Create blob filename with user ID and file ID
            const blobName = `users/${user.id}/files/${fileIdToUploadTo}/${file.name}`;

            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev === null || prev >= 90) return prev;
                    return prev + 10;
                });
            }, 500);

            // Upload to Vercel Blob
            const blob = await put(blobName, file, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            clearInterval(progressInterval);
            setProgress(100);
            setStatus(StatusText.UPLOADED);

            // Save metadata to database
            setStatus(StatusText.SAVING);
            const metadata: FileMetadata = {
                fileId: fileIdToUploadTo,
                userId: user.id,
                url: blob.url,
                filename: file.name,
                uploadedAt: new Date(),
                size: file.size
            };

            console.log("Sending metadata with size:", metadata);

            // First save metadata
            await saveFileMetadata(metadata);

            // Then generate embeddings
            setStatus(StatusText.GENERATING);
            await generateEmbeddings(fileIdToUploadTo);

            setFileId(fileIdToUploadTo);

        

        } catch (error) {
            console.error("Error uploading file:", error);
            setStatus(null);
            setProgress(null);
            // You might want to add error handling here (e.g., showing a toast message)
        }
    };

    return {
        handleUpload,
        progress,
        fileId,
        status,
    };
}

export default useUpload;
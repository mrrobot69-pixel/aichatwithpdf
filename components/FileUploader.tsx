"use client";
import React, { JSX, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CircleArrowDown,
  RocketIcon, 
  //Loader2,
  CheckCheckIcon,
  SaveIcon,
  HammerIcon
} from 'lucide-react';
import useUpload, {StatusText } from '@/hooks/useUpload';
import { useRouter} from 'next/navigation';
//import { useUser } from "@clerk/nextjs";


function FileUploader() {
  
  const { handleUpload, progress, status, fileId } = useUpload();
  const router = useRouter();
  //const { user } = useUser();

  useEffect(()=>{
    if (fileId){
      router.push(`/dashboard/file/${fileId}`);
    }

  }, [fileId, router]); 

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Use handleUpload from useUpload hook instead of custom implementation
    await handleUpload(file);
    
  }, [handleUpload]); // Add handleUpload to dependencies
  
  const statusIcons: {
    [key in StatusText]: JSX.Element;
  } ={
    [StatusText.UPLOADING]:(
      <RocketIcon className='h-20 w-20 text-indigo-600' />
    ),
    [StatusText.UPLOADED]:(
      <CheckCheckIcon className='h-20 w-20 text-indigo-600' />
    ),
    [StatusText.SAVING]:<SaveIcon className='h-20 w-20 text-indigi-600'/>,

    [StatusText.GENERATING]:(
      <HammerIcon className='h-20 w-20 text-indigo-600 animate-bounce'/>
    ),   
  }

  const { getRootProps, getInputProps, isDragActive, isFocused, isDragAccept } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024 // 10MB max file size
  });

  const uploadInProgress = progress != null && progress >= 0 && progress <= 100;

  return (
    <div className='flex flex-col gap-4 items-center max-w-7xl mx-auto'>

      {uploadInProgress && (
        <div className='mt-32 flex flex-col items-center justify-center gap-5'>
          <div className='radial-progress bg-indigo-300 text-white border-indigo-600 border-4 ${
          progress === 100 && "hidden"
        }'
        role='progressbar'
        style={{
          // @ts-expect-error Reason: The third-party library doesn't export types for this method.
          "--value": progress,
          "--size": "12rem",
          "--thickness": "1.3rem",
        }}>{progress}%
        </div>

        {/* Render Status Icon*/}
        {
          // @ts-expect-error Reason: The third-party library doesn't export types for this method.
          statusIcons[status!]
        }

        {/* @ts-expect-error Reason: The third-party library doesn't export types for this method.*/}
        <p className='text-indigo-600 animate-pulse'>{status}</p>
        </div>
      )}
      {!uploadInProgress &&(
        <div
        {...getRootProps()}
        className={`p-10 border-2 border-dashed mt-10 w-[90%] border-indigo-600 text-indigo-600 rounded-lg h-96 flex items-center justify-center ${
          isFocused || isDragAccept ? "bg-indigo-300" : "bg-indigo-100"
        }`}
      >
        <input {...getInputProps()} />

        <div className='flex flex-col items-center justify-center'>
          
            <>
              {isDragActive ? (
                <>
                  <RocketIcon className='h-20 w-20 animate-ping' />
                  <p>Drop the files here ...</p>
                </>
              ) : (
                <>
                  <CircleArrowDown className="h-20 w-20 animate-bounce" />
                  <p>Drag n drop some files here, or click to select files</p>
                </>
              )}
            </>
        </div>
      </div>
    )}
  </div>
);
}
export default FileUploader;
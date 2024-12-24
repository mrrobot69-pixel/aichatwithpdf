"use client";

import { useRouter } from "next/navigation";
import byteSize from "byte-size";
import { DownloadCloud, FileIcon } from "lucide-react";
import { Document as PDFDocument, Page } from 'react-pdf';
import { useState } from "react";
import { Button } from "./ui/button";
import { pdfjs } from 'react-pdf';
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";


// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function Document({
  id,
  name,
  size,
  downloadUrl,
}: {
  id: string;
  name: string;
  size: number;
  downloadUrl: string;
}) {
  const router = useRouter();
  
  const [numPages, setNumPages] = useState<number>();
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = async () => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  function onDocumentLoadSuccess(): void {
    setNumPages(numPages);
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col w-64 h-80 rounded-xl bg-white drop-shadow-md justify-between p-4 transition-all transform hover:scale-105 hover:bg-indigo-600 hover:text-white cursor-pointer group">
      <div
        className="flex-1"
        onClick={() => {
          router.push(`/dashboard/file/${id}`);
        }}
      >
        <div className="mb-4 h-40 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
          <PDFDocument
            file={downloadUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center">
                <FileIcon className="h-20 w-20 text-gray-400 animate-pulse" />
              </div>
            }
            error={
              <div className="flex items-center justify-center">
                <FileIcon className="h-20 w-20 text-red-400" />
              </div>
            }
          >
            {!isLoading && (
              <Page
                pageNumber={1}
                width={150}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            )}
          </PDFDocument>
        </div>

        <p className="font-semibold line-clamp-2">{name}</p>
        <p className="text-sm text-gray-500 group-hover:text-indigo-100">
          {byteSize(size).value} KB
        </p>
      </div>

      <Button 
        variant="outline" 
        onClick={handleDownload}
        className="w-full"
      >
        <DownloadCloud className="h-6 w-6 text-indigo-600" />
      </Button>
    </div>
  );
}

export default Document;
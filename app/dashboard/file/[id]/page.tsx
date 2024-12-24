import PdfView from "@/components/PdfView";
import { sql } from "@vercel/postgres";
import { auth } from "@clerk/nextjs/server";
import Chat from "@/components/Chat";

type Props = {
  params: { id: string }
}

async function ChatToFilePage({ params: { id } }: Props) {
  const { userId } = await auth();
  if (!userId) return null;

  const { rows } = await sql`
    SELECT url
    FROM files
    WHERE file_id = ${id}
    AND user_id = ${userId}
  `;

  const url = rows[0]?.url;

  return (
    <div className="grid lg:grid-cols-5 h-full overflow-hidden">
      {/* Right */}
      <div className="col-span-5 lg:col-span-2 overflow-y-auto">
        {/* Chat */}
        <Chat id={id} />
      </div>

      {/* Left */}
      <div className="col-span-5 lg:col-span-3 bg-gray-100 border-r-2 lg:border-indigo-600 lg:-order-1 overflow-auto">
        {/* PDFView */}
        <PdfView url={url} />
      </div>
    </div>
  );
}
export default ChatToFilePage;
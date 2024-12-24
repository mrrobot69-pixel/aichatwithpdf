import PlaceholderDocument from "./PlaceholderDocument";
import { auth } from "@clerk/nextjs/server";
import Document from "./Document";
import { sql } from '@vercel/postgres';

async function Documents() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  // Fetch documents and log URLs
  const { rows } = await sql`
    SELECT 
      file_id as id,
      filename as name,
      url,
      size,
      uploaded_at
    FROM files
    WHERE user_id = ${userId}
    ORDER BY uploaded_at DESC
  `;

  console.log("Database rows:", rows);
  console.log("URLs from database:", rows.map(row => row.url));

  return (
    <div className="flex flex-wrap p-5 bg-gray-100 justify-center lg:justify-start rounded-sm gap-5 max-w-7xl mx-auto">
      {rows.map((doc) => (
        <Document
          key={doc.id}
          id={doc.id}
          name={doc.name}
          size={doc.size}
          downloadUrl={doc.url}
        />
      ))}

      <PlaceholderDocument />
    </div>
  );
}

export default Documents;
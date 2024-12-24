//import { GoogleGenerativeAI } from "@google/generative-ai";
//import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";
import pineconeClient from "./pinecone";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

import { PineconeStore } from "@langchain/pinecone";

const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || "",
    modelName: "gemini-1.5-flash-002",

});

export const indexName = "chatwithpdf";

async function fetchMessagesFromDB(docId: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("User not found");

    const { rows } = await sql`
        SELECT role, message, created_at
        FROM chat_messages
        WHERE file_id = ${docId}
        AND user_id = ${userId}
        ORDER BY created_at ASC`;

    const chatHistory = rows.map((row) =>
        row.role === "human"
            ? new HumanMessage(row.message)
            : new AIMessage(row.message)
    );
    console.log(`--- fetched last ${chatHistory.length} messages successfully ---`);
    console.log(chatHistory.map((msg) => msg.content.toString()));
    
    return chatHistory;
}

export async function generateDocs(docId: string){
   //check if user is logged in
    const { userId } = await auth();

    if (!userId) {
        throw new Error("User not found");
    }

    //fetch pdf url from database
    const { rows } = await sql`
        SELECT url 
        FROM files 
        WHERE file_id = ${docId} 
        AND user_id = ${userId}
        
    `;

    //check if pdf url is valid
    if (rows.length === 0 || !rows[0].url) {
        throw new Error("PDF URL not found in database");
    }

    //fetch pdf url from database
    console.log("--- Fetching PDF URL from database... ---");
    const pdfUrl = rows[0].url;

    
    //check if pdf url is valid
    if (!pdfUrl) {
        throw new Error("PDF URL not found in database");
    } else {
        console.log("--- PDF URL fetched successfully ---");
    
    }
    //fetch pdf from url
    const response = await fetch(pdfUrl);

    //convert pdf to blob
    const data = await response.blob();
    
    //check if pdf is valid
    console.log("--- Loading PDF Document... ---");
    const Loader = new PDFLoader(new Blob([data]));
    const docs = await Loader.load();
    console.log("--- PDF Document loaded successfully ---");

    //split pdf into chunks
    const splitter = new RecursiveCharacterTextSplitter();
    const splitDocs = await splitter.splitDocuments(docs);

    console.log(`--- Split into ${splitDocs.length} parts ---`);

    return splitDocs;

}

async function namespaceExists(
    index: Index<RecordMetadata>, 
    namespace: string
)   {
    if (namespace === null) throw new Error("No namespace value provided.");
    const { namespaces } = await index.describeIndexStats();
    return namespaces?.[namespace] !== undefined; 
}

export async function generateEmbeddingsInPineconeVectorStore(docId: string) {
    const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  let pineconeVectorStore;

  // Generate embeddings (numerical representations) for the split documents
  console.log("--- Generating embeddings... ---");
  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "BAAI/bge-large-en-v1.5"  // Best for semantic search
});

  const index = await pineconeClient.index(indexName);
  const namespaceAlreadyExists = await namespaceExists(index, docId);

  if (namespaceAlreadyExists) {
    console.log(
      `--- Namespace ${docId} already exists, reusing existing embeddings... ---`
    );

    pineconeVectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: docId,
    });

    return pineconeVectorStore;
  } else {
    // If the namespace does not exist, download the PDF from firestore via the stored Download URL & generate the embeddings and store them in the Pinecone vector store
    const splitDocs = await generateDocs(docId);

    console.log(
      `--- Storing the embeddings in namespace ${docId} in the ${indexName} Pinecone vector store... ---`
    );

    //store embeddings in pinecone vector store
    pineconeVectorStore = await PineconeStore.fromDocuments(
      splitDocs,
      embeddings,
      {
        pineconeIndex: index,
        namespace: docId,
      }
    );

    return pineconeVectorStore;
  } 
}

const generateLangchainCompletion = async (docId: string, question: string) => {
  

  const pineconeVectorStore = await generateEmbeddingsInPineconeVectorStore(docId);
  
 

  if (!pineconeVectorStore) {
    throw new Error("Pinecone vector store not found");
  }
  //create a retriever to search the vector store
  console.log("--- Creating a retriever... ---");
  const retriever = pineconeVectorStore.asRetriever();

   // Fetch the chat history from the database
   const chatHistory = await fetchMessagesFromDB(docId);

    // Define a prompt template for generating search queries based on conversation history
  console.log("--- Defining a prompt template... ---");
  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    ...chatHistory, // Insert the actual chat history here

    ["user", "{input}"],
    [
      "user",
      "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
    ],
  ]);

   // Create a history-aware retriever chain that uses the model, retriever, and prompt
   console.log("--- Creating a history-aware retriever chain... ---");
   const historyAwareRetrieverChain = await createHistoryAwareRetriever({
     llm: model,
     retriever,
     rephrasePrompt: historyAwarePrompt,
   });

    // Define a prompt template for answering questions based on retrieved context
  console.log("--- Defining a prompt template for answering questions... ---");
  const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Role: You are a helpful assistant with a friendly and engaging personality.You are an expert in analyzing & summarizing documents and answering questions based on the below context provided:\n\n{context}",
    ],

    ...chatHistory, // Insert the actual chat history here

    ["user", "{input}"],
  ]);

   // Create a chain to combine the retrieved documents into a coherent response
   console.log("--- Creating a document combining chain... ---");
   const historyAwareCombineDocsChain = await createStuffDocumentsChain({
     llm: model,
     prompt: historyAwareRetrievalPrompt,
   });

   // Create the main retrieval chain that combines the history-aware retriever and document combining chains
  console.log("--- Creating the main retrieval chain... ---");
  const conversationalRetrievalChain = await createRetrievalChain({
    retriever: historyAwareRetrieverChain,
    combineDocsChain: historyAwareCombineDocsChain,
  });

  console.log("--- Running the chain with a sample conversation... ---");
  const reply = await conversationalRetrievalChain.invoke({
    chat_history: chatHistory,
    input: question,
  });

  
  // Print the result to the console
  console.log(reply.answer);
  return reply.answer;
};

// Export the model and the run function
export { model, generateLangchainCompletion };




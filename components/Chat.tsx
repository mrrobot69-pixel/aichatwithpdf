"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2Icon } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { askQuestion } from "@/actions/askQuestion";
import ChatMessage from "./ChatMessage";

export type Message = {
    id?: number;          // Changed to number for PostgreSQL
    role: "human" | "ai" | "placeholder";
    message: string;
    created_at: string;  // Changed to match Neon DB column name
}; 

function Chat({ id }: { id: string }) {
    const { user } = useUser();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isPending, startTransition] = useTransition();
    const bottomOfChatRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitialMessages = async () => {
            try {
                if (!user?.id) return;
                setLoading(true);
                const response = await fetch(`/api/chat/${id}`);
                if (!response.ok) return;
                const data = await response.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialMessages();
    }, [id, user?.id]);

    useEffect(() => {
        bottomOfChatRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const q = input;
        setInput("");

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                role: "human",
                message: q,
                created_at: new Date().toISOString(),
            },
            {
                id: Date.now() + 1,
                role: "ai",
                message: "Thinking...",
                created_at: new Date().toISOString(),
            },
        ]);

        startTransition(async () => {
            
            await askQuestion(id, q);
            
            // Fetch updated messages after response
            const response = await fetch(`/api/chat/${id}`);
            if (response.ok) {
                const data = await response.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
            }
        });
    };

    return (
        <div className='flex flex-col h-full overflow-scroll'>
            <div className='flex-1 w-full'>

                {loading ? (
                    <div className="flex items-center justify-center">
                        <Loader2Icon className="animate-spin h-20 w-20 text-indigo-600 mt-20" />
                    </div>

                ) :(
                    <div className="p-5">
                   {messages.length === 0 && (
                        <ChatMessage
                        key={"placeholder"}
                        message={{
                            role: "ai",
                            message: "Ask me anything about the document!",
                            created_at: new Date().toISOString(),
                        }}
                        />
                    )}
                     {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            <div ref={bottomOfChatRef} />
          </div>
        )}
      </div>

                <form
                    onSubmit={handleSubmit}
                    className='flex sticky bottom-0 space-x-2 p-5 bg-indigo-600/75'
                >
                    <Input 
                        className="bg-white text-black placeholder:text-black"
                        placeholder='Ask a question...'
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <Button type="submit" disabled={!input || isPending}>
                        {isPending ? (
                            <Loader2Icon className='animate-spin text-indigo-600'/>
                        ) : (
                            "Ask"
                        )}
                    </Button>
                </form>
            
        </div>
    );
}

export default Chat;
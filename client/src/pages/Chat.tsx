import { useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "../components/NavBar";
import { getWorkspace } from "../api/workspaces";
import { askQuestion, getChatHistory, ChatMessage, Citation } from "../api/chat";

function CitationChip({ citation, onSelect }: { citation: Citation; onSelect: (c: Citation) => void }) {
  return (
    <button
      onClick={() => onSelect(citation)}
      className="font-mono text-[11px] px-2 py-1 rounded border border-line bg-white hover:border-accent hover:text-accent transition-colors"
      title="View source excerpt"
    >
      {citation.filename}
      {citation.pageNumber ? ` · p.${citation.pageNumber}` : ""}
    </button>
  );
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => getWorkspace(id!),
    enabled: !!id
  });

  const { data: history } = useQuery({
    queryKey: ["chat-history", id],
    queryFn: () => getChatHistory(id!),
    enabled: !!id
  });

  const askMutation = useMutation({
    mutationFn: (q: string) => askQuestion(id!, q),
    onSuccess: () => {
      setQuestion("");
      queryClient.invalidateQueries({ queryKey: ["chat-history", id] });
    }
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (question.trim()) askMutation.mutate(question.trim());
  }

  const ordered = history ? [...history].reverse() : [];

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex-1 flex flex-col">
        <h1 className="font-display text-xl text-ink mb-1">{workspace?.name}</h1>
        <p className="text-sm text-ink/50 mb-6">Answers are grounded only in your uploaded documents.</p>

        <div className="flex-1 space-y-6 mb-6">
          {ordered.length === 0 && (
            <div className="card p-8 text-center text-sm text-ink/40">
              Ask your first question below.
            </div>
          )}

          {ordered.map((msg: ChatMessage) => (
            <div key={msg._id} className="space-y-2">
              <div className="flex justify-end">
                <div className="bg-ink text-white text-sm rounded-md px-4 py-2 max-w-[80%]">
                  {msg.question}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="card px-4 py-3 max-w-[85%] space-y-2">
                  <p className="text-sm text-ink">{msg.answer}</p>
                  {msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.citations.map((c) => (
                        <CitationChip key={c.chunkId} citation={c} onSelect={setActiveCitation} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {askMutation.isPending && (
            <div className="flex justify-start">
              <div className="card px-4 py-3 text-sm text-ink/40 font-mono">Thinking…</div>
            </div>
          )}
          {askMutation.isError && (
            <p className="text-sm text-rust">{(askMutation.error as Error).message}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 sticky bottom-6">
          <input
            className="input"
            placeholder="Ask a question about your documents…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={askMutation.isPending}>
            Ask
          </button>
        </form>
      </main>

      {activeCitation && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6"
          onClick={() => setActiveCitation(null)}
        >
          <div className="card max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <p className="label mb-2">
              {activeCitation.filename}
              {activeCitation.pageNumber ? ` · page ${activeCitation.pageNumber}` : ""}
            </p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{activeCitation.excerpt}</p>
            <button onClick={() => setActiveCitation(null)} className="btn-secondary mt-4">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

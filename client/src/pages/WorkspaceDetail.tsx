import { useRef, useState, ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "../components/NavBar";
import { StatusBadge } from "../components/StatusBadge";
import { getWorkspace } from "../api/workspaces";
import { listDocuments, uploadDocument, deleteDocument, WorkspaceDocument } from "../api/documents";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => getWorkspace(id!),
    enabled: !!id
  });

  const { data: documents } = useQuery({
    queryKey: ["documents", id],
    queryFn: () => listDocuments(id!),
    enabled: !!id,
    // Poll while any document is still processing — this is the "check status
    // until ready" pattern instead of WebSockets/SSE, per the project brief.
    refetchInterval: (query) => {
      const docs = query.state.data as WorkspaceDocument[] | undefined;
      const stillProcessing = docs?.some((d) => d.status === "processing");
      return stillProcessing ? 3000 : false;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(id!, file),
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["documents", id] });
    },
    onError: (err: Error) => setUploadError(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => deleteDocument(docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", id] })
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  const readyCount = documents?.filter((d) => d.status === "ready").length ?? 0;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl text-ink">{workspace?.name ?? "Workspace"}</h1>
          <Link
            to={`/workspaces/${id}/chat`}
            className={`btn-primary ${readyCount === 0 ? "opacity-40 pointer-events-none" : ""}`}
          >
            Ask questions →
          </Link>
        </div>
        <p className="text-sm text-ink/50 mb-8">
          {readyCount > 0
            ? `${readyCount} document${readyCount === 1 ? "" : "s"} ready to query.`
            : "Upload a document to begin."}
        </p>

        <div className="card p-6 mb-8">
          <p className="label mb-3">Upload document</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.md,.txt"
            onChange={handleFileChange}
            className="text-sm"
          />
          <p className="text-xs text-ink/40 mt-2">PDF, DOCX, Markdown, or TXT.</p>
          {uploadMutation.isPending && <p className="text-sm text-accent mt-2">Uploading…</p>}
          {uploadError && <p className="text-sm text-rust mt-2">{uploadError}</p>}
        </div>

        <p className="label mb-3">Documents</p>
        <div className="card divide-y divide-line">
          {documents && documents.length > 0 ? (
            documents.map((doc) => (
              <div key={doc._id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{doc.originalName}</p>
                  <p className="text-xs text-ink/40 mt-0.5">
                    {formatBytes(doc.size)} · uploaded {new Date(doc.uploadedAt).toLocaleString()}
                  </p>
                  {doc.status === "failed" && doc.errorMessage && (
                    <p className="text-xs text-rust mt-1">{doc.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={doc.status} />
                  <button
                    onClick={() => deleteMutation.mutate(doc._id)}
                    className="text-xs text-ink/40 hover:text-rust"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-6 text-sm text-ink/40 text-center">No documents uploaded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

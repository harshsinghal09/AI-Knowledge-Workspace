import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "../components/NavBar";
import { listWorkspaces, createWorkspace, deleteWorkspace, Workspace } from "../api/workspaces";

export default function Workspaces() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: listWorkspaces
  });

  const createMutation = useMutation({
    mutationFn: (n: string) => createWorkspace(n),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) createMutation.mutate(name.trim());
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl text-ink mb-1">Workspaces</h1>
        <p className="text-sm text-ink/50 mb-8">Organize documents by topic — College, Placement, Research, or anything else.</p>

        <form onSubmit={handleCreate} className="flex gap-2 mb-8 max-w-md">
          <input
            className="input"
            placeholder="New workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
        </form>

        {isLoading ? (
          <p className="text-sm text-ink/40 font-mono">Loading workspaces…</p>
        ) : workspaces && workspaces.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((w: Workspace) => (
              <div key={w._id} className="card p-5 flex flex-col justify-between">
                <div>
                  <p className="font-display text-lg text-ink">{w.name}</p>
                  <p className="label mt-1">Created {new Date(w.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Link to={`/workspaces/${w._id}`} className="text-sm text-accent font-medium hover:underline">
                    Open →
                  </Link>
                  <button
                    onClick={() => deleteMutation.mutate(w._id)}
                    className="text-xs text-ink/40 hover:text-rust"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-sm text-ink/50">No workspaces yet. Create one above to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}

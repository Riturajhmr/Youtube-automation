"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Star, StarOff, Workflow as WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowModal } from "@/components/WorkflowModal";
import {
  deleteWorkflow,
  listWorkflows,
  setDefaultWorkflow,
} from "@/lib/api";
import type { Workflow } from "@/types/workflow";

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ------------------------------------------------------------------ //
// Workflow Card
// ------------------------------------------------------------------ //

interface WorkflowCardProps {
  workflow: Workflow;
  onEdit: (workflow: Workflow) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isPending: boolean;
}

function WorkflowCard({ workflow, onEdit, onDelete, onSetDefault, isPending }: WorkflowCardProps) {
  const [confirming, setConfirming] = useState(false);

  const handleDeleteClick = () => {
    if (confirming) {
      onDelete(workflow.id);
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      {/* Top: name + default badge */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{workflow.name}</h3>
            {workflow.is_default && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex-shrink-0">
                <Star className="w-3 h-3" aria-hidden="true" />
                Default
              </span>
            )}
          </div>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{workflow.description}</p>
          )}
        </div>
      </div>

      {/* Config summary */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
          {workflow.config.privacy}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
          {workflow.config.content_type}
        </span>
        {workflow.config.made_for_kids && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            kids
          </span>
        )}
        {workflow.config.ai_disclosure === "contains_ai" && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            AI content
          </span>
        )}
      </div>

      {/* Created date */}
      <p className="text-xs text-muted-foreground/60">
        Created {formatDate(workflow.created_at)}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-xs h-8"
          onClick={() => onEdit(workflow)}
          disabled={isPending}
        >
          <Pencil className="w-3 h-3" aria-hidden="true" />
          Edit
        </Button>

        {!workflow.is_default && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs h-8"
            onClick={() => onSetDefault(workflow.id)}
            disabled={isPending}
          >
            <StarOff className="w-3 h-3" aria-hidden="true" />
            Set Default
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant={confirming ? "destructive" : "outline"}
          className="gap-1.5 text-xs h-8 px-3"
          onClick={handleDeleteClick}
          onBlur={() => setConfirming(false)}
          disabled={isPending}
          aria-label={confirming ? "Confirm delete" : "Delete workflow"}
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
          {confirming ? "Confirm" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Loading skeleton
// ------------------------------------------------------------------ //

function WorkflowCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 animate-pulse space-y-3">
      <div className="h-5 w-2/3 bg-zinc-800 rounded" />
      <div className="h-4 w-full bg-zinc-800 rounded" />
      <div className="h-4 w-1/3 bg-zinc-800 rounded" />
      <div className="h-8 w-full bg-zinc-800 rounded mt-2" />
    </div>
  );
}

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    const result = await listWorkflows();
    setIsLoading(false);
    if (result.ok) {
      setWorkflows(result.data.items);
    } else {
      setFetchError(result.error.detail ?? "Failed to load workflows.");
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreate = () => {
    setEditingWorkflow(null);
    setModalOpen(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setModalOpen(true);
  };

  const handleSaved = (saved: Workflow) => {
    setWorkflows((prev) => {
      const idx = prev.findIndex((w) => w.id === saved.id);
      let updated: Workflow[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = saved;
      } else {
        updated = [saved, ...prev];
      }
      // If saved is default, clear default from others
      if (saved.is_default) {
        updated = updated.map((w) => (w.id === saved.id ? w : { ...w, is_default: false }));
      }
      return updated;
    });
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    setPendingId(id);
    const result = await deleteWorkflow(id);
    setPendingId(null);
    if (result.ok) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const handleSetDefault = async (id: string) => {
    setPendingId(id);
    const result = await setDefaultWorkflow(id);
    setPendingId(null);
    if (result.ok) {
      setWorkflows((prev) =>
        prev.map((w) => ({ ...w, is_default: w.id === id }))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">My Workflows</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Save reusable publishing configurations to pre-fill your publish settings.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleCreate}
          className="gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Workflow
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WorkflowCardSkeleton />
          <WorkflowCardSkeleton />
        </div>
      ) : fetchError ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center space-y-3">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button type="button" variant="outline" size="sm" onClick={fetchWorkflows}>
            Try Again
          </Button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-14 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
            <WorkflowIcon className="w-6 h-6 text-zinc-500" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No workflows yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Create your first workflow to save publishing settings you use often.
            </p>
          </div>
          <Button type="button" onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Create Workflow
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((w) => (
            <WorkflowCard
              key={w.id}
              workflow={w}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              isPending={pendingId === w.id}
            />
          ))}
        </div>
      )}

      <WorkflowModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialWorkflow={editingWorkflow}
        onSaved={handleSaved}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEstateSchema } from "@/lib/validations/estate";
import { AddressAutocomplete } from "@/components/address-autocomplete";

interface FieldErrors {
  name?: string;
  address?: string;
  clientName?: string;
  notes?: string;
}

export function CreateEstateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: (formData.get("name") as string) || undefined,
      address: formData.get("address") as string,
      clientName: (formData.get("clientName") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    const parsed = createEstateSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/estates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json();
        setServerError(body.error || "Something went wrong");
        return;
      }

      const estate = await res.json();
      router.push(`/estates/${estate.id}`);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" data-1p-ignore className="space-y-4">
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-text-primary">
          Address <span className="text-accent">*</span>
        </label>
        <AddressAutocomplete
          name="address"
          id="address"
          placeholder="e.g. 123 Main St, Springfield"
          inputClassName="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        {errors.address && <p className="mt-1 text-sm text-red-400">{errors.address}</p>}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text-primary">
          Estate Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          data-1p-ignore
          className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          placeholder="Added later is fine"
        />
      </div>

      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-text-primary">
          Client Name
        </label>
        <input
          id="clientName"
          name="clientName"
          type="text"
          data-1p-ignore
          className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          placeholder="e.g. Jane Doe"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-text-primary">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          data-1p-ignore
          className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          placeholder="Any additional details..."
        />
      </div>

      {serverError && (
        <p className="text-sm text-red-400">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Estate"}
      </button>
    </form>
  );
}

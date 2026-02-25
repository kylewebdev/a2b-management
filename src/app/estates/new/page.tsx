import { Shell } from "@/components/shell";
import { CreateEstateForm } from "./create-estate-form";

export default function NewEstatePage() {
  return (
    <Shell>
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold">New Estate</h1>
        <div className="mt-6">
          <CreateEstateForm />
        </div>
      </div>
    </Shell>
  );
}

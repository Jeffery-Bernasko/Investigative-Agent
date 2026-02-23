import { DashboardShell } from "@/components/layout";
import { InvestigateForm } from "@/components/investigation/investigate-form";

export default function InvestigationPage() {
  return (
    <DashboardShell>
      <div className="p-6 max-w-6xl mx-auto">
        <InvestigateForm />
      </div>
    </DashboardShell>
  );
}
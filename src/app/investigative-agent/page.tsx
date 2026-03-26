import { DashboardShell } from "@/components/layout";
import { InvestigativeAgentForm } from "@/components/investigation/investigative-agent-form";

export default function InvestigativeAgentPage() {
  return (
    <DashboardShell>
      <div className="p-6 max-w-4xl mx-auto">
        <InvestigativeAgentForm />
      </div>
    </DashboardShell>
  );
}

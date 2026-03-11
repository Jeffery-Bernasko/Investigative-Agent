import { DashboardShell } from "@/components/layout";
import { InvestigateForm } from "@/components/investigation/investigate-form";

export default function InvestigationPage() {
  return (
    <DashboardShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Autonomous Investigation
          </h1>
          <p className="text-gray-400">
            Powered by AI - Just describe what you want to investigate
          </p>
        </div>

        <InvestigateForm />

        {/* Examples */}
        <div className="glass-panel rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-3">Example Queries</h3>
          <div className="space-y-2 text-sm">
            <div className="text-gray-400">
              <span className="text-primary">→</span> "Investigate @elonmusk"
            </div>
            <div className="text-gray-400">
              <span className="text-primary">→</span> "Analyze tesla.com"
            </div>
            <div className="text-gray-400">
              <span className="text-primary">→</span> "Check john@example.com for breaches"
            </div>
            <div className="text-gray-400">
              <span className="text-primary">→</span> "Deep dive on SpaceX"
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
import { AccountView } from "@neondatabase/neon-js/auth/react";
import { accountViewPaths } from "@neondatabase/neon-js/auth/react/ui/server";
import { Sidebar } from "@/components/layout/sidebar";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container p-6 md:p-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-text-secondary">
              Manage your profile, security settings, and preferences
            </p>
          </div>

          {/* Account View from Neon Auth */}
          <div className="glass-panel rounded-2xl p-6 border border-glass-border">
            <AccountView path={path} />
          </div>
        </div>
      </main>

      {/* Custom styles for account view */}
      <style dangerouslySetInnerHTML={{
        __html: `
        [data-neon-auth] {
          --neon-auth-primary: #00ff41;
          --neon-auth-primary-foreground: #000000;
          --neon-auth-background: transparent;
          --neon-auth-foreground: #ffffff;
          --neon-auth-muted: rgba(255, 255, 255, 0.06);
          --neon-auth-muted-foreground: #8b8b8b;
          --neon-auth-border: rgba(255, 255, 255, 0.1);
          --neon-auth-input: rgba(255, 255, 255, 0.03);
          --neon-auth-ring: rgba(0, 255, 65, 0.5);
          --neon-auth-radius: 0.75rem;
        }

        [data-neon-auth] input {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }

        [data-neon-auth] input:focus {
          border-color: rgba(0, 255, 65, 0.5) !important;
          box-shadow: 0 0 0 2px rgba(0, 255, 65, 0.1) !important;
        }

        [data-neon-auth] button[type="submit"] {
          background: linear-gradient(135deg, #00ff41 0%, #00cc34 100%) !important;
          color: black !important;
          font-weight: 600 !important;
        }

        [data-neon-auth] button:not([type="submit"]) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }

        [data-neon-auth] label {
          color: #8b8b8b !important;
        }

        [data-neon-auth] a {
          color: #00ff41 !important;
        }
      `}} />
    </div>
  );
}



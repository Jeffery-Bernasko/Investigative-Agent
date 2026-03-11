"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function TrackingRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const code = params.code as string;

  useEffect(() => {
    if (!code) return;

    const recordClickAndRedirect = async () => {
      try {
        // Collect additional client-side data
        const screenResolution = `${window.screen.width}x${window.screen.height}`;

        const response = await fetch(`/api/tracking/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screenResolution }),
        });

        const data = await response.json();

        if (data.destinationUrl) {
          // Redirect to destination
          window.location.href = data.destinationUrl;
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error("Tracking failed:", err);
        setError("Failed to process link");
      }
    };

    recordClickAndRedirect();
  }, [code]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 max-w-md">
          <h1 className="text-xl font-bold text-white mb-4">Link Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}



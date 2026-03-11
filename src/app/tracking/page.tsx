"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Copy,
  Check,
  Trash2,
  Eye,
  Plus,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  BarChart3,
  ExternalLink,
  X,
  Loader2,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";

interface TrackingLink {
  id: number;
  code: string;
  name: string;
  destinationUrl: string;
  status: string;
  clickCount: number;
  lastClickAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface TrackingClick {
  id: number;
  ipAddress: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  deviceType: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  clickedAt: string;
}

export default function TrackingPage() {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [stats, setStats] = useState({ totalLinks: 0, totalClicks: 0, activeLinks: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<TrackingLink | null>(null);
  const [clickData, setClickData] = useState<TrackingClick[]>([]);
  const [clickStats, setClickStats] = useState<Record<string, unknown> | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create form state
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await fetch("/api/tracking");
      const data = await response.json();
      setLinks(data.links || []);
      setStats(data.stats || { totalLinks: 0, totalClicks: 0, activeLinks: 0 });
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setLoading(false);
    }
  };

  const createLink = async () => {
    if (!newLinkUrl) return;
    setCreating(true);

    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLinkName || undefined,
          destinationUrl: newLinkUrl,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLinks((prev) => [data.link, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalLinks: prev.totalLinks + 1,
          activeLinks: prev.activeLinks + 1,
        }));
        setShowCreateModal(false);
        setNewLinkName("");
        setNewLinkUrl("");
      }
    } catch (error) {
      console.error("Failed to create link:", error);
    } finally {
      setCreating(false);
    }
  };

  const deleteLink = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tracking link?")) return;

    try {
      await fetch(`/api/tracking?id=${id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== id));
      setStats((prev) => ({
        ...prev,
        totalLinks: prev.totalLinks - 1,
      }));
    } catch (error) {
      console.error("Failed to delete link:", error);
    }
  };

  const viewLinkDetails = async (link: TrackingLink) => {
    setSelectedLink(link);
    try {
      const response = await fetch(`/api/tracking/${link.code}`);
      const data = await response.json();
      setClickData(data.clicks || []);
      setClickStats(data.stats || null);
    } catch (error) {
      console.error("Failed to fetch click data:", error);
    }
  };

  const copyTrackingUrl = (code: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${baseUrl}/t/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      case "tablet":
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Link2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tracking Links</h1>
              <p className="text-sm text-gray-400">
                Generate and manage tracking links to collect visitor intelligence
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Link
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Total Links", value: stats.totalLinks, icon: Link2 },
            { label: "Total Clicks", value: stats.totalClicks, icon: BarChart3 },
            { label: "Active Links", value: stats.activeLinks, icon: Globe },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Capabilities Info */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            What We Collect
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              "IP Address",
              "Geolocation",
              "Device Type",
              "Browser",
              "Operating System",
              "Referrer URL",
              "Click Timestamp",
              "VPN/Proxy Detection",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-gray-300"
              >
                <Check className="w-4 h-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Links List */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Your Links</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            </div>
          ) : links.length === 0 ? (
            <div className="p-12 text-center">
              <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No tracking links yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-primary hover:text-primary/80"
              >
                Create your first link
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        link.status === "active" ? "bg-green-500" : "bg-gray-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-white">{link.name}</p>
                      <p className="text-sm text-gray-500 font-mono">
                        /t/{link.code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{link.clickCount}</p>
                      <p className="text-xs text-gray-500">Clicks</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyTrackingUrl(link.code)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title="Copy link"
                      >
                        {copiedCode === link.code ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      <button
                        onClick={() => viewLinkDetails(link)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>

                      <a
                        href={link.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title="Visit destination"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>

                      <button
                        onClick={() => deleteLink(link.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md p-6 rounded-2xl bg-[#0a0a0a] border border-white/10"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Create Tracking Link</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Link Name (optional)
                    </label>
                    <input
                      type="text"
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                      placeholder="e.g., Twitter Campaign"
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-primary/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Destination URL *
                    </label>
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-primary/50 transition-all"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <p className="text-xs text-gray-400">
                        When someone clicks this link, we will collect their IP address,
                        device information, and location before redirecting them to the
                        destination URL.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={createLink}
                    disabled={creating || !newLinkUrl}
                    className="w-full py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Create Link
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details Modal */}
        <AnimatePresence>
          {selectedLink && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedLink(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[80vh] overflow-y-auto p-6 rounded-2xl bg-[#0a0a0a] border border-white/10"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedLink.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">
                      /t/{selectedLink.code}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLink(null)}
                    className="p-2 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Stats Grid */}
                {clickStats && (
                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-white/5">
                      <p className="text-sm text-gray-400">Total Clicks</p>
                      <p className="text-2xl font-bold text-white">
                        {(clickStats as { totalClicks?: number }).totalClicks || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                      <p className="text-sm text-gray-400">Unique Visitors</p>
                      <p className="text-2xl font-bold text-white">
                        {(clickStats as { uniqueVisitors?: number }).uniqueVisitors || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                      <p className="text-sm text-gray-400">VPN Detected</p>
                      <p className="text-2xl font-bold text-white">
                        {(clickStats as { vpnDetected?: number }).vpnDetected || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                      <p className="text-sm text-gray-400">Tor Detected</p>
                      <p className="text-2xl font-bold text-white">
                        {(clickStats as { torDetected?: number }).torDetected || 0}
                      </p>
                    </div>
                  </div>
                )}

                {/* Click Data Table */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                          IP Address
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                          Device
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                          Time
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                          Flags
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {clickData.map((click) => (
                        <tr key={click.id} className="hover:bg-white/5">
                          <td className="px-4 py-3 font-mono text-sm text-white">
                            {click.ipAddress || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              {click.city && click.country
                                ? `${click.city}, ${click.country}`
                                : "Unknown"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(click.deviceType)}
                              {click.browser} / {click.os}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              {new Date(click.clickedAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-1">
                              {click.isVpn && (
                                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                                  VPN
                                </span>
                              )}
                              {click.isProxy && (
                                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">
                                  Proxy
                                </span>
                              )}
                              {click.isTor && (
                                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">
                                  Tor
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {clickData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No clicks recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}

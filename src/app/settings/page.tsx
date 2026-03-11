"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Key,
  Brain,
  Shield,
  Globe,
  Database,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Server,
  Lock,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";

interface SettingsFormData {
  // Azure OpenAI / Microsoft Foundry
  azureEndpoint: string;
  azureApiKey: string;
  azureDeploymentName: string;
  azureEmbeddingDeployment: string;
  azureApiVersion: string;

  // OpenAI Direct (fallback)
  openaiApiKey: string;

  // OSINT APIs
  hunterApiKey: string;
  shodanApiKey: string;
  virusTotalApiKey: string;
  hibpApiKey: string;

  // Tracking
  ipinfoToken: string;

  // Preferences
  defaultAiModel: string;
  darkMode: boolean;
  notifications: boolean;
}

const defaultSettings: SettingsFormData = {
  azureEndpoint: "",
  azureApiKey: "",
  azureDeploymentName: "",
  azureEmbeddingDeployment: "",
  azureApiVersion: "2024-02-15-preview",
  openaiApiKey: "",
  hunterApiKey: "",
  shodanApiKey: "",
  virusTotalApiKey: "",
  hibpApiKey: "",
  ipinfoToken: "",
  defaultAiModel: "gpt-4",
  darkMode: true,
  notifications: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsFormData>(defaultSettings);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, "success" | "error" | null>>({});
  const [activeTab, setActiveTab] = useState<"ai" | "osint" | "tracking" | "preferences">("ai");

  useEffect(() => {
    // Load settings from API
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (service: string) => {
    setTesting((prev) => ({ ...prev, [service]: true }));
    setTestResults((prev) => ({ ...prev, [service]: null }));

    try {
      const response = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, settings }),
      });

      const result = await response.json();
      setTestResults((prev) => ({
        ...prev,
        [service]: result.success ? "success" : "error",
      }));
    } catch {
      setTestResults((prev) => ({ ...prev, [service]: "error" }));
    } finally {
      setTesting((prev) => ({ ...prev, [service]: false }));
    }
  };

  const toggleShowApiKey = (key: string) => {
    setShowApiKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateSetting = (key: keyof SettingsFormData, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: "ai", label: "AI Configuration", icon: Brain },
    { id: "osint", label: "OSINT APIs", icon: Shield },
    { id: "tracking", label: "Tracking", icon: Globe },
    { id: "preferences", label: "Preferences", icon: Settings },
  ] as const;

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-gray-400">
                Configure your API keys and preferences
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveStatus === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : saveStatus === "error" ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : saveStatus === "success" ? "Saved!" : "Save Changes"}
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {activeTab === "ai" && (
            <>
              {/* Microsoft Foundry / Azure OpenAI */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Microsoft Foundry / Azure OpenAI
                    </h2>
                    <p className="text-sm text-gray-400">
                      Configure your Azure OpenAI deployment for AI features
                    </p>
                  </div>
                  <a
                    href="https://ai.azure.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid gap-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Azure Endpoint
                      </label>
                      <input
                        type="text"
                        value={settings.azureEndpoint}
                        onChange={(e) => updateSetting("azureEndpoint", e.target.value)}
                        placeholder="https://your-resource.openai.azure.com"
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        API Version
                      </label>
                      <select
                        value={settings.azureApiVersion}
                        onChange={(e) => updateSetting("azureApiVersion", e.target.value)}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      >
                        <option value="2024-02-15-preview">2024-02-15-preview</option>
                        <option value="2024-05-01-preview">2024-05-01-preview</option>
                        <option value="2024-08-01-preview">2024-08-01-preview</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeys.azureApiKey ? "text" : "password"}
                        value={settings.azureApiKey}
                        onChange={(e) => updateSetting("azureApiKey", e.target.value)}
                        placeholder="Enter your Azure OpenAI API key"
                        className="w-full px-4 py-3 pr-12 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowApiKey("azureApiKey")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showApiKeys.azureApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Chat Deployment Name
                      </label>
                      <input
                        type="text"
                        value={settings.azureDeploymentName}
                        onChange={(e) => updateSetting("azureDeploymentName", e.target.value)}
                        placeholder="gpt-4o"
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Embedding Deployment Name
                      </label>
                      <input
                        type="text"
                        value={settings.azureEmbeddingDeployment}
                        onChange={(e) => updateSetting("azureEmbeddingDeployment", e.target.value)}
                        placeholder="text-embedding-ada-002"
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => testConnection("azure")}
                      disabled={testing.azure || !settings.azureEndpoint || !settings.azureApiKey}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 transition-all"
                    >
                      {testing.azure ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : testResults.azure === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : testResults.azure === "error" ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Server className="w-4 h-4" />
                      )}
                      Test Connection
                    </button>
                  </div>
                </div>
              </div>

              {/* OpenAI Direct (Fallback) */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Brain className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      OpenAI Direct (Fallback)
                    </h2>
                    <p className="text-sm text-gray-400">
                      Used when Azure OpenAI is not configured
                    </p>
                  </div>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    OpenAI API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKeys.openaiApiKey ? "text" : "password"}
                      value={settings.openaiApiKey}
                      onChange={(e) => updateSetting("openaiApiKey", e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-3 pr-12 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey("openaiApiKey")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKeys.openaiApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "osint" && (
            <div className="space-y-6">
              {/* Hunter.io */}
              <ApiKeyCard
                title="Hunter.io"
                description="Email intelligence and verification"
                icon={<Database className="w-5 h-5 text-orange-400" />}
                iconBg="bg-orange-500/20"
                apiKey={settings.hunterApiKey}
                onChange={(value) => updateSetting("hunterApiKey", value)}
                show={showApiKeys.hunterApiKey}
                onToggle={() => toggleShowApiKey("hunterApiKey")}
                externalUrl="https://hunter.io/api"
                testing={testing.hunter}
                testResult={testResults.hunter}
                onTest={() => testConnection("hunter")}
              />

              {/* Shodan */}
              <ApiKeyCard
                title="Shodan"
                description="Internet device intelligence"
                icon={<Globe className="w-5 h-5 text-red-400" />}
                iconBg="bg-red-500/20"
                apiKey={settings.shodanApiKey}
                onChange={(value) => updateSetting("shodanApiKey", value)}
                show={showApiKeys.shodanApiKey}
                onToggle={() => toggleShowApiKey("shodanApiKey")}
                externalUrl="https://developer.shodan.io/"
                testing={testing.shodan}
                testResult={testResults.shodan}
                onTest={() => testConnection("shodan")}
              />

              {/* VirusTotal */}
              <ApiKeyCard
                title="VirusTotal"
                description="Malware and URL analysis"
                icon={<Shield className="w-5 h-5 text-purple-400" />}
                iconBg="bg-purple-500/20"
                apiKey={settings.virusTotalApiKey}
                onChange={(value) => updateSetting("virusTotalApiKey", value)}
                show={showApiKeys.virusTotalApiKey}
                onToggle={() => toggleShowApiKey("virusTotalApiKey")}
                externalUrl="https://www.virustotal.com/gui/my-apikey"
                testing={testing.virustotal}
                testResult={testResults.virustotal}
                onTest={() => testConnection("virustotal")}
              />

              {/* Have I Been Pwned */}
              <ApiKeyCard
                title="Have I Been Pwned"
                description="Data breach intelligence"
                icon={<Lock className="w-5 h-5 text-yellow-400" />}
                iconBg="bg-yellow-500/20"
                apiKey={settings.hibpApiKey}
                onChange={(value) => updateSetting("hibpApiKey", value)}
                show={showApiKeys.hibpApiKey}
                onToggle={() => toggleShowApiKey("hibpApiKey")}
                externalUrl="https://haveibeenpwned.com/API/Key"
                testing={testing.hibp}
                testResult={testResults.hibp}
                onTest={() => testConnection("hibp")}
              />
            </div>
          )}

          {activeTab === "tracking" && (
            <div className="space-y-6">
              {/* IPInfo */}
              <ApiKeyCard
                title="IPInfo.io"
                description="IP geolocation and intelligence"
                icon={<Globe className="w-5 h-5 text-cyan-400" />}
                iconBg="bg-cyan-500/20"
                apiKey={settings.ipinfoToken}
                onChange={(value) => updateSetting("ipinfoToken", value)}
                show={showApiKeys.ipinfoToken}
                onToggle={() => toggleShowApiKey("ipinfoToken")}
                externalUrl="https://ipinfo.io/account/token"
                testing={testing.ipinfo}
                testResult={testResults.ipinfo}
                onTest={() => testConnection("ipinfo")}
              />

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Tracking Capabilities
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: "IP Address", enabled: true },
                    { label: "Geolocation", enabled: !!settings.ipinfoToken },
                    { label: "Device Type", enabled: true },
                    { label: "Browser", enabled: true },
                    { label: "Operating System", enabled: true },
                    { label: "Referrer URL", enabled: true },
                    { label: "ISP Detection", enabled: !!settings.ipinfoToken },
                    { label: "VPN/Proxy Detection", enabled: !!settings.ipinfoToken },
                  ].map((cap) => (
                    <div
                      key={cap.label}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        cap.enabled ? "bg-primary/10" : "bg-white/5"
                      }`}
                    >
                      {cap.enabled ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-500" />
                      )}
                      <span
                        className={cap.enabled ? "text-white" : "text-gray-500"}
                      >
                        {cap.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-6">
                  AI Model Preferences
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default AI Model
                  </label>
                  <select
                    value={settings.defaultAiModel}
                    onChange={(e) => updateSetting("defaultAiModel", e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-6">
                  Application Preferences
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 rounded-lg bg-black/20 cursor-pointer hover:bg-black/30 transition-colors">
                    <div>
                      <p className="text-white font-medium">Dark Mode</p>
                      <p className="text-sm text-gray-400">
                        Use dark theme across the application
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={(e) => updateSetting("darkMode", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 bg-black/40 text-primary focus:ring-primary/50"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-lg bg-black/20 cursor-pointer hover:bg-black/30 transition-colors">
                    <div>
                      <p className="text-white font-medium">Notifications</p>
                      <p className="text-sm text-gray-400">
                        Receive alerts for new threats and updates
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => updateSetting("notifications", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 bg-black/40 text-primary focus:ring-primary/50"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardShell>
  );
}

// Reusable API Key Card Component
function ApiKeyCard({
  title,
  description,
  icon,
  iconBg,
  apiKey,
  onChange,
  show,
  onToggle,
  externalUrl,
  testing,
  testResult,
  onTest,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  apiKey: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  externalUrl: string;
  testing?: boolean;
  testResult?: "success" | "error" | null;
  onTest?: () => void;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm text-primary hover:text-primary/80 flex items-center gap-1"
        >
          Get API Key <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter your ${title} API key`}
            className="w-full px-4 py-3 pr-12 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {onTest && (
          <button
            onClick={onTest}
            disabled={testing || !apiKey}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-all"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : testResult === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : testResult === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            Test
          </button>
        )}
      </div>
    </div>
  );
}

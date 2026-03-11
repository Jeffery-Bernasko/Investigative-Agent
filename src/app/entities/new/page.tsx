"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  Globe,
  Server,
  Mail,
  Phone,
  ArrowLeft,
  Save,
  Plus,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { cn } from "@/lib/utils";

type EntityType = "person" | "organization" | "domain" | "ip" | "email" | "phone";

interface EntityTypeOption {
  type: EntityType;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  fields: string[];
}

const entityTypes: EntityTypeOption[] = [
  {
    type: "person",
    icon: Users,
    label: "Person",
    description: "Individual profile",
    color: "text-electric bg-electric/10 border-electric/30",
    fields: ["fullName", "occupation", "location", "knownEmails", "knownPhones"],
  },
  {
    type: "organization",
    icon: Building2,
    label: "Organization",
    description: "Company or group",
    color: "text-matrix bg-matrix/10 border-matrix/30",
    fields: ["industry", "employees", "headquarters", "website"],
  },
  {
    type: "domain",
    icon: Globe,
    label: "Domain",
    description: "Website or hostname",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    fields: ["registrar", "registrationDate", "expirationDate", "nameservers"],
  },
  {
    type: "ip",
    icon: Server,
    label: "IP Address",
    description: "Network address",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    fields: ["asn", "isp", "country", "city"],
  },
  {
    type: "email",
    icon: Mail,
    label: "Email",
    description: "Email address",
    color: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    fields: ["provider", "associatedPlatforms"],
  },
  {
    type: "phone",
    icon: Phone,
    label: "Phone",
    description: "Phone number",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    fields: ["carrier", "country", "type"],
  },
];

export default function NewEntityPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    aliases: [] as string[],
    threatScore: 0,
    metadata: {} as Record<string, string>,
  });
  const [newAlias, setNewAlias] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedTypeConfig = entityTypes.find((t) => t.type === selectedType);

  const handleAddAlias = () => {
    if (newAlias.trim() && !formData.aliases.includes(newAlias.trim())) {
      setFormData((prev) => ({
        ...prev,
        aliases: [...prev.aliases, newAlias.trim()],
      }));
      setNewAlias("");
    }
  };

  const handleRemoveAlias = (alias: string) => {
    setFormData((prev) => ({
      ...prev,
      aliases: prev.aliases.filter((a) => a !== alias),
    }));
  };

  const handleMetadataChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedType || !formData.name.trim()) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          name: formData.name,
          aliases: formData.aliases,
          threatScore: formData.threatScore,
          metadata: formData.metadata,
        }),
      });

      if (response.ok) {
        router.push("/entities");
      }
    } catch (error) {
      console.error("Failed to create entity:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Create New Entity</h1>
            <p className="text-sm text-text-secondary mt-1">
              Add a new intelligence entity to the database.
            </p>
          </div>
        </motion.div>

        {/* Step 1: Select Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            1. Select Entity Type
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entityTypes.map((type) => (
              <button
                key={type.type}
                onClick={() => setSelectedType(type.type)}
                className={cn(
                  "p-4 rounded-xl border transition-all text-left",
                  selectedType === type.type
                    ? type.color
                    : "border-glass-border hover:border-glass-border-hover bg-glass-bg"
                )}
              >
                <type.icon
                  className={cn(
                    "w-6 h-6 mb-2",
                    selectedType === type.type
                      ? type.color.split(" ")[0]
                      : "text-text-muted"
                  )}
                />
                <h3
                  className={cn(
                    "font-medium",
                    selectedType === type.type ? "text-white" : "text-text-secondary"
                  )}
                >
                  {type.label}
                </h3>
                <p className="text-xs text-text-muted">{type.description}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Step 2: Basic Info */}
        {selectedType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              2. Basic Information
            </h2>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {selectedType === "person" ? "Full Name" : "Name"} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={
                    selectedType === "person"
                      ? "John Doe"
                      : selectedType === "domain"
                      ? "example.com"
                      : selectedType === "ip"
                      ? "192.168.1.1"
                      : selectedType === "email"
                      ? "user@example.com"
                      : "Enter name..."
                  }
                  className="w-full px-4 py-3 rounded-lg bg-void border border-glass-border text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
                />
              </div>

              {/* Aliases */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Aliases / Alternative Names
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAlias()}
                    placeholder="Add an alias..."
                    className="flex-1 px-4 py-2 rounded-lg bg-void border border-glass-border text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
                  />
                  <button
                    onClick={handleAddAlias}
                    className="p-2 rounded-lg bg-matrix/20 text-matrix hover:bg-matrix/30 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {formData.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.aliases.map((alias) => (
                      <span
                        key={alias}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-graphite text-sm text-text-secondary"
                      >
                        {alias}
                        <button
                          onClick={() => handleRemoveAlias(alias)}
                          className="p-0.5 rounded hover:bg-slate"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Threat Score */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Initial Threat Score (0-100)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.threatScore}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        threatScore: parseInt(e.target.value),
                      }))
                    }
                    className="flex-1 h-2 bg-graphite rounded-lg appearance-none cursor-pointer accent-matrix"
                  />
                  <span
                    className={cn(
                      "w-12 text-center font-mono text-lg",
                      formData.threatScore >= 75
                        ? "text-critical"
                        : formData.threatScore >= 50
                        ? "text-warning"
                        : formData.threatScore >= 25
                        ? "text-yellow-400"
                        : "text-safe"
                    )}
                  >
                    {formData.threatScore}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Type-specific fields */}
        {selectedType && selectedTypeConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              3. Additional Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedTypeConfig.fields.map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-text-secondary mb-2 capitalize">
                    {field.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <input
                    type="text"
                    value={formData.metadata[field] || ""}
                    onChange={(e) => handleMetadataChange(field, e.target.value)}
                    placeholder={`Enter ${field.replace(/([A-Z])/g, " $1").toLowerCase()}...`}
                    className="w-full px-4 py-2 rounded-lg bg-void border border-glass-border text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        {selectedType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-end gap-3"
          >
            <button
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isSaving}
              className={cn(
                "btn-primary flex items-center gap-2",
                (!formData.name.trim() || isSaving) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Create Entity"}
            </button>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}


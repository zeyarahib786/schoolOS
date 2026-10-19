import { useEffect, useState, useCallback } from "react";
import { Kpi } from "../../components/ui/Kpi";
import { Chip } from "../../components/ui/Chip";
import { DataTable } from "../../components/ui/DataTable";
import { useAuthStore, canWrite } from "../../lib/store/authStore";
import * as parentsApi from "./parents.api";
import type { GuardianProfile } from "./parents.api";

const statusTone: Record<
  GuardianProfile["portalStatus"],
  "green" | "amber" | "red"
> = {
  Active: "green",
  Invited: "amber",
  Suspended: "red",
};

export function ParentsPage(): JSX.Element {
  const [items, setItems] = useState<GuardianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await parentsApi.listGuardians();
      setItems(data);
    } catch {
      setError(
        "Could not load parent profiles - Administrator or Principal access is required",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(guardian: GuardianProfile) {
    const nextStatus =
      guardian.portalStatus === "Active" ? "Suspended" : "Active";
    setUpdatingId(guardian._id);
    setError(null);
    try {
      await parentsApi.setGuardianPortal(guardian._id, nextStatus);
      await load();
    } catch {
      setError("Could not update guardian portal status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = items.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.email || "").toLowerCase().includes(search.toLowerCase()) ||
      g.refId.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = items.filter((g) => g.portalStatus === "Active").length;
  const suspendedCount = items.filter(
    (g) => g.portalStatus === "Suspended",
  ).length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>
          Parents & Guardians
        </h1>
        <p style={{ fontSize: 12.5, color: "#64748B" }}>
          Guardian directory, portal access, and student links.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <Kpi
          label="Total guardians"
          value={items.length}
          accentColor="#0E7C39"
        />
        <Kpi
          label="Active portal users"
          value={activeCount}
          accentColor="#2563EB"
        />
        <Kpi label="Suspended" value={suspendedCount} accentColor="#B42318" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          aria-label="Search guardians"
          placeholder="Search by name, email, or reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            height: 38,
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            padding: "0 12px",
          }}
        />
      </div>

      {error && (
        <div
          role="alert"
          style={{ color: "#B42318", fontSize: 12.5, marginBottom: 12 }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
          Loading…
        </div>
      ) : (
        <DataTable<GuardianProfile>
          keyField={(g) => g._id}
          rows={filtered}
          emptyLabel="No guardians found."
          columns={[
            { header: "Guardian", render: (g) => `${g.name} (${g.refId})` },
            { header: "Relation", render: (g) => g.relation },
            { header: "Contact", render: (g) => `${g.phone} · ${g.email}` },
            {
              header: "Linked Students",
              render: (g) =>
                g.studentIds.length
                  ? g.studentIds.map((s) => `${s.name} (${s.grade})`).join(", ")
                  : "None",
            },
            {
              header: "Portal Status",
              render: (g) => (
                <Chip
                  label={g.portalStatus}
                  tone={statusTone[g.portalStatus]}
                />
              ),
            },
            ...(canWrite(role)
              ? [
                  {
                    header: "Actions",
                    render: (g: GuardianProfile) => (
                      <button
                        disabled={updatingId === g._id}
                        onClick={() => toggleStatus(g)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid #CBD5E1",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {updatingId === g._id
                          ? "Updating…"
                          : g.portalStatus === "Active"
                            ? "Suspend"
                            : "Activate"}
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}

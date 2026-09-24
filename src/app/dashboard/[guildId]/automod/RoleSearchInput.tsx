"use client";
import { useState, useEffect, useRef } from "react";

type Role = {
  id: string;
  name: string;
};

type Props = {
  guildId: string;
  onSelect: (roleId: string, roleName: string) => void;
  placeholder?: string;
};

export default function RoleSearchInput({ guildId, onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/guilds/${guildId}/roles`);
        if (response.ok) {
          const data = await response.json();
          setAllRoles(data);
        }
      } catch (error) {
        console.error("Erro ao buscar cargos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, [guildId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setRoles([]);
      setShowDropdown(false);
      return;
    }

    const filtered = allRoles.filter(role => 
      role.name.toLowerCase().includes(query.toLowerCase())
    );
    setRoles(filtered);
    setShowDropdown(filtered.length > 0);
  }, [query, allRoles]);

  const handleSelect = (role: Role) => {
    onSelect(role.id, role.name);
    setQuery("");
    setRoles([]);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: "relative", flex: 1 }} ref={dropdownRef}>
      <input
        type="text"
        className="field-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || "Buscar cargo por nome..."}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
      />
      {showDropdown && (roles.length > 0 || loading) && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "#0e0f11",
          border: "1px solid #1e2025",
          borderRadius: "8px",
          marginTop: "4px",
          maxHeight: "200px",
          overflowY: "auto",
          zIndex: 1000,
        }}>
          {loading ? (
            <div style={{ padding: "8px 12px", color: "#72767d" }}>Carregando cargos...</div>
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                onClick={() => handleSelect(role)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: "1px solid #1e2025",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1e2025"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ color: "#dbdee1" }}>{role.name}</span>
                <span style={{ color: "#72767d", fontSize: "12px" }}>({role.id})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
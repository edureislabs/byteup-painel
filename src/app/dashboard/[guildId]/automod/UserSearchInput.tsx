// src/app/dashboard/[guildId]/automod/UserSearchInput.tsx
"use client";
import { useState, useEffect, useRef } from "react";

type User = {
  id: string;
  name: string;
  discriminator: string;
  avatar: string | null;
};

type Props = {
  guildId: string;
  onSelect: (userId: string, userName: string) => void;
  placeholder?: string;
};

export default function UserSearchInput({ guildId, onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const searchUsers = async () => {
      if (query.length < 2) {
        setUsers([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/guilds/${guildId}/members/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error("Erro ao buscar usuarios:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [query, guildId]);

  const handleSelect = (user: User) => {
    onSelect(user.id, `${user.name}${user.discriminator !== '0' ? `#${user.discriminator}` : ''}`);
    setQuery("");
    setUsers([]);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: "relative", flex: 1 }} ref={dropdownRef}>
      <input
        type="text"
        className="field-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || "Buscar usuario por nome..."}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
      />
      {showDropdown && (users.length > 0 || loading) && (
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
            <div style={{ padding: "8px 12px", color: "#72767d" }}>Buscando...</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                onClick={() => handleSelect(user)}
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
                <img
                  src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32` : "/default-avatar.png"}
                  alt=""
                  style={{ width: "24px", height: "24px", borderRadius: "50%" }}
                />
                <span style={{ color: "#dbdee1" }}>
                  {user.name}{user.discriminator !== '0' ? `#${user.discriminator}` : ''}
                </span>
                <span style={{ color: "#72767d", fontSize: "12px" }}>({user.id})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
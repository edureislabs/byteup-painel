"use client";

import { useEffect, useState } from "react";

interface PermissionsTabProps {
  guildId: string;
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

interface DiscordRole {
  id: string;
  name: string;
  color?: number;
}

interface PermissionsConfig {
  staffRoleIds: string[];
  viewRoleIds: string[];
  manageRoleIds: string[];
  blockedRoleIds: string[];
  blockedUserIds: string[];
  allowUserClose: boolean;
  allowUserAddMember: boolean;
  requireStaffRole: boolean;
}

const DEFAULT_PERMISSIONS: PermissionsConfig = {
  staffRoleIds: [],
  viewRoleIds: [],
  manageRoleIds: [],
  blockedRoleIds: [],
  blockedUserIds: [],
  allowUserClose: false,
  allowUserAddMember: false,
  requireStaffRole: true,
};

function parsePermissions(value: any): PermissionsConfig {
  if (!value) return DEFAULT_PERMISSIONS;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    return {
      ...DEFAULT_PERMISSIONS,
      ...parsed,
      staffRoleIds: Array.isArray(parsed?.staffRoleIds)
        ? parsed.staffRoleIds
        : [],
      viewRoleIds: Array.isArray(parsed?.viewRoleIds)
        ? parsed.viewRoleIds
        : [],
      manageRoleIds: Array.isArray(parsed?.manageRoleIds)
        ? parsed.manageRoleIds
        : [],
      blockedRoleIds: Array.isArray(parsed?.blockedRoleIds)
        ? parsed.blockedRoleIds
        : [],
      blockedUserIds: Array.isArray(parsed?.blockedUserIds)
        ? parsed.blockedUserIds
        : [],
    };
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

export default function PermissionsTab({
  guildId,
  panel,
  setPanel,
  savePanel,
  saving,
}: PermissionsTabProps) {
  const permissions = parsePermissions(panel?.permissionsJson);

  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [blockedUserInput, setBlockedUserInput] = useState("");

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoadingRoles(true);

        const res = await fetch(`/api/guilds/${guildId}/tickets`, {
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok && Array.isArray(data.roles)) {
          setRoles(data.roles);
        }
      } catch (error) {
        console.error("Erro ao carregar cargos:", error);
      } finally {
        setLoadingRoles(false);
      }
    }

    loadRoles();
  }, [guildId]);

  const updatePermissions = (nextPermissions: PermissionsConfig) => {
    setPanel({
      ...(panel || {}),
      permissionsJson: nextPermissions,
    });
  };

  const toggleRole = (field: keyof PermissionsConfig, roleId: string) => {
    const current = permissions[field];

    if (!Array.isArray(current)) return;

    const exists = current.includes(roleId);

    updatePermissions({
      ...permissions,
      [field]: exists
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    });
  };

  const toggleBoolean = (field: keyof PermissionsConfig) => {
    updatePermissions({
      ...permissions,
      [field]: !permissions[field],
    });
  };

  const addBlockedUser = () => {
    const userId = blockedUserInput.trim();

    if (!userId) return;

    if (permissions.blockedUserIds.includes(userId)) {
      setBlockedUserInput("");
      return;
    }

    updatePermissions({
      ...permissions,
      blockedUserIds: [...permissions.blockedUserIds, userId],
    });

    setBlockedUserInput("");
  };

  const removeBlockedUser = (userId: string) => {
    updatePermissions({
      ...permissions,
      blockedUserIds: permissions.blockedUserIds.filter((id) => id !== userId),
    });
  };

  const savePermissions = () => {
    savePanel({
      permissionsJson: permissions,
      staffRoles: permissions.staffRoleIds.join(","),
    });
  };

  const RoleSelector = ({
    title,
    description,
    field,
  }: {
    title: string;
    description: string;
    field:
      | "staffRoleIds"
      | "viewRoleIds"
      | "manageRoleIds"
      | "blockedRoleIds";
  }) => (
    <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
      <div className="mb-4">
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      </div>

      {loadingRoles ? (
        <p className="text-sm text-gray-500">Carregando cargos...</p>
      ) : roles.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum cargo encontrado.</p>
      ) : (
        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
          {roles.map((role) => {
            const checked = permissions[field].includes(role.id);

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(field, role.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                  checked
                    ? "border-[#C100FF]/70 bg-[#C100FF]/10"
                    : "border-[#2b2b2b] bg-[#111111] hover:border-[#C100FF]/40"
                }`}
              >
                <span className="text-sm text-white">{role.name}</span>

                <span
                  className={`h-4 w-4 rounded border ${
                    checked
                      ? "border-[#C100FF] bg-[#C100FF]"
                      : "border-gray-500"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const ToggleCard = ({
    title,
    description,
    field,
  }: {
    title: string;
    description: string;
    field: "allowUserClose" | "allowUserAddMember" | "requireStaffRole";
  }) => {
    const enabled = Boolean(permissions[field]);

    return (
      <div
        className={`rounded-xl border p-5 transition-colors ${
          enabled
            ? "border-[#C100FF]/60 bg-[#C100FF]/10"
            : "border-[#2b2b2b] bg-[#0e0e0e]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-medium text-white">{title}</div>
            <div className="mt-1 text-xs leading-relaxed text-gray-400">
              {description}
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleBoolean(field)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
              enabled ? "bg-[#C100FF]" : "bg-[#2b2b2b]"
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                enabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Permissões</h3>
        <p className="mt-1 text-sm text-gray-400">
          Configure cargos, permissões e bloqueios relacionados aos tickets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RoleSelector
          title="Cargos da staff"
          description="Cargos que fazem parte da equipe de atendimento."
          field="staffRoleIds"
        />

        <RoleSelector
          title="Cargos que podem ver tickets"
          description="Cargos adicionais que poderão visualizar tickets."
          field="viewRoleIds"
        />

        <RoleSelector
          title="Cargos que podem gerenciar tickets"
          description="Cargos que poderão usar ações administrativas no ticket."
          field="manageRoleIds"
        />

        <RoleSelector
          title="Cargos bloqueados"
          description="Usuários com estes cargos não poderão abrir tickets."
          field="blockedRoleIds"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ToggleCard
          title="Usuário pode fechar ticket"
          description="Permite que o próprio autor do ticket possa fechar o atendimento."
          field="allowUserClose"
        />

        <ToggleCard
          title="Usuário pode adicionar membro"
          description="Permite que o autor do ticket adicione outros usuários."
          field="allowUserAddMember"
        />

        <ToggleCard
          title="Exigir cargo da staff"
          description="Quando ativado, apenas cargos configurados como staff terão acesso administrativo."
          field="requireStaffRole"
        />
      </div>

      <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
        <div className="mb-4">
          <h4 className="font-semibold text-white">Usuários bloqueados</h4>
          <p className="mt-1 text-xs text-gray-400">
            Informe IDs de usuários que não poderão abrir tickets neste painel.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={blockedUserInput}
            onChange={(e) => setBlockedUserInput(e.target.value)}
            placeholder="ID do usuário"
            className="flex-1 rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white placeholder:text-gray-500 focus:border-[#C100FF] focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && addBlockedUser()}
          />

          <button
            type="button"
            onClick={addBlockedUser}
            className="rounded-lg bg-[#C100FF] px-4 py-2 text-sm text-white transition-colors hover:bg-[#8A2BFF]"
          >
            Adicionar
          </button>
        </div>

        {permissions.blockedUserIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {permissions.blockedUserIds.map((userId) => (
              <button
                key={userId}
                type="button"
                onClick={() => removeBlockedUser(userId)}
                className="rounded-full border border-[#C100FF]/40 bg-[#C100FF]/10 px-3 py-1 text-xs text-[#C100FF] hover:bg-[#C100FF]/20"
              >
                {userId} ×
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={savePermissions}
        disabled={saving}
        className="rounded-lg bg-[#C100FF] px-6 py-2 text-white transition-colors hover:bg-[#8A2BFF] disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar permissões"}
      </button>
    </div>
  );
}
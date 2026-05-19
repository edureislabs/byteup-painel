"use client";
import { useState } from "react";

type Channel = { id: string; name: string };
type Config = {
  prefix: string;
  modules: string;
  logEnabled: boolean;
  logChannelId: string | null;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  saveAction: (formData: FormData) => Promise<void>;
};

export default function GeneralForm({ config, channels, saveAction }: Props) {
  const [logsEnabled, setLogsEnabled] = useState(config.logEnabled);
  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "520px" }}>
      <h2 style={{ color: "#f2f3f5", marginBottom: "24px" }}>Configurações Gerais</h2>
      <form action={saveAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label className="field-label">Prefixo</label>
          <input className="field-input" name="prefix" defaultValue={config.prefix} />
        </div>
        <div>
          <label className="field-label">Módulos</label>
          <input className="field-input" name="modules" defaultValue={config.modules} />
        </div>
        <div style={{ height: "1px", background: "#1e2025" }} />
        <div>
          <label className="field-label">Logs de Atividade</label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Ativar logs detalhados</span>
            <button
              type="button"
              className="toggle-track"
              style={{
                width: "44px", height: "24px", borderRadius: "12px",
                background: logsEnabled ? "#5865f2" : "#2b2d31",
                border: "none", cursor: "pointer", position: "relative", padding: 0,
              }}
              onClick={() => setLogsEnabled(!logsEnabled)}
            >
              <div
                style={{
                  position: "absolute", width: "18px", height: "18px",
                  borderRadius: "50%", background: "white", top: "3px",
                  left: logsEnabled ? "23px" : "3px", transition: "left 0.2s",
                }}
              />
            </button>
          </div>
          <input type="hidden" name="logEnabled" value={logsEnabled ? "true" : "false"} />
          <label style={{ marginTop: "12px", opacity: logsEnabled ? 1 : 0.4 }}>Canal de Logs</label>
          <select className="field-select" name="logChannelId" defaultValue={config.logChannelId || ""} disabled={!logsEnabled}>
            <option value="">{logsEnabled ? "Selecione um canal" : "Ative os logs primeiro"}</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}># {ch.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="save-btn">Salvar alterações</button>
      </form>
      <style jsx>{`
        .field-label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px;
        }
        .field-input, .field-select {
          background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px;
          padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%;
          outline: none; box-sizing: border-box;
        }
        .field-select:disabled { opacity: 0.35; cursor: not-allowed; }
        .save-btn {
          background: #5865f2; color: white; border: none; border-radius: 8px;
          padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
          width: 100%; transition: background 0.15s;
        }
        .save-btn:hover { background: #4752c4; }
      `}</style>
    </div>
  );
}
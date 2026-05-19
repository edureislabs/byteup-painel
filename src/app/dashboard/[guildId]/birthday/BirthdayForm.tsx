"use client";
import { useState } from "react";

type Channel = { id: string; name: string };
type Config = {
  birthdayEnabled: boolean;
  birthdayChannelId: string | null;
  birthdayMessage: string;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  saveAction: (formData: FormData) => Promise<void>;
};

export default function BirthdayForm({ config, channels, saveAction }: Props) {
  const [enabled, setEnabled] = useState(config.birthdayEnabled);
  const [message, setMessage] = useState(config.birthdayMessage || "Feliz aniversario, {user}!");
  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "520px" }}>
      <h2 style={{ color: "#f2f3f5", marginBottom: "24px" }}>Aniversários</h2>
      <form action={saveAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#dbdee1" }}>Ativar felicitações</span>
          <button
            type="button"
            style={{
              width: "44px", height: "24px", borderRadius: "12px",
              background: enabled ? "#5865f2" : "#2b2d31",
              border: "none", cursor: "pointer", position: "relative", padding: 0,
            }}
            onClick={() => setEnabled(!enabled)}
          >
            <div
              style={{
                position: "absolute", width: "18px", height: "18px",
                borderRadius: "50%", background: "white", top: "3px",
                left: enabled ? "23px" : "3px", transition: "left 0.2s",
              }}
            />
          </button>
        </div>
        <input type="hidden" name="birthdayEnabled" value={enabled ? "true" : "false"} />
        <div style={{ opacity: enabled ? 1 : 0.4 }}>
          <label className="field-label">Canal de Aniversários</label>
          <select className="field-select" name="birthdayChannelId" defaultValue={config.birthdayChannelId || ""} disabled={!enabled}>
            <option value="">{enabled ? "Selecione um canal" : "Ative os aniversários primeiro"}</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}># {ch.name}</option>
            ))}
          </select>
        </div>
        <div style={{ opacity: enabled ? 1 : 0.4 }}>
          <label className="field-label">Mensagem de Aniversário</label>
          <input
            className="field-input"
            name="birthdayMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!enabled}
          />
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
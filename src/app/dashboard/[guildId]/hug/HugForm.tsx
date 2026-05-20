"use client";
import { useState } from "react";

type Config = {
  hugEnabled: boolean;
  hugMessage: string;
  hugImageUrl: string;
};

type Props = {
  guildId: string;
  config: Config;
  saveAction: (formData: FormData) => Promise<void>;
};

export default function HugForm({ config, saveAction }: Props) {
  const [enabled, setEnabled] = useState(config.hugEnabled);
  const [message, setMessage] = useState(config.hugMessage);
  const [imageUrl, setImageUrl] = useState(config.hugImageUrl);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(config.hugImageUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(imageUrl);
    }
  };

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "520px", color: "#dbdee1" }}>
      <h2 style={{ color: "#f2f3f5", marginBottom: "24px" }}>Configuracao do Abraco</h2>
      <form
        action={async (formData) => {
          if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
              formData.set("hugImageUrl", reader.result as string);
              await saveAction(formData);
            };
            reader.readAsDataURL(file);
          } else {
            formData.set("hugImageUrl", imageUrl);
            await saveAction(formData);
          }
        }}
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#dbdee1" }}>Ativar comando de abraco</span>
          <button
            type="button"
            style={{
              width: "44px", height: "24px", borderRadius: "12px",
              background: enabled ? "#5865f2" : "#2b2d31",
              border: "none", cursor: "pointer", position: "relative", padding: 0,
            }}
            onClick={() => setEnabled(!enabled)}
          >
            <div style={{
              position: "absolute", width: "18px", height: "18px",
              borderRadius: "50%", background: "white", top: "3px",
              left: enabled ? "23px" : "3px", transition: "left 0.2s",
            }} />
          </button>
        </div>
        <input type="hidden" name="hugEnabled" value={enabled ? "true" : "false"} />

        <div style={{ opacity: enabled ? 1 : 0.4 }}>
          <label className="field-label">Mensagem do Abraco</label>
          <input
            className="field-input"
            name="hugMessage"
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={!enabled}
          />
          <p style={{ fontSize: "11px", color: "#72767d", marginTop: "4px" }}>
            Use {"{user}"} para quem abraca e {"{target}"} para quem recebe.
          </p>
        </div>

        <div style={{ opacity: enabled ? 1 : 0.4 }}>
          <label className="field-label">Imagem/GIF do Abraco</label>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={!enabled} />
            <span style={{ color: "#72767d" }}>ou</span>
            <input
              className="field-input"
              placeholder="URL da imagem"
              value={imageUrl}
              onChange={e => { setImageUrl(e.target.value); setPreview(e.target.value); setFile(null); }}
              disabled={!enabled}
            />
          </div>
          {preview && (
            <div style={{ marginTop: "12px", borderRadius: "8px", overflow: "hidden", maxWidth: "300px" }}>
              <img src={preview} alt="Preview" style={{ width: "100%", display: "block" }} />
            </div>
          )}
        </div>

        <button type="submit" className="save-btn" disabled={!enabled}>Salvar alteracoes</button>
      </form>
      <style jsx>{`
        .field-label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px;
        }
        .field-input {
          background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px;
          padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%;
          outline: none; box-sizing: border-box;
        }
        .save-btn {
          background: #5865f2; color: white; border: none; border-radius: 8px;
          padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .save-btn:hover { background: #4752c4; }
        .save-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
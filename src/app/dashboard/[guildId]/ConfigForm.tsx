'use client'

import { useState } from 'react'

type Channel = {
  id: string
  name: string
}

type Config = {
  prefix: string
  modules: string
  logEnabled: boolean
  logChannelId: string | null
}

type Props = {
  config: Config
  channels: Channel[]
  saveAction: (formData: FormData) => Promise<void>
}

export default function ConfigForm({ config, channels, saveAction }: Props) {
  const [logsEnabled, setLogsEnabled] = useState(config.logEnabled)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .config-root {
          min-height: 100vh;
          background-color: #0e0f11;
          background-image: radial-gradient(ellipse at 20% 0%, rgba(88, 101, 242, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 100%, rgba(88, 101, 242, 0.05) 0%, transparent 60%);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 48px 16px;
          font-family: 'DM Sans', sans-serif;
        }

        .config-wrapper {
          width: 100%;
          max-width: 520px;
        }

        .config-header {
          margin-bottom: 32px;
        }

        .config-header h1 {
          font-size: 22px;
          font-weight: 600;
          color: #f2f3f5;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
        }

        .config-header p {
          font-size: 13px;
          color: #72767d;
          margin: 0;
          font-family: 'DM Mono', monospace;
        }

        .config-card {
          background: #16181c;
          border: 1px solid #1e2025;
          border-radius: 12px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #72767d;
        }

        .field-input {
          background: #0e0f11;
          border: 1px solid #1e2025;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #dbdee1;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }

        .field-input:focus {
          border-color: #5865f2;
        }

        .divider {
          height: 1px;
          background: #1e2025;
          margin: 4px 0;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .toggle-title {
          font-size: 14px;
          font-weight: 500;
          color: #dbdee1;
        }

        .toggle-status {
          font-size: 12px;
          color: #72767d;
          transition: color 0.2s;
        }

        .toggle-status.on {
          color: #23a55a;
        }

        .toggle-track {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: #2b2d31;
          cursor: pointer;
          position: relative;
          flex-shrink: 0;
          transition: background 0.2s;
          border: none;
          outline: none;
          padding: 0;
        }

        .toggle-track.enabled {
          background: #5865f2;
        }

        .toggle-thumb {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          top: 3px;
          left: 3px;
          transition: left 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        .toggle-track.enabled .toggle-thumb {
          left: 23px;
        }

        .select-wrapper {
          position: relative;
        }

        .field-select {
          background: #0e0f11;
          border: 1px solid #1e2025;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #dbdee1;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          cursor: pointer;
          transition: border-color 0.15s, opacity 0.2s;
          appearance: none;
        }

        .field-select:focus {
          border-color: #5865f2;
        }

        .field-select:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          color: #72767d;
        }

        .select-chevron {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #72767d;
          transition: opacity 0.2s;
        }

        .select-chevron.disabled {
          opacity: 0.35;
        }

        .save-btn {
          background: #5865f2;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s, transform 0.1s;
          margin-top: 4px;
        }

        .save-btn:hover {
          background: #4752c4;
        }

        .save-btn:active {
          transform: scale(0.99);
        }
      `}</style>

      <div className="config-root">
        <div className="config-wrapper">
          <div className="config-header">
            <h1>Server Settings</h1>
            <p>Configure o comportamento do bot neste servidor</p>
          </div>

          <form action={saveAction}>
            <div className="config-card">

              <div className="field-group">
                <span className="field-label">Prefixo</span>
                <input
                  className="field-input"
                  name="prefix"
                  defaultValue={config.prefix}
                  autoComplete="off"
                />
              </div>

              <div className="field-group">
                <span className="field-label">Modulos</span>
                <input
                  className="field-input"
                  name="modules"
                  defaultValue={config.modules}
                  autoComplete="off"
                />
              </div>

              <div className="divider" />

              <div className="field-group">
                <span className="field-label">Logs de Atividade</span>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-title">Ativar logs detalhados</span>
                    <span className={`toggle-status ${logsEnabled ? 'on' : ''}`}>
                      {logsEnabled ? 'Ativo' : 'Desativado'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`toggle-track ${logsEnabled ? 'enabled' : ''}`}
                    onClick={() => setLogsEnabled(!logsEnabled)}
                    aria-pressed={logsEnabled}
                  >
                    <div className="toggle-thumb" />
                  </button>
                </div>

                <input
                  type="hidden"
                  name="logEnabled"
                  value={logsEnabled ? 'true' : 'false'}
                />
              </div>

              <div className="field-group">
                <span className="field-label" style={{ opacity: logsEnabled ? 1 : 0.4 }}>
                  Canal de Logs
                </span>
                <div className="select-wrapper">
                  <select
                    className="field-select"
                    name="logChannelId"
                    defaultValue={config.logChannelId || ''}
                    disabled={!logsEnabled}
                  >
                    <option value="">
                      {logsEnabled ? 'Selecione um canal' : 'Ative os logs primeiro'}
                    </option>
                    {channels.map(channel => (
                      <option key={channel.id} value={channel.id}>
                        # {channel.name}
                      </option>
                    ))}
                  </select>
                  <svg
                    className={`select-chevron ${!logsEnabled ? 'disabled' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              <button type="submit" className="save-btn">
                Salvar alteracoes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
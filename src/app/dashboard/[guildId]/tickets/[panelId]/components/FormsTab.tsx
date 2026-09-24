"use client";

interface FormsTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

type FormFieldType = "short_text" | "paragraph" | "number";

interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: FormFieldType;
  required: boolean;
  minLength?: number;
  maxLength?: number;
}

interface FormsConfig {
  enabled: boolean;
  title: string;
  fields: FormField[];
}

const DEFAULT_FORMS: FormsConfig = {
  enabled: false,
  title: "Formulário do Ticket",
  fields: [],
};

function parseForms(value: any): FormsConfig {
  if (!value) return DEFAULT_FORMS;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    return {
      ...DEFAULT_FORMS,
      ...parsed,
      fields: Array.isArray(parsed?.fields) ? parsed.fields : [],
    };
  } catch {
    return DEFAULT_FORMS;
  }
}

function getFieldTypeLabel(type: FormFieldType) {
  if (type === "paragraph") return "Parágrafo";
  if (type === "number") return "Número";
  return "Texto curto";
}

export default function FormsTab({
  panel,
  setPanel,
  savePanel,
  saving,
}: FormsTabProps) {
  const forms = parseForms(panel?.formsJson);

  const updateForms = (nextForms: FormsConfig) => {
    setPanel({
      ...(panel || {}),
      formsJson: nextForms,
    });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    updateForms({
      ...forms,
      fields: forms.fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    });
  };

  const addField = () => {
    if (forms.fields.length >= 5) return;

    updateForms({
      ...forms,
      fields: [
        ...forms.fields,
        {
          id: Date.now().toString(),
          label: "Nova pergunta",
          placeholder: "Digite sua resposta",
          type: "short_text",
          required: true,
          minLength: 0,
          maxLength: 400,
        },
      ],
    });
  };

  const removeField = (fieldId: string) => {
    updateForms({
      ...forms,
      fields: forms.fields.filter((field) => field.id !== fieldId),
    });
  };

  const saveForms = () => {
    savePanel({
      formsJson: forms,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Formulários</h3>
        <p className="mt-1 text-sm text-gray-400">
          Configure perguntas que serão exibidas antes do usuário abrir o
          ticket.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-5">
          <div
            className={`rounded-xl border p-5 transition-colors ${
              forms.enabled
                ? "border-[#C100FF]/60 bg-[#C100FF]/10"
                : "border-[#2b2b2b] bg-[#0e0e0e]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-white">Ativar formulário</div>
                <div className="mt-1 text-xs text-gray-400">
                  Quando ativado, o bot abrirá um modal antes de criar o ticket.
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateForms({
                    ...forms,
                    enabled: !forms.enabled,
                  })
                }
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  forms.enabled ? "bg-[#C100FF]" : "bg-[#2b2b2b]"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    forms.enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
            <label className="mb-2 block text-sm font-semibold text-white">
              Título do formulário
            </label>

            <input
              type="text"
              value={forms.title}
              onChange={(e) =>
                updateForms({
                  ...forms,
                  title: e.target.value,
                })
              }
              placeholder="Formulário do Ticket"
              className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white placeholder:text-gray-500 focus:border-[#C100FF] focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-white">Perguntas</h4>
                <p className="mt-1 text-xs text-gray-400">
                  O Discord permite até 5 campos em um modal.
                </p>
              </div>

              <button
                type="button"
                onClick={addField}
                disabled={forms.fields.length >= 5}
                className="rounded-lg bg-[#C100FF] px-4 py-2 text-sm text-white transition-colors hover:bg-[#8A2BFF] disabled:opacity-50"
              >
                + Pergunta
              </button>
            </div>

            {forms.fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#2b2b2b] py-8 text-center text-gray-500">
                <p>Nenhuma pergunta criada</p>
                <p className="mt-1 text-xs">
                  Clique em "+ Pergunta" para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {forms.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border border-[#2b2b2b] bg-[#111111] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h5 className="font-semibold text-white">
                        Pergunta {index + 1}
                      </h5>

                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Texto da pergunta
                        </label>

                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) =>
                            updateField(field.id, {
                              label: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-[#2b2b2b] bg-[#0e0e0e] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Placeholder
                        </label>

                        <input
                          type="text"
                          value={field.placeholder}
                          onChange={(e) =>
                            updateField(field.id, {
                              placeholder: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-[#2b2b2b] bg-[#0e0e0e] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Tipo
                        </label>

                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(field.id, {
                              type: e.target.value as FormFieldType,
                            })
                          }
                          className="w-full rounded-lg border border-[#2b2b2b] bg-[#0e0e0e] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                        >
                          <option value="short_text">Texto curto</option>
                          <option value="paragraph">Parágrafo</option>
                          <option value="number">Número</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            Mínimo de caracteres
                          </label>

                          <input
                            type="number"
                            min={0}
                            max={4000}
                            value={field.minLength ?? 0}
                            onChange={(e) =>
                              updateField(field.id, {
                                minLength: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-[#2b2b2b] bg-[#0e0e0e] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            Máximo de caracteres
                          </label>

                          <input
                            type="number"
                            min={1}
                            max={4000}
                            value={field.maxLength ?? 400}
                            onChange={(e) =>
                              updateField(field.id, {
                                maxLength: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-[#2b2b2b] bg-[#0e0e0e] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(field.id, {
                              required: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-sm text-gray-300">
                          Campo obrigatório
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={saveForms}
            disabled={saving}
            className="rounded-lg bg-[#C100FF] px-6 py-2 text-white transition-colors hover:bg-[#8A2BFF] disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar formulário"}
          </button>
        </div>

        <div className="xl:sticky xl:top-8 h-fit">
          <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
            <div className="mb-4">
              <h4 className="font-semibold text-white">Preview do formulário</h4>
              <p className="mt-1 text-xs text-gray-400">
                Prévia aproximada do modal que será aberto no Discord.
              </p>
            </div>

            <div className="rounded-xl bg-[#313338] p-4">
              <div className="mx-auto max-w-md rounded-lg bg-[#2b2d31] shadow-2xl">
                <div className="border-b border-[#1f2023] px-5 py-4">
                  <div className="text-base font-semibold text-white">
                    {forms.title || "Formulário do Ticket"}
                  </div>
                  <div className="mt-1 text-xs text-[#949ba4]">
                    {forms.enabled
                      ? "Formulário ativado"
                      : "Formulário desativado"}
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4">
                  {forms.fields.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#3f4147] py-8 text-center">
                      <p className="text-sm text-[#949ba4]">
                        Nenhuma pergunta configurada
                      </p>
                    </div>
                  ) : (
                    forms.fields.map((field, index) => (
                      <div key={field.id}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <label className="text-xs font-semibold uppercase tracking-wide text-[#dbdee1]">
                            {field.label || `Pergunta ${index + 1}`}
                            {field.required && (
                              <span className="ml-1 text-red-400">*</span>
                            )}
                          </label>

                          <span className="rounded bg-[#1e1f22] px-2 py-0.5 text-[10px] text-[#949ba4]">
                            {getFieldTypeLabel(field.type)}
                          </span>
                        </div>

                        {field.type === "paragraph" ? (
                          <div className="min-h-[86px] rounded-md border border-[#1f2023] bg-[#1e1f22] px-3 py-2 text-sm text-[#949ba4]">
                            {field.placeholder || "Digite sua resposta"}
                          </div>
                        ) : (
                          <div className="rounded-md border border-[#1f2023] bg-[#1e1f22] px-3 py-2 text-sm text-[#949ba4]">
                            {field.placeholder || "Digite sua resposta"}
                          </div>
                        )}

                        <div className="mt-1 text-[10px] text-[#949ba4]">
                          {field.minLength ?? 0} - {field.maxLength ?? 400}{" "}
                          caracteres
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-[#1f2023] px-5 py-4">
                  <button
                    type="button"
                    className="rounded bg-[#4e5058] px-4 py-2 text-sm text-white"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="rounded bg-[#5865F2] px-4 py-2 text-sm text-white"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[#2b2b2b] bg-[#111111] p-3">
              <p className="text-xs text-gray-400">
                O Discord permite no máximo 5 campos por modal. Campos do tipo
                número ainda são enviados como texto, mas o bot pode validar se
                o valor é numérico.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
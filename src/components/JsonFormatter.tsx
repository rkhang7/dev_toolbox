"use client";

import { useState } from "react";

type ActionState = "idle" | "copied";

function formatJsonInput(raw: string): string {
  const parsed = JSON.parse(raw);
  return JSON.stringify(parsed, null, 2);
}

export default function JsonFormatter() {
  const [inputJson, setInputJson] = useState("");
  const [formattedJson, setFormattedJson] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionState, setActionState] = useState<ActionState>("idle");

  const handleInputChange = (value: string) => {
    setInputJson(value);
    setActionState("idle");

    if (!value.trim()) {
      setErrorMessage("");
      setFormattedJson("");
      return;
    }

    try {
      const result = formatJsonInput(value);
      setFormattedJson(result);
      setErrorMessage("");
    } catch {
      setFormattedJson("");
      setErrorMessage("JSON khong hop le. Vui long kiem tra lai cu phap.");
    }
  };

  const handleClear = () => {
    setInputJson("");
    setFormattedJson("");
    setErrorMessage("");
    setActionState("idle");
  };

  const handleCopy = async () => {
    if (!formattedJson) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formattedJson);
      } else {
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = formattedJson;
        tempTextArea.setAttribute("readonly", "");
        tempTextArea.style.position = "absolute";
        tempTextArea.style.left = "-9999px";
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand("copy");
        document.body.removeChild(tempTextArea);
      }

      setActionState("copied");
      setTimeout(() => {
        setActionState("idle");
      }, 1400);
    } catch {
      setErrorMessage("Khong the sao chep. Hay thu lai.");
    }
  };

  const handleDownload = () => {
    if (!formattedJson) {
      return;
    }

    const blob = new Blob([formattedJson], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jsonformatter.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto grid w-[min(1024px,calc(100%-2rem))] gap-4 px-0 pb-12 pt-4 lg:grid-cols-2 lg:items-start">
      <header className="rounded-[18px] bg-gradient-to-br from-[#0d253f] via-[#146c94] to-[#19a7ce] p-5 text-[#f9fbfd] shadow-[0_14px_36px_rgba(13,37,63,0.2)] lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.14em] opacity-85">JSON Tool</p>
        <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.35rem)] font-semibold">JSON Formatter</h1>
        <p>
          Dan JSON bat ky va bam <strong>Format JSON</strong> de hien thi de doc.
        </p>
      </header>

      <div className="space-y-4 lg:col-start-1 lg:row-start-2">
        <section className="rounded-[18px] border border-[#dbe7f1] bg-white p-4 shadow-[0_10px_30px_rgba(10,57,87,0.08)]">
          <label className="mb-2 inline-block text-sm font-semibold text-[#0f3554]" htmlFor="json-input">
            Input JSON
          </label>
          <textarea
            id="json-input"
            className="min-h-[240px] w-full resize-y rounded-xl border border-[#bdd2e3] bg-[#f9fcff] p-4 font-mono text-[0.92rem] leading-6 text-[#12344d] outline-none transition focus:border-[#19a7ce] focus:ring-4 focus:ring-[#19a7ce]/25"
            value={inputJson}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder='Vi du: {"name":"Copilot","skills":["format","validate"]}'
            spellCheck={false}
          />

          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              type="button"
              className="rounded-[10px] bg-[#e5f2fa] px-4 py-2.5 text-sm font-semibold text-[#0f3554] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
              onClick={handleClear}
              disabled={!inputJson && !formattedJson}
            >
              Clear
            </button>
          </div>
        </section>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-[#f5b7b1] bg-[#fff3f2] px-4 py-3 text-sm text-[#9f2121]"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <section className="rounded-[18px] border border-[#dbe7f1] bg-white p-4 shadow-[0_10px_30px_rgba(10,57,87,0.08)] lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[#4b657c]">Formatted Output</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-[10px] bg-[#e5f2fa] px-3.5 py-2 text-sm font-semibold text-[#0f3554] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
              onClick={handleCopy}
              disabled={!formattedJson}
            >
              {actionState === "copied" ? "Da copy" : "Copy"}
            </button>
            <button
              type="button"
              className="rounded-[10px] bg-[#0f3554] px-3.5 py-2 text-sm font-semibold text-[#f6fbff] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
              onClick={handleDownload}
              disabled={!formattedJson}
            >
              Download
            </button>
          </div>
        </div>
        <pre className="max-h-[55vh] min-h-[230px] w-full overflow-auto break-words whitespace-pre-wrap rounded-xl border border-[#d7e6f0] bg-[#0f1f2e] p-4 font-mono text-sm leading-6 text-[#d2f0ff]">
          {formattedJson || "Ket qua format se hien thi o day."}
        </pre>
      </section>
    </section>
  );
}

"use client";

import JsBarcode from "jsbarcode";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

type ActionState = "idle" | "copied";
type ToolKey = "json" | "qr" | "barcode";

function formatJsonInput(raw: string): string {
  const parsed = JSON.parse(raw);
  return JSON.stringify(parsed, null, 2);
}

const tools: Array<{ key: ToolKey; label: string }> = [
  { key: "json", label: "JSON Formatter" },
  { key: "qr", label: "QR Code" },
  { key: "barcode", label: "Barcode" },
];

export default function JsonFormatter() {
  const [activeTool, setActiveTool] = useState<ToolKey>("json");

  const [inputJson, setInputJson] = useState("");
  const [formattedJson, setFormattedJson] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [jsonActionState, setJsonActionState] = useState<ActionState>("idle");

  const [qrText, setQrText] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrError, setQrError] = useState("");
  const [qrTextActionState, setQrTextActionState] = useState<ActionState>("idle");
  const [qrImageActionState, setQrImageActionState] = useState<ActionState>("idle");

  const [barcodeText, setBarcodeText] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeTextActionState, setBarcodeTextActionState] = useState<ActionState>("idle");
  const [barcodeImageActionState, setBarcodeImageActionState] = useState<ActionState>("idle");
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  const copyText = async (value: string, setState: (state: ActionState) => void) => {
    if (!value) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = value;
        tempTextArea.setAttribute("readonly", "");
        tempTextArea.style.position = "absolute";
        tempTextArea.style.left = "-9999px";
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand("copy");
        document.body.removeChild(tempTextArea);
      }

      setState("copied");
      window.setTimeout(() => setState("idle"), 1400);
    } catch {
      setErrorMessage("Unable to copy. Please try again.");
    }
  };

  const handleInputChange = (value: string) => {
    setInputJson(value);
    setJsonActionState("idle");

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
      setErrorMessage("Invalid JSON. Please check your syntax.");
    }
  };

  const handleClear = () => {
    setInputJson("");
    setFormattedJson("");
    setErrorMessage("");
    setJsonActionState("idle");
  };

  const handleJsonDownload = () => {
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

  const handleQrDownload = () => {
    if (!qrImage) {
      return;
    }

    const link = document.createElement("a");
    link.href = qrImage;
    link.download = "qrcode.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyImageBlob = async (blob: Blob, onSuccess: (state: ActionState) => void, onError: () => void) => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      onError();
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      onSuccess("copied");
      window.setTimeout(() => onSuccess("idle"), 1400);
    } catch {
      onError();
    }
  };

  const handleQrCopyImage = async () => {
    if (!qrImage) {
      return;
    }

    try {
      const response = await fetch(qrImage);
      const blob = await response.blob();
      await copyImageBlob(
        blob,
        setQrImageActionState,
        () => setQrError("Unable to copy QR image. Your browser may not support this feature."),
      );
    } catch {
      setQrError("Unable to copy QR image. Please try again.");
    }
  };

  const createBarcodePngBlob = (): Promise<Blob | null> => {
    if (!barcodeRef.current) {
      return Promise.resolve(null);
    }

    const xml = new XMLSerializer().serializeToString(barcodeRef.current);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const image = new window.Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const width = image.width || 800;
        const height = image.height || 260;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(url);
          resolve(pngBlob);
        }, "image/png");
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      image.src = url;
    });
  };

  const handleBarcodeDownload = async () => {
    const pngBlob = await createBarcodePngBlob();
    if (!pngBlob) {
      setBarcodeError("Unable to download barcode PNG. Please try again.");
      return;
    }

    const pngUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "barcode.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(pngUrl);
  };

  const handleBarcodeCopyImage = async () => {
    const pngBlob = await createBarcodePngBlob();
    if (!pngBlob) {
      setBarcodeError("Unable to copy barcode image. Please try again.");
      return;
    }

    await copyImageBlob(
      pngBlob,
      setBarcodeImageActionState,
      () => setBarcodeError("Unable to copy barcode image. Your browser may not support this feature."),
    );
  };

  useEffect(() => {
    if (!qrText.trim()) {
      setQrImage("");
      setQrError("");
      return;
    }

    let mounted = true;
    QRCode.toDataURL(qrText, {
      width: 320,
      margin: 1,
      color: {
        dark: "#0f3554",
        light: "#ffffff",
      },
    })
      .then((result) => {
        if (!mounted) {
          return;
        }
        setQrImage(result);
        setQrError("");
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setQrImage("");
        setQrError("Unable to generate QR code. Please try different content.");
      });

    return () => {
      mounted = false;
    };
  }, [qrText]);

  useEffect(() => {
    if (!barcodeRef.current) {
      return;
    }

    if (!barcodeText.trim()) {
      barcodeRef.current.innerHTML = "";
      setBarcodeError("");
      return;
    }

    try {
      JsBarcode(barcodeRef.current, barcodeText, {
        format: "CODE128",
        lineColor: "#0f3554",
        width: 2,
        height: 90,
        displayValue: true,
        margin: 12,
        background: "#ffffff",
      });
      setBarcodeError("");
    } catch {
      barcodeRef.current.innerHTML = "";
      setBarcodeError("Unable to generate barcode. Please check your input.");
    }
  }, [barcodeText]);

  return (
    <section className="mx-auto grid w-[min(1024px,calc(100%-2rem))] gap-4 px-0 pb-12 pt-4 lg:grid-cols-2 lg:items-start">
      <header className="rounded-[18px] bg-gradient-to-br from-[#0d253f] via-[#146c94] to-[#19a7ce] p-5 text-[#f9fbfd] shadow-[0_14px_36px_rgba(13,37,63,0.2)] lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.14em] opacity-85">Developer Toolbox</p>
        <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.35rem)] font-semibold">JSON, QR & Barcode Studio</h1>
        <p>A clean interface to format JSON and generate QR/Barcode instantly.</p>

        <nav className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tools.map((tool) => {
            const isActive = activeTool === tool.key;
            return (
              <button
                key={tool.key}
                type="button"
                onClick={() => setActiveTool(tool.key)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-white/60 bg-white text-[#0f3554]"
                    : "border-white/30 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {tool.label}
              </button>
            );
          })}
        </nav>
      </header>

      {activeTool === "json" && (
        <>
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
                placeholder='Example: {"name":"Copilot","skills":["format","validate"]}'
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
                  onClick={() => copyText(formattedJson, setJsonActionState)}
                  disabled={!formattedJson}
                >
                  {jsonActionState === "copied" ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="rounded-[10px] bg-[#0f3554] px-3.5 py-2 text-sm font-semibold text-[#f6fbff] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleJsonDownload}
                  disabled={!formattedJson}
                >
                  Download
                </button>
              </div>
            </div>
            <pre className="max-h-[55vh] min-h-[230px] w-full overflow-auto break-words whitespace-pre-wrap rounded-xl border border-[#d7e6f0] bg-[#0f1f2e] p-4 font-mono text-sm leading-6 text-[#d2f0ff]">
              {formattedJson || "Formatted result will appear here."}
            </pre>
          </section>
        </>
      )}

      {activeTool === "qr" && (
        <>
          <section className="rounded-[18px] border border-[#dbe7f1] bg-white p-4 shadow-[0_10px_30px_rgba(10,57,87,0.08)] lg:col-start-1 lg:row-start-2">
            <label className="mb-2 inline-block text-sm font-semibold text-[#0f3554]" htmlFor="qr-input">
              QR content
            </label>
            <textarea
              id="qr-input"
              className="min-h-[240px] w-full resize-y rounded-xl border border-[#bdd2e3] bg-[#f9fcff] p-4 text-[0.92rem] leading-6 text-[#12344d] outline-none transition focus:border-[#19a7ce] focus:ring-4 focus:ring-[#19a7ce]/25"
              value={qrText}
              onChange={(event) => {
                setQrText(event.target.value);
                setQrTextActionState("idle");
                setQrImageActionState("idle");
              }}
              placeholder="Enter a URL, text, or any content to generate a QR code"
              spellCheck={false}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-[10px] bg-[#e5f2fa] px-3.5 py-2 text-sm font-semibold text-[#0f3554] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => copyText(qrText, setQrTextActionState)}
                disabled={!qrText.trim()}
              >
                {qrTextActionState === "copied" ? "Copied" : "Copy text"}
              </button>
            </div>

            {qrError && (
              <p className="mt-3 rounded-xl border border-[#f5b7b1] bg-[#fff3f2] px-4 py-3 text-sm text-[#9f2121]">
                {qrError}
              </p>
            )}
          </section>

          <section className="rounded-[18px] border border-[#dbe7f1] bg-white p-4 shadow-[0_10px_30px_rgba(10,57,87,0.08)] lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[#4b657c]">QR Preview</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-[10px] bg-[#e5f2fa] px-3.5 py-2 text-sm font-semibold text-[#0f3554] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleQrCopyImage}
                  disabled={!qrImage}
                >
                  {qrImageActionState === "copied" ? "Copied" : "Copy image"}
                </button>
                <button
                  type="button"
                  className="rounded-[10px] bg-[#0f3554] px-3.5 py-2 text-sm font-semibold text-[#f6fbff] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleQrDownload}
                  disabled={!qrImage}
                >
                  Download PNG
                </button>
              </div>
            </div>

            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-[#d7e6f0] bg-[#f9fcff] p-4">
              {qrImage ? (
                <Image
                  src={qrImage}
                  alt="QR code"
                  width={240}
                  height={240}
                  unoptimized
                  className="h-[240px] w-[240px] rounded-lg border border-[#e0ecf5]"
                />
              ) : (
                <p className="text-sm text-[#4b657c]">QR code preview will appear here.</p>
              )}
            </div>
          </section>
        </>
      )}

      {activeTool === "barcode" && (
        <>
          <section className="rounded-[18px] border border-[#dbe7f1] bg-white p-4 shadow-[0_10px_30px_rgba(10,57,87,0.08)] lg:col-start-1 lg:row-start-2">
            <label className="mb-2 inline-block text-sm font-semibold text-[#0f3554]" htmlFor="barcode-input">
              Barcode content (CODE128)
            </label>
            <textarea
              id="barcode-input"
              className="min-h-[240px] w-full resize-y rounded-xl border border-[#bdd2e3] bg-[#f9fcff] p-4 text-[0.92rem] leading-6 text-[#12344d] outline-none transition focus:border-[#19a7ce] focus:ring-4 focus:ring-[#19a7ce]/25"
              value={barcodeText}
              onChange={(event) => {
                setBarcodeText(event.target.value);
                setBarcodeTextActionState("idle");
                setBarcodeImageActionState("idle");
              }}
              placeholder="Enter text or numbers to generate a barcode"
              spellCheck={false}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-[10px] bg-[#e5f2fa] px-3.5 py-2 text-sm font-semibold text-[#0f3554] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => copyText(barcodeText, setBarcodeTextActionState)}
                disabled={!barcodeText.trim()}
              >
                {barcodeTextActionState === "copied" ? "Copied" : "Copy text"}
              </button>
            </div>

            {barcodeError && (
              <p className="mt-3 rounded-xl border border-[#f5b7b1] bg-[#fff3f2] px-4 py-3 text-sm text-[#9f2121]">
                {barcodeError}
              </p>
            )}
          </section>

          <section className="rounded-[18px] border border-[#dbe7f1] bg-white p-4 shadow-[0_10px_30px_rgba(10,57,87,0.08)] lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[#4b657c]">Barcode Preview</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-[10px] bg-[#e5f2fa] px-3.5 py-2 text-sm font-semibold text-[#0f3554] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleBarcodeCopyImage}
                  disabled={!barcodeText.trim() || !!barcodeError}
                >
                  {barcodeImageActionState === "copied" ? "Copied" : "Copy image"}
                </button>
                <button
                  type="button"
                  className="rounded-[10px] bg-[#0f3554] px-3.5 py-2 text-sm font-semibold text-[#f6fbff] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleBarcodeDownload}
                  disabled={!barcodeText.trim() || !!barcodeError}
                >
                  Download PNG
                </button>
              </div>
            </div>

            <div className="flex min-h-[300px] items-center justify-center overflow-auto rounded-xl border border-[#d7e6f0] bg-[#f9fcff] p-4">
              {barcodeText.trim() && !barcodeError ? (
                <svg ref={barcodeRef} role="img" aria-label="Barcode" className="w-full max-w-[420px]" />
              ) : (
                <p className="text-sm text-[#4b657c]">Barcode preview will appear here.</p>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

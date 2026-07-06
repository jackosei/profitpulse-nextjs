"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  Cable,
  Copy,
  Check,
  Download,
  RefreshCw,
  Unplug,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Pulse } from "@/types/pulse";
import {
  createPulseApiKey,
  getPulseApiKey,
  revokePulseApiKey,
  type ApiKeyInfo,
} from "@/services/api/keysApi";

interface ConnectMt5ModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulse: Pulse;
  /** Re-fetch the pulse (picks up sync.lastSyncAt for the connection check). */
  onRefresh: () => void;
}

function tsToDate(ts: { _seconds?: number; seconds?: number } | null | undefined): Date | null {
  const seconds = ts?._seconds ?? ts?.seconds;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

export default function ConnectMt5Modal({
  isOpen,
  onClose,
  pulse,
  onRefresh,
}: ConnectMt5ModalProps) {
  const firestoreId = pulse.firestoreId ?? "";
  const [keyInfo, setKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const lastSyncAt = tsToDate(pulse.sync?.lastSyncAt as unknown as { seconds?: number });

  const loadKeyInfo = useCallback(async () => {
    if (!firestoreId) return;
    setInfoLoading(true);
    try {
      setKeyInfo(await getPulseApiKey(firestoreId));
    } catch {
      // Non-fatal — the modal still allows generating a key.
    } finally {
      setInfoLoading(false);
    }
  }, [firestoreId]);

  useEffect(() => {
    if (isOpen) {
      setFreshKey(null);
      setCopied(false);
      loadKeyInfo();
    }
  }, [isOpen, loadKeyInfo]);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const { key } = await createPulseApiKey(firestoreId);
      setFreshKey(key);
      await loadKeyInfo();
      toast.success("API key generated — copy it now, it won't be shown again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await revokePulseApiKey(firestoreId);
      setKeyInfo(null);
      setFreshKey(null);
      toast.success("Disconnected — the EA's key has been revoked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!freshKey) return;
    await navigator.clipboard.writeText(freshKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckConnection = async () => {
    setChecking(true);
    onRefresh();
    await loadKeyInfo();
    setTimeout(() => setChecking(false), 800);
  };

  const hasKey = Boolean(keyInfo) || Boolean(freshKey);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-dark border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                <Cable className="w-5 h-5 text-accent" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Connect MT5
                </DialogTitle>
                <p className="text-xs text-gray-500">
                  Auto-sync every trade from MetaTrader 5 to this pulse
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Sync status */}
            <div
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                lastSyncAt
                  ? "border-emerald-500/25 bg-emerald-500/10"
                  : "border-gray-700/60 bg-gray-800/40"
              }`}
            >
              {lastSyncAt ? (
                <>
                  <CircleCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-400">
                    EA connected · last sync{" "}
                    {formatDistanceToNow(lastSyncAt, { addSuffix: true })}
                    {pulse.sync?.accountNumber ? (
                      <span className="text-emerald-400/70">
                        {" "}· account {pulse.sync.accountNumber}
                      </span>
                    ) : null}
                  </p>
                </>
              ) : (
                <>
                  <CircleAlert className="w-4 h-4 text-gray-500 shrink-0" />
                  <p className="text-sm text-gray-400">
                    {hasKey
                      ? "Key created — waiting for the EA's first sync."
                      : "Not connected yet."}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={handleCheckConnection}
                className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
                title="Check connection"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Step 1 — key */}
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-800/60 bg-white/[0.02]">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Step 1 · API key
                </p>
              </div>
              <div className="p-4 space-y-3">
                {freshKey ? (
                  <>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-emerald-300 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 break-all select-all">
                        {freshKey}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="shrink-0 p-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                        title="Copy key"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-amber-400/90">
                      Copy this key now — for security it is never shown again.
                      Generating a new key disables the old one.
                    </p>
                  </>
                ) : keyInfo ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-300">
                        Active key{" "}
                        <code className="text-xs text-gray-400">{keyInfo.prefix}…</code>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {keyInfo.lastUsedAt
                          ? `Last used ${formatDistanceToNow(tsToDate(keyInfo.lastUsedAt)!, { addSuffix: true })}`
                          : "Never used yet"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={busy}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium text-gray-300 border border-gray-700 rounded-lg hover:border-gray-500 hover:text-white disabled:opacity-50 transition-colors"
                    >
                      Regenerate
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={busy || infoLoading || !firestoreId}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {busy ? "Generating…" : "Generate API key"}
                  </button>
                )}
              </div>
            </div>

            {/* Step 2 — EA setup */}
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-800/60 bg-white/[0.02] flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Step 2 · Install the EA
                </p>
                <a
                  href="/downloads/ProfitPulseSync.mq5"
                  download
                  className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  ProfitPulseSync.mq5
                </a>
              </div>
              <ol className="p-4 space-y-2.5 text-sm text-gray-400 list-decimal list-inside marker:text-gray-600">
                <li>
                  In MT5, open{" "}
                  <span className="text-gray-300">File &gt; Open Data Folder</span> and put
                  the file in <span className="text-gray-300">MQL5/Experts</span>, then
                  restart MT5 (or refresh the Navigator).
                </li>
                <li>
                  <span className="text-gray-300">Tools &gt; Options &gt; Expert Advisors</span>:
                  tick <span className="text-gray-300">Allow WebRequest for listed URL</span>{" "}
                  and add{" "}
                  <code className="text-xs text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded">
                    {typeof window !== "undefined" ? window.location.origin : "your ProfitPulse URL"}
                  </code>
                </li>
                <li>
                  Drag <span className="text-gray-300">ProfitPulseSync</span> onto any chart
                  and paste your API key into the{" "}
                  <span className="text-gray-300">ApiKey</span> input. Keep{" "}
                  <span className="text-gray-300">Algo Trading</span> enabled.
                </li>
                <li>
                  The EA backfills your recent history first, then posts every trade as it
                  closes. If your terminal was off when a trade closed, it catches up on the
                  next scan.
                </li>
              </ol>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-1">
              {keyInfo || freshKey ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect &amp; revoke key
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

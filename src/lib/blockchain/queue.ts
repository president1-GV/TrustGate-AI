/**
 * TRUSTGATE AI — Asynchronous Blockchain Queue Worker
 * 
 * Guarantees that blockchain anchoring runs asynchronously without
 * ever blocking real-time border clearance decisions. Handles offline
 * store-and-forward, bounded retries with exponential backoff, and idempotency.
 */

import { PermissionedBlockchainAdapter } from "./adapter";
import type { BlockchainAnchorRecord, EvidenceManifest, QueueItem } from "./types";

type AnchorCallback = (record: BlockchainAnchorRecord) => void;
type ErrorCallback = (item: QueueItem, err: any) => void;

export class BlockchainQueueWorker {
  private static instance: BlockchainQueueWorker;
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private seenKeys = new Set<string>();
  private onConfirmedListeners: AnchorCallback[] = [];
  private onErrorListeners: ErrorCallback[] = [];

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[BlockchainQueueWorker] Network restored, draining pending anchor queue...");
        this.processQueue();
      });
    }
  }

  public static getInstance(): BlockchainQueueWorker {
    if (!BlockchainQueueWorker.instance) {
      BlockchainQueueWorker.instance = new BlockchainQueueWorker();
    }
    return BlockchainQueueWorker.instance;
  }

  public onConfirmed(cb: AnchorCallback): () => void {
    this.onConfirmedListeners.push(cb);
    return () => {
      this.onConfirmedListeners = this.onConfirmedListeners.filter((l) => l !== cb);
    };
  }

  public onError(cb: ErrorCallback): () => void {
    this.onErrorListeners.push(cb);
    return () => {
      this.onErrorListeners = this.onErrorListeners.filter((l) => l !== cb);
    };
  }

  /**
   * Enqueues an evidence manifest for asynchronous anchoring.
   * Returns immediately so caller is never blocked.
   */
  public enqueue(params: {
    caseId: string;
    documentId?: string;
    processingRunId: string;
    manifest: EvidenceManifest;
    manifestHash: string;
    maxAttempts?: number;
  }): string {
    const key = `${params.caseId}:${params.processingRunId}:${params.manifestHash}`;
    if (this.seenKeys.has(key)) {
      return key;
    }
    this.seenKeys.add(key);

    const item: QueueItem = {
      id: `Q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      caseId: params.caseId,
      documentId: params.documentId,
      processingRunId: params.processingRunId,
      manifest: params.manifest,
      manifestHash: params.manifestHash,
      attempts: 0,
      maxAttempts: params.maxAttempts ?? 5,
      status: "QUEUED",
      enqueuedAt: Date.now(),
    };

    this.queue.push(item);
    // Fire worker tick asynchronously
    setTimeout(() => this.processQueue(), 10);
    return item.id;
  }

  public getQueueLength(): number {
    return this.queue.filter((q) => q.status === "QUEUED" || q.status === "PROCESSING").length;
  }

  /**
   * Worker processing loop.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing || !this.queue.length) {
      return;
    }

    this.isProcessing = true;
    const adapter = PermissionedBlockchainAdapter.getInstance();

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];
        if (!item || item.status === "CONFIRMED" || item.status === "FAILED") {
          this.queue.shift();
          continue;
        }

        item.status = "PROCESSING";
        item.attempts += 1;

        try {
          const anchor = await adapter.anchorEvidence({
            manifest: item.manifest,
            manifestHash: item.manifestHash,
            documentHash: item.manifest.document.document_hash,
            modelsProvenanceHash: item.manifest.ai_pipeline.models_provenance_hash,
            verdictHash: item.manifest.verdict.verdict_hash,
            stationId: item.manifest.officer_attestation.station_id,
            officerId: item.manifest.officer_attestation.officer_id,
          });

          item.status = "CONFIRMED";
          this.queue.shift();

          // Notify listeners
          this.onConfirmedListeners.forEach((cb) => {
            try {
              cb(anchor);
            } catch (e) {
              console.warn("[BlockchainQueueWorker] Listener callback error:", e);
            }
          });
        } catch (err: any) {
          item.lastError = err?.message || String(err);
          console.warn(
            `[BlockchainQueueWorker] Anchor attempt ${item.attempts}/${item.maxAttempts} failed for case ${item.caseId}:`,
            item.lastError
          );

          if (item.attempts >= item.maxAttempts) {
            item.status = "FAILED";
            this.queue.shift();
            this.onErrorListeners.forEach((cb) => {
              try {
                cb(item, err);
              } catch (e) {
                console.warn("[BlockchainQueueWorker] Error listener callback error:", e);
              }
            });
          } else {
            // Requeue with exponential backoff delay
            item.status = "QUEUED";
            const delayMs = Math.min(1000 * Math.pow(2, item.attempts), 10000);
            await new Promise((res) => setTimeout(res, delayMs));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

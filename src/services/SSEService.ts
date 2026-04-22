import { getApiBaseUrl } from "../config";
import { fetch } from "@tauri-apps/plugin-http";
import { logInfo, logError, logDebug } from "../logs/logging";

export type SseConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type Listener = (data: any) => void;

/**
 * SSE client implemented over Tauri HTTP plugin's fetch (streaming).
 *
 * The native EventSource API cannot reach http://localhost:8090 from the
 * Tauri WebView because it is a cross-origin request without CORS headers.
 * Using the Tauri HTTP plugin routes the request through Rust, bypassing CORS.
 */
class SSEService {
  private abortController: AbortController | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private isDestroyed = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private _status: SseConnectionStatus = 'disconnected';
  private reconnectAttempt: number = 0;
  private static readonly BASE_DELAY_MS = 3000;
  private static readonly MAX_DELAY_MS = 60000;

  public get status(): SseConnectionStatus {
    return this._status;
  }

  private setStatus(status: SseConnectionStatus) {
    if (this._status !== status) {
      this._status = status;
      this.emit('status_change', { status });
    }
  }

  constructor() {
    this.connect();
  }

  private async connect() {
    if (this.isDestroyed) return;

    this.setStatus('connecting');

    try {
      const baseUrl = await getApiBaseUrl();
      const url = `${baseUrl}/api/events`;

      logDebug("SSE", "Connecting to SSE endpoint via Tauri HTTP", { url });

      this.abortController = new AbortController();

      const response = await fetch(url, {
        method: "GET",
        headers: { "Accept": "text/event-stream" },
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: HTTP ${response.status}`);
      }

      this.setStatus('connected');
      this.reconnectAttempt = 0;
      logInfo("SSE", "SSE connection opened");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (delimited by double newlines)
        const parts = buffer.split("\n\n");
        // The last element may be an incomplete event — keep it in the buffer
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          this.parseAndDispatch(part);
        }
      }

      // Stream ended cleanly
      logDebug("SSE", "SSE stream ended");
      this.setStatus('disconnected');
      this.reconnect();

    } catch (error: any) {
      if (error?.name === "AbortError") {
        logDebug("SSE", "SSE connection aborted");
        return;
      }
      logError("SSE", "SSE Error occurred", { error: error?.message ?? error });
      this.setStatus('error');
      this.reconnect();
    }
  }

  /**
   * Parse a single SSE block and dispatch to listeners.
   * SSE format:
   *   event: <type>\n
   *   data: <json>\n
   */
  private parseAndDispatch(block: string) {
    let eventType = "message";
    let dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      } else if (line.startsWith(":")) {
        // SSE comment — ignore (heartbeat keepalive)
      }
    }

    if (dataLines.length === 0) return;

    const rawData = dataLines.join("\n");

    // Heartbeat events — silently ignore
    if (eventType === "heartbeat") return;

    try {
      const data = JSON.parse(rawData);
      logDebug("SSE", `Received ${eventType} event`, data);

      if (eventType === "connected") {
        this.emit("connected", data);
      } else {
        // If the payload lacks a type field, inject the SSE event name so
        // App.tsx can switch on it even when Bridge-Ground is an older build
        // that omits "type" from the JSON body.
        const enriched =
          data && typeof data === "object" && !data.type
            ? { ...data, type: eventType }
            : data;
        // update, shops, shop_news, event_news, specials → all go through "update"
        this.emit("update", enriched);
      }
    } catch {
      // Non-JSON data — ignore
    }
  }

  private reconnect() {
    if (this.isDestroyed) return;

    this.disconnect();

    if (this.retryTimeout) return;

    const delay = Math.min(
      SSEService.BASE_DELAY_MS * Math.pow(2, this.reconnectAttempt),
      SSEService.MAX_DELAY_MS,
    );
    const jitter = Math.random() * delay * 0.3;
    const finalDelay = Math.round(delay + jitter);
    this.reconnectAttempt++;

    logDebug("SSE", `Scheduling reconnect in ${finalDelay}ms (attempt ${this.reconnectAttempt})...`);
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      this.connect();
    }, finalDelay);
  }

  private disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    // Clear pending reconnection timer to prevent reconnecting after disconnect
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  public on(event: string, callback: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          logError("SSE", "Error in event listener", { error: e });
        }
      });
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.disconnect();
    this.setStatus('disconnected');
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const sseService = new SSEService();

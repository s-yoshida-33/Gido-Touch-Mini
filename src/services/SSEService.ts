import { getApiBaseUrl } from "../config";
import { logInfo, logError, logDebug } from "../logs/logging";

export type SseConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type Listener = (data: any) => void;

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private isDestroyed = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private _status: SseConnectionStatus = 'disconnected';

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

      logDebug("sse", "Connecting to SSE endpoint", { url });

      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener("open", () => {
        logDebug("sse", "SSE connection opened");
        this.setStatus('connected');
      });

      this.eventSource.addEventListener("connected", (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit("connected", data);
        } catch (error) {
          logError("sse", "Failed to parse connected event", { error });
        }
      });

      this.eventSource.addEventListener("heartbeat", () => {
        try {
          // const data = JSON.parse(e.data);
          // Optional: log heartbeat only occasionally or not at all to avoid noise
          // this.emit("heartbeat", data); 
        } catch (error) {
           // ignore heartbeat errors
        }
      });

      const handleUpdate = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          logDebug("sse", `Received ${e.type} event`, data);
          this.emit("update", data);
        } catch (error) {
          logError("sse", `Failed to parse ${e.type} event`, { error });
        }
      };

      // Listen for specific event types sent by the server
      this.eventSource.addEventListener("update", handleUpdate);
      this.eventSource.addEventListener("shops", handleUpdate);
      this.eventSource.addEventListener("shop_news", handleUpdate);
      this.eventSource.addEventListener("event_news", handleUpdate);
      this.eventSource.addEventListener("specials", handleUpdate);

      this.eventSource.onerror = (e) => {
        logError("sse", "SSE Error occurred", { event: e });
        this.setStatus('error');
        this.reconnect();
      };

    } catch (error) {
      logError("sse", "Failed to initialize SSE connection", { error });
      this.setStatus('error');
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.isDestroyed) return;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.retryTimeout) return;

    logDebug("sse", "Scheduling reconnect in 5s...");
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      this.connect();
    }, 5000);
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
          logError("sse", "Error in event listener", { error: e });
        }
      });
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
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


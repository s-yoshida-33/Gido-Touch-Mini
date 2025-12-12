import { getApiBaseUrl } from "../config";
import { logInfo, logError, logWarn } from "../logs/logging";

type SSEEventType = "connected" | "heartbeat" | "update";

interface SSEEventData {
  type: SSEEventType;
  message?: string;
  timestamp?: string;
  clients?: number;
}

type SSECallback = (data: SSEEventData) => void;

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<SSEEventType, Set<SSECallback>> = new Map();
  private reconnectTimeout: number | null = null;
  private isDestroyed = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    if (this.isDestroyed) return;

    try {
      const baseUrl = await getApiBaseUrl();
      const url = `${baseUrl}/api/events`;

      logInfo("sse", "Connecting to SSE endpoint", { url });

      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener("open", () => {
        logInfo("sse", "SSE connection opened");
      });

      this.eventSource.addEventListener("connected", (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit("connected", data);
        } catch (error) {
          logError("sse", "Failed to parse connected event", { error });
        }
      });

      this.eventSource.addEventListener("heartbeat", (e) => {
        try {
          const data = JSON.parse(e.data);
          // Optional: log heartbeat only occasionally or not at all to avoid noise
          // this.emit("heartbeat", data); 
        } catch (error) {
           // ignore heartbeat errors
        }
      });

      this.eventSource.addEventListener("update", (e) => {
        try {
          const data = JSON.parse(e.data);
          logInfo("sse", "Received update event", data);
          this.emit("update", data);
        } catch (error) {
          logError("sse", "Failed to parse update event", { error });
        }
      });

      this.eventSource.onerror = (e) => {
        logError("sse", "SSE Error occurred", { event: e });
        this.reconnect();
      };

    } catch (error) {
      logError("sse", "Failed to initialize SSE connection", { error });
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.isDestroyed) return;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }

    // Exponential backoff or fixed delay? README suggests 5000ms
    logInfo("sse", "Scheduling reconnection in 5000ms");
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, 5000);
  }

  public on(event: SSEEventType, callback: SSECallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  private emit(event: SSEEventType, data: SSEEventData) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const sseService = new SSEService();



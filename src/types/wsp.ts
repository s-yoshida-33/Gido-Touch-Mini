export interface WspMedia {
  id: string;
  name: string;
  media_type: 'image' | 'video';
  filename: string;
  local_path: string;
  duration: number;
  layer: {
    x: number;
    y: number;
    width: number;
    height: number;
    sequence: number;
  };
}

export interface WspTimelineItem {
  timeline_index: number;
  start_time: string;
  end_time: string;
  start_time_local: string;
  end_time_local: string;
  duration_seconds: number;
  schedule_id: string;
  event_id: string;
  program_id: string;
  program_item_index: number;
  is_current: boolean;
  is_next: boolean;
  remaining_seconds: number;
  elapsed_seconds: number;
  progress_percent: number;
  media_count: number;
  media: WspMedia[];
}

export interface WspTimelineStatus {
  initialized: boolean;
  headless_mode: boolean;
  updating_timeline: boolean;
  schedule_id: string;
  current_item_index: number;
  next_item_index: number;
  scheduled_switch_time: string;
  seconds_until_switch: number;
}

export interface WspTimelineResponse {
  count: number;
  retrieved_at: string;
  current_time: string;
  current_time_local: string;
  status: WspTimelineStatus;
  timeline: WspTimelineItem[];
}

export interface WspCurrentTimelineResponse {
  retrieved_at: string;
  current_timeline: WspTimelineItem | null;
}

export type CurrentAsset = WspMedia;



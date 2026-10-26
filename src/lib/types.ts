export type Deadline = { label: string; at: string };
export type Broadcast = { station?: string; program?: string; segment?: string };

export type Artist = {
  id: string;
  name: string;
  aliases: string[];
  color: string;
  links: Record<string, string>;
  country: string;
  created_by: string | null;
};

export type EventRow = {
  id: string;
  artist_ids: string[];
  title: string;
  category: string;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  venue: string | null;
  url: string | null;
  source: string;
  fc_only: boolean;
  memo: string | null;
  broadcast: Broadcast | null;
  deadlines: Deadline[];
  owner_id: string | null;
  is_public: boolean;
  origin: "user" | "auto" | "mail";
  verified: boolean;
  external_id: string | null;
};

export type EventWithStatus = EventRow & { status: string };

export type Profile = {
  id: string;
  display_name: string | null;
  remind_days: number;
  notify_push: boolean;
  notify_email: boolean;
  notify_line: boolean;
  remind_before_start: number[];
  remind_before_deadline: number[];
  line_user_id: string | null;
  line_link_code: string | null;
  ics_token: string;
  inbound_token: string;
};

/** 告知文から読み取った予定の下書き */
export type EventDraft = {
  title: string;
  artist: string;
  category: string;
  source: string;
  start: string;
  end: string;
  venue: string;
  url: string;
  fc_only: boolean;
  deadlines: Deadline[];
  station: string;
  program: string;
  segment: string;
  memo: string;
};

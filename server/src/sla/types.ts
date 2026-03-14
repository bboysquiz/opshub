export type SlaSettingsRow = {
  low_minutes: number;
  medium_minutes: number;
  high_minutes: number;
  updated_at: Date | string;
};

export type SlaSettingsDto = {
  lowMinutes: number;
  mediumMinutes: number;
  highMinutes: number;
  updatedAt: Date | string;
};

export type UpdateSlaSettingsInput = {
  lowMinutes: number;
  mediumMinutes: number;
  highMinutes: number;
};

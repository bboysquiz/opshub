import {
  getSlaSettings as getSlaSettingsRepository,
  updateSlaSettings as updateSlaSettingsRepository,
} from './repository';
import type { SlaSettingsDto, UpdateSlaSettingsInput } from './types';

export async function getSlaSettings(): Promise<SlaSettingsDto> {
  return getSlaSettingsRepository();
}

export async function updateSlaSettings(input: UpdateSlaSettingsInput): Promise<SlaSettingsDto> {
  return updateSlaSettingsRepository(input);
}

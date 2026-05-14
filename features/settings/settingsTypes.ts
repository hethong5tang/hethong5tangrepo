import { SystemSettings, FundSettings } from "./types";
import { UserSettings } from '../users/types';

export interface SettingsState {
  systemSettings: SystemSettings;
  fundSettings: FundSettings;
  userSettings: UserSettings;
}

export type SettingsAction =
  | { type: 'UPDATE_SYSTEM_SETTINGS'; payload: Partial<SystemSettings> }
  | { type: 'RESET_SYSTEM_SETTINGS_TO_DEFAULT' }
  | { type: 'UPDATE_FUND_SETTINGS'; payload: FundSettings }
  | { type: 'UPDATE_USER_SETTINGS'; payload: UserSettings };

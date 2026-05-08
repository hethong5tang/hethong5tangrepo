import React from 'react';
import { CheckIcon, XCircleIcon } from './Icons';
import { PasswordValidationResult } from '../utils/validation';

interface PasswordStrengthMeterProps {
  validationResult: PasswordValidationResult['checks'];
}

const Requirement: React.FC<{ label: string; met: boolean }> = ({ label, met }) => (
  <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
    {met ? <CheckIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
    <span>{label}</span>
  </div>
);

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ validationResult }) => {
  if (!validationResult) return null;

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md mt-2 space-y-1.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Requirement label="Ít nhất 8 ký tự" met={validationResult.length} />
        <Requirement label="Chứa chữ hoa" met={validationResult.uppercase} />
        <Requirement label="Chứa chữ thường" met={validationResult.lowercase} />
        <Requirement label="Chứa số" met={validationResult.number} />
        <Requirement label="Ký tự đặc biệt" met={validationResult.specialChar} />
      </div>
    </div>
  );
};

export default React.memo(PasswordStrengthMeter);
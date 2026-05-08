import React from 'react';
import { SparklesIcon } from './Icons';

interface LogoDisplayProps {
  logoUrl?: string;
  logoText?: string;
  useWideLogo?: boolean;
  logoObjectPosition?: string;
  className?: string; // To allow for wrapper styles
}

const LogoDisplay: React.FC<LogoDisplayProps> = ({
  logoUrl,
  logoText,
  useWideLogo,
  logoObjectPosition,
  className,
}) => {
  if (useWideLogo && logoUrl) {
    return (
      <div className={`inline-block px-3 py-1 bg-slate-900 rounded-xl shadow-sm ${className}`}>
        <img
          src={logoUrl}
          alt={logoText || 'Logo'}
          className="h-14 w-auto max-w-md object-contain"
          style={{ objectPosition: logoObjectPosition || 'center' }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-xl shadow-sm ${className}`}>
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
      ) : (
        <SparklesIcon className="h-7 w-7 text-blue-500" />
      )}
      {logoText && (
        <span className="text-2xl font-bold text-white tracking-tight">{logoText}</span>
      )}
    </div>
  );
};

export default LogoDisplay;

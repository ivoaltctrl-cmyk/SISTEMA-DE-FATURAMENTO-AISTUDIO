import React from 'react';

interface WFSLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const WFSLogo: React.FC<WFSLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-16',
  };

  return (
    <div
      className={`inline-flex items-center justify-center bg-transparent select-none shrink-0 ${className}`}
    >
      <img
        src="/wfs-logo.png"
        alt="WFS – A SATS Company"
        referrerPolicy="no-referrer"
        className={`w-auto ${sizeClasses[size]} object-contain`}
      />
    </div>
  );
};


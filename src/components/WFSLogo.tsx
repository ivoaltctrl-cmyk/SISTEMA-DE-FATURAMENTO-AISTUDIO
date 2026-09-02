import React from 'react';

interface WFSLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'color' | 'white';
  showSubtitle?: boolean;
}

export const WFSLogo: React.FC<WFSLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'color',
}) => {
  // Height and responsive class scales preserving original logo aspect ratio
  const sizeClasses = {
    xs: 'h-6 max-h-6',
    sm: 'h-8 max-h-8',
    md: 'h-10 max-h-10',
    lg: 'h-14 max-h-14',
    xl: 'h-16 max-h-16',
  };

  const isWhite = variant === 'white';
  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`inline-flex items-center justify-center bg-transparent select-none ${className}`}>
      <img
        src="/wfs-logo.png"
        alt="WFS Logo"
        referrerPolicy="no-referrer"
        className={`w-auto ${selectedSizeClass} object-contain transition-transform duration-200 ${
          isWhite ? 'brightness-0 invert' : ''
        }`}
        style={{
          aspectRatio: 'auto',
        }}
      />
    </div>
  );
};


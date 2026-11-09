import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AlgoPrep Branding Logo Component
 * 
 * @param {'full' | 'icon' | 'mark-text'} variant - 'full' uses the full logo image, 'icon' uses mascot only, 'mark-text' uses icon + live typography
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl'} size - Preset sizing
 * @param {string} className - Additional CSS classes
 * @param {string | null} linkTo - Route to link to (default: '/', set null for non-link)
 */
export const Logo = ({
  variant = 'full',
  size = 'md',
  className = '',
  linkTo = '/'
}) => {
  // Height presets
  const sizeMap = {
    xs: { full: 'h-6', icon: 'w-5 h-5', text: 'text-sm' },
    sm: { full: 'h-7', icon: 'w-6 h-6', text: 'text-base' },
    md: { full: 'h-9', icon: 'w-8 h-8', text: 'text-xl' },
    lg: { full: 'h-12', icon: 'w-10 h-10', text: 'text-2xl' },
    xl: { full: 'h-16', icon: 'w-14 h-14', text: 'text-3xl' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (() => {
    if (variant === 'icon') {
      return (
        <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
          <img
            src="/logo-icon.png"
            alt="AlgoPrep mascot"
            className={`${currentSize.icon} object-contain transition-transform duration-200 group-hover:scale-105`}
          />
        </div>
      );
    }

    if (variant === 'mark-text') {
      return (
        <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
          <img
            src="/logo-icon.png"
            alt="AlgoPrep mascot"
            className={`${currentSize.icon} object-contain transition-transform duration-200 group-hover:scale-105`}
          />
          <span className={`font-extrabold tracking-tight text-white ${currentSize.text} flex items-center`}>
            Algo<span className="text-[#ffa116]">Prep</span>
          </span>
        </div>
      );
    }

    // Default: 'full' graphic lockup
    return (
      <img
        src="/logo.png"
        alt="AlgoPrep"
        className={`${currentSize.full} w-auto object-contain shrink-0 transition-opacity duration-200 group-hover:opacity-95 ${className}`}
      />
    );
  })();

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex items-center group select-none">
        {content}
      </Link>
    );
  }

  return <div className="inline-flex items-center select-none">{content}</div>;
};

export default Logo;

'use client';
import { ButtonHTMLAttributes } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'blush' | 'dark';
  fullWidth?: boolean;
}

export function PrimaryButton({ children, variant = 'primary', fullWidth = false, style, ...props }: PrimaryButtonProps) {
  const bg = variant === 'primary' ? 'var(--primary)' : variant === 'blush' ? 'var(--blush)' : 'var(--plum)';
  const fg = variant === 'blush' ? 'var(--plum)' : 'var(--ivory)';
  const shadow = variant === 'primary' ? 'var(--shadow-pop)' : '0 8px 24px rgba(44,14,38,0.18)';

  return (
    <button
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '16px 28px',
        borderRadius: 'var(--r-pill)',
        background: bg,
        color: fg,
        border: 'none',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.4 : 1,
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--serif)',
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: 0.2,
        boxShadow: shadow,
        transition: 'transform .15s, box-shadow .15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}

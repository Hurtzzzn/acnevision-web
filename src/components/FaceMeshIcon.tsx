import type { SVGProps } from 'react';

interface FaceMeshIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number;
  strokeWidth?: number;
}

export function FaceMeshIcon({ size = 18, strokeWidth = 1.75, className, ...rest }: FaceMeshIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d="M12 2.8c-4.4 0-6.7 3.1-6.7 7 0 5.2 2.8 9.6 6.7 11.4 3.9-1.8 6.7-6.2 6.7-11.4 0-3.9-2.3-7-6.7-7Z" />
      <path d="M8.3 10.2c.9-.8 2-.8 2.8 0 M12.9 10.2c.9-.8 1.9-.8 2.8 0 M12 10.6v3.1l-1 .7 M9.9 16.7c1.4 1 3 1 4.4 0" />
      <path
        strokeWidth={0.8}
        opacity={0.55}
        d="M12 2.8V7 M5.3 11.4 9.6 14 M18.7 11.4 14.4 14 M9.6 14l.3 2.7 M14.4 14l-.3 2.7 M9.9 16.7 12 21.2 14.1 16.7 M6.8 6.2 9.4 8.3 M17.2 6.2 14.6 8.3 M12 7 9.4 8.3 M12 7 14.6 8.3"
      />
    </svg>
  );
}

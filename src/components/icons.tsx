import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="40"
      height="40"
      {...props}
    >
      <defs>
        <style>
          {`
            .logo-text {
              font-family: 'Belleza', sans-serif;
              font-size: 28px;
              fill: hsl(var(--primary-foreground));
            }
          `}
        </style>
      </defs>
      <path
        d="M50,90 C72.09139,90 90,72.09139 90,50 C90,27.90861 72.09139,10 50,10 C27.90861,10 10,27.90861 10,50 C10,72.09139 27.90861,90 50,90 Z"
        fill="hsl(var(--primary))"
      />
      <path
        d="M65,35 A20,20 0 0,0 35,35 A20,20 0 0,0 65,35 M50,20 A15,15 0 0,1 65,35 M50,20 A15,15 0 0,0 35,35 M30,60 Q50,70 70,60 Q50,80 30,60"
        fill="none"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      <text x="50" y="58" textAnchor="middle" className="logo-text">
        A&A
      </text>
    </svg>
  );
}

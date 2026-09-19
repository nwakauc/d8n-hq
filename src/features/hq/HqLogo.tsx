type HqLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Shared HQ mark: a shield with a decisive check for trusted operations. */
export function HqLogo({ size = 32, className, title = "D8N HQ" }: HqLogoProps) {
  const titleId = `hq-logo-title-${size}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-labelledby={titleId}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id="hq-logo-gradient" x1="7" y1="4" x2="33" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9A8CFF" />
          <stop offset="1" stopColor="#5549D1" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.8 34 8v10.4c0 8.6-5.5 15.2-14 18.8C11.5 33.6 6 27 6 18.4V8l14-5.2Z"
        fill="url(#hq-logo-gradient)"
      />
      <path
        d="m12.4 19.8 5 5 10.5-10.7"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.4"
      />
    </svg>
  );
}

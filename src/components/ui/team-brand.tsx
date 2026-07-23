import Image from "next/image";

export function TeamLogo({ size = 36, className = "", onDark = false }: { size?: number; className?: string; onDark?: boolean }) {
  if (onDark) {
    return <Image src="/logo/clear-lion-mark-dark.png" alt="CLEAR FC" width={size} height={size} className={className || "object-contain"} />;
  }
  return (
    <span className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <Image src="/logo/clear-lion-mark.png" alt="CLEAR FC" width={size} height={size} className="home-brand-light h-full w-full object-contain" />
      <Image src="/logo/clear-lion-mark-dark.png" alt="" aria-hidden="true" width={size} height={size} className="home-brand-dark h-full w-full object-contain" />
    </span>
  );
}

export function TeamWordmark({ width = 180, className = "", onDark = false }: { width?: number; className?: string; onDark?: boolean }) {
  const height = Math.round(width * (209 / 1667));
  if (onDark) {
    return <Image src="/logo/clear-fc-wordmark-upright.png" alt="CLEAR FC" width={width} height={height} className={`${className || "h-auto object-contain"} brightness-0 invert`} />;
  }
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <Image src="/logo/clear-fc-wordmark-upright.png" alt="CLEAR FC" width={width} height={height} className="home-brand-light h-auto w-full object-contain" />
      <Image src="/logo/clear-fc-wordmark-upright.png" alt="" aria-hidden="true" width={width} height={height} className="home-brand-dark h-auto w-full object-contain brightness-0 invert" />
    </span>
  );
}

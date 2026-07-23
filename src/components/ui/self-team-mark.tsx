type SelfTeamMarkProps = {
  tone: "red" | "blue";
  size?: number;
  className?: string;
};

export function SelfTeamMark({ tone, size = 44, className = "" }: SelfTeamMarkProps) {
  const red = tone === "red";
  const frame = red
    ? "linear-gradient(145deg, #fff 0%, #f7c6cb 32%, #9f1727 100%)"
    : "linear-gradient(145deg, #d9f2ff 0%, #69bee9 35%, #07518c 100%)";
  const face = red
    ? [
        "linear-gradient(180deg, rgba(255,255,255,.52) 0%, rgba(255,255,255,.08) 42%, rgba(89,7,18,.28) 100%)",
        "repeating-linear-gradient(90deg, #ec5360 0 7px, #fff 7px 14px)",
      ].join(",")
    : [
        "radial-gradient(circle at 28% 18%, rgba(255,255,255,.72) 0%, rgba(255,255,255,.18) 27%, transparent 44%)",
        "linear-gradient(155deg, #77cef2 0%, #2c98d2 48%, #1268ac 72%, #084b85 100%)",
      ].join(",");

  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 rounded-[14px] ${className}`}
      style={{
        width: size,
        height: size,
        padding: 2,
        background: frame,
        boxShadow: red
          ? "0 7px 13px rgba(159,23,39,.25), 0 2px 3px rgba(91,10,20,.22), inset 0 1px 1px rgba(255,255,255,.9)"
          : "0 7px 13px rgba(7,81,140,.27), 0 2px 3px rgba(4,57,101,.24), inset 0 1px 1px rgba(255,255,255,.9)",
      }}
    >
      <span
        className="relative block h-full w-full overflow-hidden rounded-[11px]"
        style={{
          background: face,
          boxShadow: "inset 0 1px 1px rgba(255,255,255,.78), inset 0 -3px 5px rgba(0,0,0,.2)",
        }}
      >
        <span className="absolute inset-x-[3px] top-[2px] h-[28%] rounded-full bg-white/35 blur-[0.5px]" />
        <span className="absolute inset-x-[4px] bottom-[3px] h-px bg-black/15" />
        <span className="absolute bottom-[5px] right-[5px] h-[5px] w-[5px] rounded-full bg-white/25" />
      </span>
    </span>
  );
}

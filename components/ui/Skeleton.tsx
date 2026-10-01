type SkeletonProps = {
  className?: string;
};

export default function Skeleton({
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl bg-[#E7EDF1]",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-[skeleton_1.4s_infinite]",
        "before:bg-gradient-to-r",
        "before:from-transparent",
        "before:via-white/80",
        "before:to-transparent",
        className,
      ].join(" ")}
    />
  );
}
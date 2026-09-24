type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeaderProps) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#bfa1d9]">
          {eyebrow}
        </div>
      )}

      <h2 className="site-title text-3xl font-black leading-tight text-white md:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-4 text-base leading-7 text-[#aaa3b5]">
          {description}
        </p>
      )}
    </div>
  );
}

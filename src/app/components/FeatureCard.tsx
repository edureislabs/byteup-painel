type FeatureCardProps = {

  title: string;
  description: string;
};

export default function FeatureCard({title, description }: FeatureCardProps) {
  return (
    <article className="group site-card-soft p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]">
    

      <h3 className="text-lg font-black text-[#b64cff]">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-[#aaa3b5]">{description}</p>

      <div className="mt-5 h-px w-10 bg-white/15 transition-all duration-200 group-hover:w-20" />
    </article>
  );
}

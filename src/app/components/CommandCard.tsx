type CommandCardProps = {
  command: string;
  description: string;
};

export default function CommandCard({ command, description }: CommandCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:justify-between">
      <code className="w-fit rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-bold text-[#ead9ff]">
        {command}
      </code>

      <p className="text-sm leading-6 text-[#aaa3b5] sm:max-w-[66%]">
        {description}
      </p>
    </div>
  );
}

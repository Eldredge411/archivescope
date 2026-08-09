type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {eyebrow ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      </div>
    </section>
  );
}

import { cn } from '@kit/ui/utils';

export function LegalDocument({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <article
      className={cn(
        'text-foreground mx-auto flex max-w-3xl flex-col gap-8 pb-16',
        className,
      )}
    >
      {children}
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: React.PropsWithChildren<{ title: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function LegalParagraph({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <p className={cn('text-muted-foreground leading-relaxed', className)}>
      {children}
    </p>
  );
}

export function LegalList({
  items,
}: {
  items: React.ReactNode[];
}) {
  return (
    <ul className="text-muted-foreground flex list-disc flex-col gap-2 pl-5 leading-relaxed">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

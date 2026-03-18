import { cn } from "@/lib/utils";

type SectionHeadingProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  invert?: boolean;
  className?: string;
}>;

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  invert = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        align === "center" && "mx-auto max-w-3xl text-center",
        className,
      )}
    >
      <p
        className={cn(
          "text-sm font-semibold uppercase tracking-[0.24em]",
          invert ? "text-secondary" : "text-primary",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "text-3xl font-semibold tracking-tight lg:text-5xl",
          invert ? "text-background" : "text-foreground",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "text-base leading-8 lg:text-lg",
          invert ? "text-background/75" : "text-muted-foreground",
        )}
      >
        {description}
      </p>
    </div>
  );
}

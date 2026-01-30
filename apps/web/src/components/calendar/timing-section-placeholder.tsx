export const TimingSectionPlaceholder = () => {
  return (
    <div className="space-y-4 opacity-40">
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <div className="h-8 w-32 bg-muted-foreground/20 rounded" />
        <div className="h-8 w-24 bg-muted-foreground/20 rounded" />
      </div>

      <div className="space-y-3">
        <div className="h-6 w-32 bg-muted-foreground/20 rounded" />
        <div className="h-4 w-48 bg-muted-foreground/20 rounded" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted-foreground/20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};

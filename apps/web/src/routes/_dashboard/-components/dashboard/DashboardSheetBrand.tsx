import { SheetTitle } from "@/components/ui/sheet";
import { AppConfig } from "@/utils/system";

export function DashboardSheetBrand({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <AppConfig.icon className="size-8 text-primary" />
      <div className="flex flex-col leading-tight">
        <span className="font-serif text-sm tracking-tight">{AppConfig.wordmark}</span>
        <SheetTitle className="text-xs font-normal text-muted-foreground">{title}</SheetTitle>
      </div>
    </div>
  );
}

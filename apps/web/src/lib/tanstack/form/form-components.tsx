import { Button } from "@/components/ui/button";
import { useFormContext } from "./form-context";

interface SubmitButtonProps {
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SubmitButton({ label = "Submit", className, children }: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => ({
        isSubmitting: state.isSubmitting,
      })}
    >
      {({ isSubmitting }) => (
        <Button type="submit" disabled={isSubmitting} className={className}>
          {children || (isSubmitting ? "Submitting..." : label)}
        </Button>
      )}
    </form.Subscribe>
  );
}

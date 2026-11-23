import { Button } from "@/components/ui/button";
import { useFormContext } from "./form-context";

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SubmitButton({
  label = "Submit",
  className,
  children,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => ({
        isSubmitting: state.isSubmitting,
      })}
    >
      {({ isSubmitting }) => (
        <Button type="submit" disabled={isSubmitting} className={className} {...props}>
          {children || (isSubmitting ? "Submitting..." : label)}
        </Button>
      )}
    </form.Subscribe>
  );
}

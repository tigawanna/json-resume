import { concatErrors } from "@/utils/concaterrors";

interface ErrorOutputProps {
  err: any;
}

export function ErrorWrapper({ err }: ErrorOutputProps) {
  return <div className="text-error w-full rounded-lg p-2 text-center">{concatErrors(err)}</div>;
}

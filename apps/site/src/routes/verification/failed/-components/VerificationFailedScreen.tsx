import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { CircleX } from "lucide-react";
import { MobileStatusBar } from "./MobileStatusBar";

const issues = [
  "Document image was unclear or blurry",
  "Selfie didn't match ID photo",
  "Poor lighting conditions",
];

function StripeMark() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      className="shrink-0"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#635BFF"
        d="M13.976 9.15c-2.172-.807-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.03c0 3.212 1.884 4.812 5.419 6.19 1.718.602 2.502 1.23 2.502 2.102 0 .98-.797 1.546-2.226 1.546-1.9 0-4.444-.853-6.304-1.894l-.833 5.468c2.163 1.093 4.81 1.657 7.48 1.657 2.634 0 4.778-.62 6.246-1.811 1.497-1.214 2.276-2.874 2.276-4.96 0-3.372-1.924-5.063-5.429-6.403z"
      />
    </svg>
  );
}

export function VerificationFailedScreen() {
  return (
    <div
      className="bg-background text-[#0B1F3B] flex min-h-dvh w-full flex-col"
      data-test="verification-failed-screen"
    >
      <MobileStatusBar className="bg-white" />
      <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col bg-white px-4 pt-6 pb-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex w-full flex-col items-center gap-6">
            <div
              className="flex size-[120px] items-center justify-center rounded-full bg-[#EF4444]/20"
              aria-hidden
            >
              <CircleX className="size-[60px] text-[#EF4444]" strokeWidth={1.75} />
            </div>
            <div className="flex w-full flex-col items-center gap-3 text-center">
              <h1 className="text-[#EF4444] text-2xl font-bold leading-8">Verification Failed</h1>
              <p className="text-[#717182] max-w-[306px] text-base leading-6">Please try again.</p>
            </div>
          </div>

          <div className="bg-[#EF4444]/20 text-[#EF4444] w-full rounded-2xl p-4 text-sm leading-5">
            <p className="font-semibold">Common Issues:</p>
            <ul className="mt-2 flex flex-col gap-2 font-normal">
              {issues.map((line) => (
                <li key={line} className="flex gap-2 text-left">
                  <span aria-hidden>•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-[#0B1F3B]/15 w-full max-w-[300px] border-t" />

          <div className="text-[#717182] flex items-center justify-center gap-2 text-xs leading-4">
            <span>Powered by</span>
            <span className="text-[#635BFF] flex items-center gap-1 text-sm font-bold">
              <StripeMark />
              Stripe
            </span>
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col gap-3">
          <Button
            type="button"
            className="h-12 w-full rounded-[10px] bg-[#EF4444] text-base font-semibold text-white hover:bg-[#EF4444]/90"
            onClick={() => window.history.back()}
            data-test="verification-try-again"
          >
            Try Again
          </Button>
          <Button
            variant="ghost"
            className="text-[#0B1F3B] h-12 w-full rounded-[10px] text-base font-semibold hover:bg-[#0B1F3B]/5"
            asChild data-test="verification-go-dashboard"
          >
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
      <div className="flex h-8 w-full shrink-0 items-end justify-center bg-white pb-2">
        <div className="bg-[#0B1F3B] h-1 w-[134px] rounded-[10px]" aria-hidden />
      </div>
    </div>
  );
}

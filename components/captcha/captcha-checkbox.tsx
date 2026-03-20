"use client";

import { cn } from "@/lib/utils";

type CheckboxState = "idle" | "loading" | "challenge" | "verified" | "failed" | "error";

interface CaptchaCheckboxProps {
  onRequestChallenge: () => void;
  state: CheckboxState;
  brandName?: string;
  errorText?: string | null;
}

function Spinner() {
  return (
    <svg className="size-7 animate-captcha-spin" viewBox="0 0 36 36">
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke="#4285f4"
        strokeWidth="3"
        strokeDasharray="60 40"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AnimatedCheckmark() {
  return (
    <svg className="size-7" viewBox="0 0 100 100">
      <path
        d="M25 55 L40 70 L75 35"
        fill="none"
        stroke="#009F54"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="100"
        strokeDashoffset="100"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="100"
          to="0"
          dur="0.4s"
          fill="freeze"
        />
      </path>
    </svg>
  );
}

function AnimatedX() {
  return (
    <svg className="size-7" viewBox="0 0 100 100">
      <path
        d="M30 30 L70 70"
        fill="none"
        stroke="#e53935"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="57"
        strokeDashoffset="57"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="57"
          to="0"
          dur="0.2s"
          fill="freeze"
        />
      </path>
      <path
        d="M70 30 L30 70"
        fill="none"
        stroke="#e53935"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="57"
        strokeDashoffset="57"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="57"
          to="0"
          dur="0.2s"
          begin="0.15s"
          fill="freeze"
        />
      </path>
    </svg>
  );
}

export function CaptchaCheckbox({
  onRequestChallenge,
  state,
  brandName = "yCAPTCHA",
  errorText,
}: CaptchaCheckboxProps) {
  const handleClick = () => {
    if (state !== "idle") return;
    onRequestChallenge();
  };

  const renderCheckbox = () => {
    if (state === "loading") return <Spinner />;
    if (state === "verified") return <AnimatedCheckmark />;
    if (state === "failed" || state === "error") return <AnimatedX />;

    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex size-7 items-center justify-center rounded-sm border-2 border-[#c1c1c1] bg-white transition-colors hover:border-[#b0b0b0]"
        aria-label="I'm not a robot"
      />
    );
  };

  return (
    <div
      className="flex w-76 items-center justify-between rounded-sm border border-[#d3d3d3] bg-[#f9f9f9] px-3 py-2.5 shadow-sm"
      style={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif" }}
    >
      <div className="flex items-center gap-3">
        {renderCheckbox()}
        {state === "error" ? (
          <span className="text-[12px] font-medium text-[#e53935]">
            ERROR: {errorText ?? "Something went wrong"}
          </span>
        ) : (
          <span className="text-[14px] text-[#555]">I&apos;m not a robot</span>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <img src="/favicon.ico" alt={brandName} width={24} height={24} />
        <span className="text-[9px] font-bold leading-none text-[#555]">
          {brandName}
        </span>
        <span className="mt-px text-[7px] leading-none text-[#999]">
          Privacy - Terms
        </span>
      </div>
    </div>
  );
}

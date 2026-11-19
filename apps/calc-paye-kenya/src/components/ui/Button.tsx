import { Button as TcButton } from "terracotta/button";
import type { JSX } from "@solidjs/web";

type Variant = "default" | "selected" | "ghost" | "outline" | "link" | "danger";

interface ButtonProps {
  variant?: Variant;
  size?: "sm" | "icon" | "default";
  class?: string;
  disabled?: boolean;
  pressed?: boolean;
  label?: string;
  onClick?: () => void;
  children?: JSX.Element;
}

/** Terracotta button with the shadcn-like skin from styles/terracotta.css. */
export function Button(props: ButtonProps) {
  return (
    <TcButton
      type="button"
      class={[
        "tc-btn",
        `tc-btn-${props.variant ?? "default"}`,
        props.size === "sm" ? "tc-btn-sm" : "",
        props.size === "icon" ? "tc-btn-icon" : "",
        props.class,
      ]}
      disabled={props.disabled}
      aria-pressed={props.pressed ? "true" : undefined}
      aria-label={props.label}
      onClick={props.onClick}>
      {props.children}
    </TcButton>
  );
}

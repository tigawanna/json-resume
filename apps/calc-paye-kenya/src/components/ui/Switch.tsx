import { Switch as TcSwitch } from "terracotta/switch";

export function Switch(props: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <TcSwitch class="tc-switch" checked={props.checked} onChange={props.onChange} aria-label={props.label}>
      <span class="switch-knob" aria-hidden="true" />
    </TcSwitch>
  );
}

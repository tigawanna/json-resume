import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useFieldContext } from "./form-context";

type Orientation = "vertical" | "horizontal" | "responsive";

interface BaseFieldProps {
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  orientation?: Orientation;
}

function toFieldErrors(errors: Array<{ message?: string } | string | undefined>) {
  return errors
    .filter(Boolean)
    .map((error) => (typeof error === "string" ? { message: error } : error)) as Array<{
    message?: string;
  }>;
}

function FieldErrorMessage({ className }: { className?: string }) {
  const field = useFieldContext<any>();
  const errors = toFieldErrors(field.state.meta.errors);
  if (!errors.length) return null;

  return <FieldError className={className} errors={errors} />;
}

function buildCommonProps(
  label: string | undefined,
  placeholder: string | undefined,
  name: string,
) {
  const fieldLabel = label || name;
  const fieldPlaceholder = placeholder || `Enter ${fieldLabel}`;
  return { fieldLabel, fieldPlaceholder } as const;
}

/** Field names repeat across forms on one page, so ids must not be the bare name. */
function useFieldInputId(name: string) {
  return `${React.useId()}-${name}`;
}

function isInvalid(errors: Array<any>) {
  return errors.length > 0;
}

export function TextField({
  label,
  description,
  placeholder,
  className,
  orientation = "vertical",
  ...inputProps
}: BaseFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const field = useFieldContext<string>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);
  const { fieldLabel, fieldPlaceholder } = buildCommonProps(
    label,
    placeholder,
    field.name as string,
  );

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <FieldLabel htmlFor={inputId}>{fieldLabel}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldContent>
        <Input
          id={inputId}
          name={field.name as string}
          placeholder={fieldPlaceholder}
          aria-invalid={invalid}
          {...inputProps}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      </FieldContent>
      <FieldErrorMessage />
    </Field>
  );
}

export function PasswordField({
  label,
  description,
  placeholder,
  className,
  showPassword = false,
  orientation = "vertical",
  ...inputProps
}: BaseFieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
    showPassword?: boolean;
  }) {
  const field = useFieldContext<string>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);
  const { fieldLabel, fieldPlaceholder } = buildCommonProps(
    label,
    placeholder,
    field.name as string,
  );

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <FieldLabel htmlFor={inputId}>{fieldLabel}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldContent>
        <Input
          id={inputId}
          name={field.name as string}
          type={showPassword ? "text" : "password"}
          placeholder={fieldPlaceholder}
          aria-invalid={invalid}
          {...inputProps}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      </FieldContent>
      <FieldErrorMessage />
    </Field>
  );
}

export function TextAreaField({
  label,
  description,
  placeholder,
  className,
  orientation = "vertical",
  ...textareaProps
}: BaseFieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const field = useFieldContext<string>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);
  const { fieldLabel, fieldPlaceholder } = buildCommonProps(
    label,
    placeholder,
    field.name as string,
  );
  const textareaClassName = "min-h-[120px]";

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <FieldLabel htmlFor={inputId}>{fieldLabel}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldContent>
        <Textarea
          id={inputId}
          name={field.name as string}
          placeholder={fieldPlaceholder}
          aria-invalid={invalid}
          {...textareaProps}
          className={textareaClassName}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      </FieldContent>
      <FieldErrorMessage />
    </Field>
  );
}

export function EmailField({
  label = "Email",
  description,
  placeholder = "Enter your email",
  className,
  orientation = "vertical",
  ...inputProps
}: BaseFieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const field = useFieldContext<string>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldContent>
        <Input
          id={inputId}
          name={field.name as string}
          type="email"
          placeholder={placeholder}
          autoComplete="email"
          aria-invalid={invalid}
          {...inputProps}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      </FieldContent>
      <FieldErrorMessage />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  description,
  placeholder = "Select",
  className,
  orientation = "vertical",
  items,
}: BaseFieldProps & {
  items: { label: string; value: T }[];
}) {
  const field = useFieldContext<T>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);
  const { fieldLabel } = buildCommonProps(label, placeholder, field.name as string);

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <FieldContent>
        {fieldLabel ? <FieldLabel htmlFor={inputId}>{fieldLabel}</FieldLabel> : null}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        <Select
          name={field.name as string}
          value={(field.state.value as string) ?? ""}
          onValueChange={(value) => field.handleChange(value as T)}
        >
          <SelectTrigger id={inputId} aria-invalid={invalid} className="min-w-40">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldErrorMessage />
      </FieldContent>
    </Field>
  );
}

export function CheckboxField({
  label,
  description,
  className,
  orientation = "horizontal",
}: BaseFieldProps) {
  const field = useFieldContext<boolean>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);
  const fieldLabel = label || (field.name as string);

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <Checkbox
        id={inputId}
        name={field.name as string}
        checked={field.state.value ?? false}
        aria-invalid={invalid}
        onCheckedChange={(checked) => field.handleChange(checked === true)}
      />
      <FieldContent>
        <FieldLabel htmlFor={inputId} className="font-normal">
          {fieldLabel}
        </FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        <FieldErrorMessage />
      </FieldContent>
    </Field>
  );
}

export function SwitchField({
  label,
  description,
  className,
  orientation = "horizontal",
}: BaseFieldProps) {
  const field = useFieldContext<boolean>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);
  const fieldLabel = label || (field.name as string);

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <FieldContent>
        <FieldLabel htmlFor={inputId}>{fieldLabel}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        <FieldErrorMessage />
      </FieldContent>
      <Switch
        id={inputId}
        name={field.name as string}
        checked={field.state.value ?? false}
        onCheckedChange={(checked) => field.handleChange(checked === true)}
        aria-invalid={invalid}
      />
    </Field>
  );
}

export function RadioGroupField<T extends string>({
  label,
  description,
  className,
  orientation = "vertical",
  items,
}: BaseFieldProps & {
  items: { label: string; description?: string; value: T }[];
}) {
  const field = useFieldContext<T>();
  const errors = toFieldErrors(field.state.meta.errors);
  const invalid = isInvalid(errors);
  const inputId = useFieldInputId(field.name);
  const fieldLabel = label || (field.name as string);

  return (
    <Field data-invalid={invalid} orientation={orientation} className={className}>
      <FieldContent>
        <FieldLabel>{fieldLabel}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        <RadioGroup
          name={field.name as string}
          value={(field.state.value as T) ?? ("" as T)}
          onValueChange={(value) => field.handleChange(value as T)}
          className="flex flex-col gap-3"
        >
          {items.map((item) => (
            <Field
              key={item.value}
              orientation="horizontal"
              data-invalid={invalid}
              className="items-center"
            >
              <FieldContent>
                <FieldTitle>{item.label}</FieldTitle>
                {item.description ? <FieldDescription>{item.description}</FieldDescription> : null}
              </FieldContent>
              <RadioGroupItem
                value={item.value}
                id={`${inputId}-${item.value}`}
                aria-invalid={invalid}
              />
            </Field>
          ))}
        </RadioGroup>
        <FieldErrorMessage />
      </FieldContent>
    </Field>
  );
}

export { FieldErrorMessage };

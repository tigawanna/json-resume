import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JOB_STATUS_OPTIONS, updateJob } from "@/data-access-layer/event-sourced/rows/job-rows";
import {
  centsToDollarInput,
  dollarsToCents,
  quotePayRate,
} from "@/data-access-layer/event-sourced/rows/pay-quote";
import type { Job, JobStatus } from "@/data-access-layer/event-sourced/schemas";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";

const editOpts = formOptions({
  defaultValues: {
    company: "",
    title: "",
    description: "",
    location: "",
    payRate: "",
    hourlyMinUsd: "",
    hourlyMaxUsd: "",
    url: "",
    status: "saved" as JobStatus,
    notes: "",
  },
});

interface JobEditFormProps {
  item: Job;
  onSuccess?: () => void;
}

export function JobEditForm({ item, onSuccess }: JobEditFormProps) {
  const db = useEventSourcedDb();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...editOpts,
    defaultValues: {
      company: item.company,
      title: item.title,
      description: item.description,
      location: item.location,
      payRate: item.payRate,
      hourlyMinUsd: centsToDollarInput(item.hourlyMinCents),
      hourlyMaxUsd: centsToDollarInput(item.hourlyMaxCents),
      url: item.url,
      status: item.status,
      notes: item.notes,
    },
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        updateJob(db, item.id, {
          company: value.company,
          title: value.title,
          description: value.description,
          location: value.location,
          payRate: value.payRate,
          hourlyMinCents: dollarsToCents(value.hourlyMinUsd),
          hourlyMaxCents: dollarsToCents(value.hourlyMaxUsd),
          url: value.url,
          status: value.status,
          notes: value.notes,
        });
        toast.success("Job saved");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to save job", {
          description: unwrapUnknownError(err).message,
        });
      } finally {
        setPending(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="company">
          {(field) => (
            <div>
              <Label className="text-xs">Company</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
                placeholder="Optional"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="title">
          {(field) => (
            <div>
              <Label className="text-xs">Role title</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.AppField
        name="description"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Job description is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Job description</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 min-h-32"
            />
          </div>
        )}
      </form.AppField>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="location">
          {(field) => (
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="payRate">
          {(field) => (
            <div>
              <Label className="text-xs">Pay rate</Label>
              <Input
                value={field.state.value}
                onChange={(e) => {
                  const next = e.target.value;
                  field.handleChange(next);
                  const quote = quotePayRate(`${next}\n${form.getFieldValue("description")}`);
                  form.setFieldValue("hourlyMinUsd", centsToDollarInput(quote.hourlyMinCents));
                  form.setFieldValue("hourlyMaxUsd", centsToDollarInput(quote.hourlyMaxCents));
                }}
                className="mt-1"
                data-test="job-pay-rate"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="hourlyMinUsd">
          {(field) => (
            <div>
              <Label className="text-xs">Hourly min (USD)</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
                inputMode="decimal"
                data-test="job-hourly-min"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="hourlyMaxUsd">
          {(field) => (
            <div>
              <Label className="text-xs">Hourly max (USD)</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
                inputMode="decimal"
                data-test="job-hourly-max"
              />
            </div>
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.payRate}>
          {(payRate) => (
            <p className="text-muted-foreground sm:col-span-2 text-xs">
              {item.payBasis || (payRate.trim() ? quotePayRate(payRate).basis : "")}
            </p>
          )}
        </form.Subscribe>
        <form.AppField name="url">
          {(field) => (
            <div>
              <Label className="text-xs">Posting URL</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.AppField name="status">
        {(field) => (
          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as JobStatus)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.AppField>
      <form.AppField name="notes">
        {(field) => (
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 min-h-16"
            />
          </div>
        )}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.description.trim());
          return (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={pending}
              >
                Reset
              </Button>
              <Button type="submit" disabled={pending || !hasRequired || !form.state.isFormValid}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

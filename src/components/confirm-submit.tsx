"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * A submit button that confirms before firing its form's server action.
 * Uses the native confirm dialog and disables during submission to prevent duplicate clicks.
 */
export function ConfirmSubmit({
  message,
  children,
  ...props
}: Omit<ButtonProps, "type"> & { message: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-disabled={pending || props.disabled}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
      {children}
    </Button>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      {...props}
    >
      {pending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}

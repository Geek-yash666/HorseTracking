"use client";

import { useRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * A submit button that confirms before firing its form's server action.
 * Uses the native confirm dialog on purpose: it blocks reliably inside
 * progressive-enhancement forms (no JS state to get out of sync) and
 * works the same on every device a barn hand might be holding.
 */
export function ConfirmSubmit({
  message,
  children,
  ...props
}: Omit<ButtonProps, "type" | "onClick"> & { message: string }) {
  const clickedRef = useRef(false);

  return (
    <Button
      {...props}
      type="submit"
      onClick={(event) => {
        if (clickedRef.current) return; // second click after confirm
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        clickedRef.current = true;
        // Reset in case the action fails and the form stays mounted.
        window.setTimeout(() => (clickedRef.current = false), 1000);
      }}
    >
      {children}
    </Button>
  );
}

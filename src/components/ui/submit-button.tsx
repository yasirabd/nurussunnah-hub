"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingText?: string;
  disabled?: boolean;
  className?: string;
};

export function SubmitButton({
  children,
  pendingText = "Mengirim...",
  disabled = false,
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} className={className}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? pendingText : children}
    </Button>
  );
}

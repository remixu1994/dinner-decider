"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import type { ActionFormState } from "@/lib/action-state";
import { INITIAL_ACTION_STATE } from "@/lib/action-state";

type ServerFormAction = (
  state: ActionFormState,
  formData: FormData,
) => Promise<ActionFormState>;

function useTransientActionState(state: ActionFormState, durationMs = 2600) {
  const [dismissedNonce, setDismissedNonce] = useState(0);

  useEffect(() => {
    if (state.nonce === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDismissedNonce(state.nonce);
    }, durationMs);

    return () => window.clearTimeout(timeout);
  }, [durationMs, state.nonce]);

  return state.nonce > 0 && state.nonce !== dismissedNonce ? state : INITIAL_ACTION_STATE;
}

function FeedbackMessage({
  state,
  className = "",
}: {
  state: ActionFormState;
  className?: string;
}) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <p
      className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"} ${className}`}
    >
      {state.message}
    </p>
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  className,
  disabled = false,
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button className={className} disabled={isDisabled}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function ActionStatusForm({
  action,
  children,
  className,
  submitLabel,
  pendingLabel,
  submitClassName,
  footerClassName,
  messageClassName,
  submitDisabled = false,
}: {
  action: ServerFormAction;
  children: ReactNode;
  className?: string;
  submitLabel: string;
  pendingLabel: string;
  submitClassName?: string;
  footerClassName?: string;
  messageClassName?: string;
  submitDisabled?: boolean;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const visibleState = useTransientActionState(state);

  return (
    <form action={formAction} className={className}>
      {children}
      <div className={footerClassName ?? "mt-4 flex flex-col gap-2"}>
        <SubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className={submitClassName}
          disabled={submitDisabled}
        />
        <FeedbackMessage state={visibleState} className={messageClassName} />
      </div>
    </form>
  );
}

export function InlineActionButtonForm({
  action,
  children,
  label,
  pendingLabel,
  className,
  buttonClassName,
  messageClassName,
  showMessage = true,
  disabled = false,
  refreshOnSuccess = false,
}: {
  action: ServerFormAction;
  children?: ReactNode;
  label: string;
  pendingLabel: string;
  className?: string;
  buttonClassName?: string;
  messageClassName?: string;
  showMessage?: boolean;
  disabled?: boolean;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const visibleState = useTransientActionState(state);

  useEffect(() => {
    if (refreshOnSuccess && state.status === "success" && state.nonce > 0) {
      router.refresh();
    }
  }, [refreshOnSuccess, router, state.nonce, state.status]);

  return (
    <form action={formAction} className={className}>
      {children}
      <SubmitButton
        idleLabel={label}
        pendingLabel={pendingLabel}
        className={buttonClassName}
        disabled={disabled}
      />
      {showMessage ? (
        <FeedbackMessage
          state={visibleState}
          className={messageClassName ?? "mt-2"}
        />
      ) : null}
    </form>
  );
}

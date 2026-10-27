export const container = "mx-auto w-full max-w-screen-2xl px-6 lg:px-12";

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full whitespace-nowrap font-medium";

export const buttonPrimary = `${buttonBase} bg-accent px-5 py-2.5 text-sm text-accent-contrast transition-opacity hover:opacity-90`;

export const buttonProvider = `${buttonBase} bg-foreground px-5 py-2.5 text-sm text-background transition-opacity hover:opacity-90`;

export const buttonSecondary = `${buttonBase} border border-border bg-card px-5 py-2.5 text-sm text-foreground transition-colors hover:border-muted`;

export const buttonOutline = `${buttonBase} border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:border-muted hover:bg-surface`;

export const buttonDanger = `${buttonBase} border border-attention/40 bg-card px-5 py-2.5 text-sm text-attention transition-colors hover:border-attention`;

export const compact = (button: string) =>
  button.replace("px-5 py-2.5", "px-4 py-2");

// Full width on phones, content width from the `sm` breakpoint.
export const large = (button: string) =>
  button.replace("px-5 py-2.5 text-sm", "h-12 w-full px-6 text-base sm:w-auto");

export const card = "rounded-2xl border border-border bg-card";

export const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted";

import { Fragment } from "react";
import { splitAmounts } from "@/lib/amounts";

// Marks a value for the "Hide amounts" privacy screen (globals.css). The value
// is still in the page, so this guards against onlookers, not data access.
export function Amount({ children }: { children: React.ReactNode }) {
  return (
    <span data-amount>
      <span>{children}</span>
    </span>
  );
}

export function MaskableText({ text }: { text: string }) {
  return splitAmounts(text).map((part, i) => (
    <Fragment key={i}>
      {part.amount ? <Amount>{part.text}</Amount> : part.text}
    </Fragment>
  ));
}

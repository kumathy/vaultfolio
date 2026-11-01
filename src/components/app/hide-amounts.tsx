// Shared by the server-rendered script and the client toggle. A plain module,
// since values exported from a "use client" file reach server components only
// as references.
export const AMOUNTS_ROOT_ID = "app-root";
export const HIDE_AMOUNTS_KEY = "vaultfolio:hide-amounts";
// The inline icon button's box. Negative margins keep it from adding height
// to the line it sits on.
export const INLINE_TOGGLE_BOX = "-m-1.5 h-7 w-7";

// Runs while the page is parsed, before the first paint, so a reload with
// amounts hidden never flashes the real figures.
const script = `try{if(localStorage.getItem(${JSON.stringify(HIDE_AMOUNTS_KEY)})==="1")document.getElementById(${JSON.stringify(AMOUNTS_ROOT_ID)}).dataset.amounts="hidden"}catch(e){}`;

export function HideAmountsScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

declare namespace TailwindCssNamespace {
  export interface ITailwindCss {
    "bg-gray-200": string;
    "bg-white": string;
    block: string;
    border: string;
    "border-0": string;
    "border-sky-500": string;
    "border-slate-300": string;
    container: string;
    "focus:border-sky-500": string;
    "focus:outline-none": string;
    "focus:ring": string;
    "focus:ring-1": string;
    "focus:ring-sky-500": string;
    "font-bold": string;
    hidden: string;
    italic: string;
    "m-10": string;
    "mb-3": string;
    "mb-5": string;
    "mx-auto": string;
    "outline-none": string;
    "p-8": string;
    "pl-9": string;
    "placeholder-slate-300": string;
    "placeholder:italic": string;
    "placeholder:text-slate-400": string;
    "pr-3": string;
    "pt-0": string;
    "px-3": string;
    "py-2": string;
    "py-4": string;
    relative: string;
    ring: string;
    "ring-1": string;
    "ring-sky-500": string;
    rounded: string;
    "rounded-md": string;
    "rounded-xl": string;
    shadow: string;
    "shadow-sm": string;
    "sm:text-sm": string;
    table: string;
    "text-3xl": string;
    "text-base": string;
    "text-gray-500": string;
    "text-gray-700": string;
    "text-lg": string;
    "text-slate-400": string;
    "text-slate-600": string;
    "text-slate-800": string;
    "text-sm": string;
    "text-xl": string;
    underline: string;
    "w-full": string;
  }
}

declare const TailwindCssModule: TailwindCssNamespace.ITailwindCss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: TailwindCssNamespace.ITailwindCss;
};

export = TailwindCssModule;

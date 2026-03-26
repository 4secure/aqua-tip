import { forwardRef } from "react";

const sizeClasses = {
  xs: "px-3 py-1 text-[11px] rounded-full",
  sm: "px-5 py-2.5 text-xs rounded-lg",
  md: "px-9 py-4 text-sm rounded-[11px]",
  lg: "px-10 py-4 text-base rounded-[11px]",
};

export const GradientButton = forwardRef(function GradientButton(
  { className = "", variant, size = "md", children, ...props },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 font-sans font-bold text-white cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-light disabled:pointer-events-none disabled:opacity-50";
  const variantClass =
    variant === "variant" ? "gradient-button-variant" : "gradient-button";
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <button
      className={`${base} ${variantClass} ${sizeClass} ${className}`}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

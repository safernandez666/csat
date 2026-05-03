import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  menuId: string;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu subcomponent must be used inside <DropdownMenu>");
  return ctx;
}

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, menuRef, menuId }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DropdownMenuTrigger({
  className,
  onClick,
  children,
  ...props
}: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef, menuId } = useDropdownMenu();
  return (
    <button
      type="button"
      ref={triggerRef}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-card transition-colors focus:outline-none focus:ring-2 focus:ring-accent",
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

type Align = "start" | "end";

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: Align;
  sideOffset?: number;
}

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, menuRef, menuId } = useDropdownMenu();
  if (!open) return null;
  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      style={{ marginTop: sideOffset }}
      className={cn(
        "absolute z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg",
        align === "end" ? "right-0" : "left-0",
        "top-full",
        "animate-fade-in-up",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("my-1 h-px bg-border", className)} {...props} />;
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

export function DropdownMenuItem({
  className,
  onClick,
  inset,
  children,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenu();
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-accent/10 hover:text-foreground focus:bg-accent/10 disabled:pointer-events-none disabled:opacity-50",
        inset && "pl-8",
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

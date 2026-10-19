import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be used inside Tabs");
  return ctx;
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center justify-start rounded-lg bg-slate-100 dark:bg-ink-card/60 border border-slate-200 dark:border-ink-border p-1 text-slate-600 dark:text-slate-400 max-w-full overflow-x-auto",
        className
      )}
      {...props}
    />
  );
}

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

function Tab({ value, className, ...props }: TabProps) {
  const { value: activeValue, onValueChange } = useTabsContext();
  const isActive = activeValue === value;
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-all text-slate-700 dark:text-slate-300",
        isActive
          ? "bg-white dark:bg-signal-blue/20 text-signal-blue font-bold shadow-sm border border-slate-300/80 dark:border-signal-blue/30"
          : "hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800/60",
        className
      )}
      {...props}
    />
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  if (activeValue !== value) return null;
  return (
    <div
      className={cn("mt-4", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, Tab, TabsContent };

"use client";

import * as React from "react";
import * as CommandPrimitive from "@radix-ui/react-command";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";

const Command = CommandPrimitive.Root;
const CommandInput = CommandPrimitive.Input;
const CommandList = CommandPrimitive.List;
const CommandEmpty = CommandPrimitive.Empty;
const CommandGroup = CommandPrimitive.Group;
const CommandItem = CommandPrimitive.Item;

const CommandShortcut = ({ className, ...props }) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
);
CommandShortcut.displayName = "CommandShortcut";

const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-muted", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandPrimitiveInput = CommandPrimitive.Input;

const CommandInputComponent = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitiveInput
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
CommandInputComponent.displayName = CommandPrimitiveInput.displayName;

const CommandListComponent = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
CommandListComponent.displayName = CommandPrimitive.List.displayName;

const CommandItemComponent = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
));
CommandItemComponent.displayName = CommandPrimitive.Item.displayName;

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  CommandInputComponent,
  CommandListComponent,
  CommandItemComponent,
};
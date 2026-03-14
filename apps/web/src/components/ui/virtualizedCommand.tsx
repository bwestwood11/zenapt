import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  BrushIcon,
  Check,
  ChevronsUpDown,
  Keyboard,
} from "lucide-react";
import * as React from "react";

type Option<T> = T & {
  value: string;
  label: string;
};

interface VirtualizedCommandProps<T> {
  height: string;
  options: Option<T>[];
  placeholder: string;
  selectedOption: string;
  onSelectOption?: (option: string) => void;
  renderEmpty?: () => React.JSX.Element;
  renderOption?: (option: Option<T>) => React.JSX.Element;
}

function VirtualizedCommand<T>({
  height,
  options,
  placeholder,
  selectedOption,
  onSelectOption,
  renderEmpty,
  renderOption,
}: VirtualizedCommandProps<T>) {
  const [filteredOptions, setFilteredOptions] =
    React.useState<Option<T>[]>(options);

  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const [isKeyboardNavActive, setIsKeyboardNavActive] = React.useState(false);

  const parentRef = React.useRef(null);

  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  const virtualOptions = virtualizer.getVirtualItems();

  const scrollToIndex = (index: number) => {
    virtualizer.scrollToIndex(index, {
      align: "center",
    });
  };

  const handleSearch = (search: string) => {
    setIsKeyboardNavActive(false);
    setFilteredOptions(
      options.filter(
        (option) =>
          option.value.toLowerCase().includes(search.toLowerCase() ?? []) ||
          option.label.toLowerCase().includes(search.toLowerCase() ?? [])
      )
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        setIsKeyboardNavActive(true);
        setFocusedIndex((prev) => {
          const newIndex =
            prev === -1 ? 0 : Math.min(prev + 1, filteredOptions.length - 1);
          scrollToIndex(newIndex);
          return newIndex;
        });
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setIsKeyboardNavActive(true);
        setFocusedIndex((prev) => {
          const newIndex =
            prev === -1 ? filteredOptions.length - 1 : Math.max(prev - 1, 0);
          scrollToIndex(newIndex);
          return newIndex;
        });
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (filteredOptions[focusedIndex]) {
          onSelectOption?.(filteredOptions[focusedIndex].value);
        }
        break;
      }
      default:
        break;
    }
  };

  React.useEffect(() => {
    if (selectedOption) {
      const option = filteredOptions.find(
        (option) => option.value === selectedOption
      );
      if (option) {
        const index = filteredOptions.indexOf(option);
        setFocusedIndex(index);
        virtualizer.scrollToIndex(index, {
          align: "center",
        });
      }
    }
  }, [selectedOption, filteredOptions, virtualizer]);

  return (
    <Command shouldFilter={false} onKeyDown={handleKeyDown}>
      <CommandInput onValueChange={handleSearch} placeholder={placeholder} />
      <CommandList
        ref={parentRef}
        style={{
          height: height,
          width: "100%",
          overflow: "auto",
        }}
        onMouseDown={() => setIsKeyboardNavActive(false)}
        onMouseMove={() => setIsKeyboardNavActive(false)}
      >
        <CommandEmpty>
          {renderEmpty ? (
            renderEmpty()
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <BrushIcon className="mb-3 size-6 text-muted-foreground/70" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs">Try adjusting your search or filters.</p>
            </div>
          )}
        </CommandEmpty>

        <CommandGroup>
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualOptions.map((virtualOption) => (
              <CommandItem
                key={filteredOptions[virtualOption.index].value}
                disabled={isKeyboardNavActive}
                className={cn(
                  "absolute left-0 top-0 w-full bg-transparent",
                  focusedIndex === virtualOption.index &&
                    "bg-accent text-accent-foreground",
                  isKeyboardNavActive &&
                    focusedIndex !== virtualOption.index &&
                    "aria-selected:bg-transparent aria-selected:text-primary"
                )}
                style={{
                  height: `${virtualOption.size}px`,
                  transform: `translateY(${virtualOption.start}px)`,
                }}
                value={filteredOptions[virtualOption.index].value}
                onMouseEnter={() =>
                  !isKeyboardNavActive && setFocusedIndex(virtualOption.index)
                }
                onMouseLeave={() => !isKeyboardNavActive && setFocusedIndex(-1)}
                onSelect={onSelectOption}
              >
                {renderOption ? (
                  renderOption(filteredOptions[virtualOption.index])
                ) : (
                  <>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedOption ===
                          filteredOptions[virtualOption.index].value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {filteredOptions[virtualOption.index].label}
                  </>
                )}
              </CommandItem>
            ))}
          </div>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

interface VirtualizedComboboxProps<T> {
  options: Option<T>[];
  searchPlaceholder?: string;
  height?: string;
  value: string;
  onChange: (value: string) => void;
  renderOption?: (option: Option<T>) => React.JSX.Element;
  renderTrigger?: (
    selectedOption: Option<T> | undefined,
    options: Option<T>[]
  ) => React.JSX.Element;
  renderEmpty?: () => React.JSX.Element;
  classNames?: {
    popoverTrigger?: string;
    popoverContent?: string;
  };
  placeholder?: string;
}

export function VirtualizedCombobox<T>({
  options,
  searchPlaceholder = "Search items...",
  height = "400px",
  value,
  onChange,
  classNames,
  renderEmpty,
  renderOption,
  renderTrigger,
  placeholder,
}: VirtualizedComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);

  const findOption = (value: string) => {
    return options.find((opt) => opt.value === value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger ? (
          renderTrigger(findOption(value), options)
        ) : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "justify-between w-full active:bg-input/70",

              classNames?.popoverTrigger
            )}
          >
            {value
              ? findOption(value)?.label || placeholder || searchPlaceholder
              : placeholder || searchPlaceholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0 w-[var(--radix-popover-trigger-width)]",
          classNames?.popoverContent
        )}
      >
        <VirtualizedCommand
          height={height}
          options={options}
          placeholder={searchPlaceholder}
          selectedOption={value}
          renderEmpty={renderEmpty}
          renderOption={renderOption}
          onSelectOption={(currentValue) => {
            onChange(currentValue === value ? "" : currentValue);
            setOpen(false);
          }}
        />
        <div className="flex items-center gap-2 px-3 py-2 border-t text-xs text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>
            Use arrows <ArrowUp className="h-3 w-3 inline-block" />{" "}
            <ArrowDown className="h-3 w-3 inline-block" /> to navigate, and{" "}
            <kbd className="inline-block bg-input/50 rounded-xs px-1 text-xs">
              Enter
            </kbd>{" "}
            to select
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
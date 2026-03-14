import { computePosition, flip, shift } from "@floating-ui/dom";
import { Editor, posToDOMRect, ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import type { MentionNodeAttrs } from "@tiptap/extension-mention";
import { useEffect, useImperativeHandle, useState, forwardRef } from "react";

// Floating position helper
const updatePosition = (editor: Editor, element: HTMLElement) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to
      ),
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
};

// MentionList component
// eslint-disable-next-line react-refresh/only-export-components
const MentionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SuggestionProps<unknown, MentionNodeAttrs>
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  console.log("props.items", props.items);

  const selectItem = (index: number) => {
    const item = props.items[index] as string;

    if (item) {
      props.editor
        .chain()
        .insertContentAt(props.range, [
          { type: "mention", attrs: { id: item } },
        ])
        .run();
    }
  };

  const upHandler = () =>
    setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
  const downHandler = () =>
    setSelectedIndex((i) => (i + 1) % props.items.length);
  const enterHandler = () => selectItem(selectedIndex);

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="absolute z-50 w-60 max-h-60 overflow-y-auto bg-popover border border-border rounded-md shadow-md">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            type="button"
            key={index}
            onClick={() => selectItem(index)}
            className={`
          flex items-center w-full px-4 py-2 text-sm text-popover-foreground
          rounded-md
          cursor-pointer
          transition-colors duration-150
          ${
            index === selectedIndex
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          }
        `}
          >
            {item as string}
          </button>
        ))
      ) : (
        <div className="px-4 py-2 text-muted-foreground text-sm">
          No results
        </div>
      )}
    </div>
  );
});

export default {
  char: "@",
  items: ({ query }: { query: string }) => {
    return [
      "Lea Thompson",
      "Cyndi Lauper",
      "Tom Cruise",
      "Madonna",
      "Jerry Hall",
      "Joan Collins",
      "Winona Ryder",
      "Christina Applegate",
      "Alyssa Milano",
      "Molly Ringwald",
      "Ally Sheedy",
      "Debbie Harry",
      "Olivia Newton-John",
      "Elton John",
      "Michael J. Fox",
      "Axl Rose",
      "Emilio Estevez",
      "Ralph Macchio",
      "Rob Lowe",
      "Jennifer Grey",
      "Mickey Rourke",
      "John Cusack",
      "Matthew Broderick",
      "Justine Bateman",
      "Lisa Bonet",
    ]
      .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5);
  },

  render: () => {
    let component: ReactRenderer;

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        component.element.style.position = "absolute";
        document.body.appendChild(component.element);
        updatePosition(props.editor, component.element);
      },

      onUpdate(props) {
        component.updateProps(props);
        if (!props.clientRect) return;
        updatePosition(props.editor, component.element);
      },

      onKeyDown(props) {
        if (props.event.key === "Escape") {
          component.destroy();
          return true;
        }
        const ref = component.ref as { onKeyDown: (props: unknown) => boolean };
        return ref.onKeyDown ? ref.onKeyDown(props) : false;
      },

      onExit() {
        component.element.remove();
        component.destroy();
      },
    };
  },
} satisfies Omit<SuggestionOptions<unknown, MentionNodeAttrs>, "editor">;

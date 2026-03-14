"use client";

import { useTiptapEditor } from "../hooks/useTipTapEditor";

import {
  Bold,
  Italic,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  TextQuote,
  Link,
} from "lucide-react";
import { EditorDropdown } from "./ui/dropdown";
import { EditorToggle } from "./ui/toggle";
import { EditorIconButton } from "./ui/button";
import EmojiPickerButton from "./ui/emoji-picker";
import { EditorPopoverButton } from "./ui/toggleWithPopover";

// -------------------- Toolbar --------------------
export const MenuBar = () => {
  const { editor } = useTiptapEditor();
  if (!editor) return null;

  return (
    <div className="flex items-center gap-2 sticky top-0 border-b z-20 bg-background px-3 py-2 ">

      {/* Block Type Dropdown */}
      <EditorDropdown
        items={[
          {
            label: "Paragraph",
            action: () => editor.chain().focus().setParagraph().run(),
            icon: <Type className="h-4 w-4" />,
          },
          {
            label: "Heading 1",
            action: () =>
              editor.chain().focus().toggleHeading({ level: 1 }).run(),
            icon: <Heading1 className="h-4 w-4" />,
          },
          {
            label: "Heading 2",
            action: () =>
              editor.chain().focus().toggleHeading({ level: 2 }).run(),
            icon: <Heading2 className="h-4 w-4" />,
          },
          {
            label: "Heading 3",
            action: () =>
              editor.chain().focus().toggleHeading({ level: 3 }).run(),
            icon: <Heading3 className="h-4 w-4" />,
          },
        ]}
        getActiveLabel={() => {
          if (editor.isActive("heading", { level: 1 })) return "Heading 1";
          if (editor.isActive("heading", { level: 2 })) return "Heading 2";
          if (editor.isActive("heading", { level: 3 })) return "Heading 3";
          return "Paragraph";
        }}
        getActiveIcon={() => {
          if (editor.isActive("heading", { level: 1 }))
            return <Heading1 className="h-4 w-4" />;
          if (editor.isActive("heading", { level: 2 }))
            return <Heading2 className="h-4 w-4" />;
          if (editor.isActive("heading", { level: 3 }))
            return <Heading3 className="h-4 w-4" />;
          return <Type className="h-4 w-4" />;
        }}
      />
      <div className="h-5 w-px bg-border mx-2" />

      {/* Inline formatting */}
      <EditorToggle
        icon={<Bold className="h-4 w-4" />}
        isActive={() => editor.isActive("bold")}
        action={() => editor.chain().focus().toggleBold().run()}
      />
      <EditorToggle
        icon={<Italic className="h-4 w-4" />}
        isActive={() => editor.isActive("italic")}
        action={() => editor.chain().focus().toggleItalic().run()}
      />

      {/* Alignment */}
      <div className="h-5 w-px bg-border mx-2" />

      <EditorToggle
        icon={<AlignLeft className="h-4 w-4" />}
        isActive={() => editor.isActive({ textAlign: "left" })}
        action={() => editor.chain().focus().setTextAlign("left").run()}
      />

      <EditorToggle
        icon={<AlignCenter className="h-4 w-4" />}
        isActive={() => editor.isActive({ textAlign: "center" })}
        action={() => editor.chain().focus().setTextAlign("center").run()}
      />
      <EditorToggle
        icon={<AlignRight className="h-4 w-4" />}
        isActive={() => editor.isActive({ textAlign: "right" })}
        action={() => editor.chain().focus().setTextAlign("right").run()}
      />

      <div className="h-5 w-px bg-border mx-2" />


      <EmojiPickerButton />

      <div className="h-5 w-px bg-border mx-2" />

      <EditorPopoverButton
        icon={<Link className="h-4 w-4" />}
        label="Link"
        onSubmit={(value) =>
          editor.chain().focus().setLink({ href: value }).run()
        }
        placeholder="https://"
      />
    </div>
  );
};

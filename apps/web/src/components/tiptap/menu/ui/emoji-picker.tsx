"use client";

import * as React from "react";

import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from "@/components/ui/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { emojiToShortcode, gitHubEmojis } from "@tiptap/extension-emoji";
import { Button } from "@/components/ui/button";
import { useTiptapEditor } from "../../hooks/useTipTapEditor";

export default function EmojiPickerButton() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { editor } = useTiptapEditor();

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={editor?.isActive("emoji") ? "default" : "ghost"} // active looks filled, otherwise ghost
          className="p-1"
        >
          <span className="sr-only">Emoji</span>
          😊
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0">
        <EmojiPicker
          className="h-[342px]"
          onEmojiSelect={({ emoji }) => {
            setIsOpen(false);

            editor
              ?.chain()
              .setEmoji(emojiToShortcode(emoji, gitHubEmojis) || "zap")
              .run();
          }}
        >
          <EmojiPickerSearch />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
}

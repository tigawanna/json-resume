import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Loader, X } from "lucide-react";
import type { ReactNode } from "react";

interface SearchBoxProps {
  keyword: string;
  setKeyword: (value: string) => void;
  isDebouncing: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  /** Filter chips shown before the text, inside the box. */
  leading?: ReactNode;
}

export function SearchBox({
  isDebouncing,
  setKeyword,
  keyword,
  inputProps,
  leading,
}: SearchBoxProps) {
  return (
    <div className="sticky top-0 w-full">
      <InputGroup className="bg-base-200/30 h-auto min-h-9 flex-wrap">
        {leading ? (
          <InputGroupAddon
            align="inline-start"
            className="flex-wrap justify-start gap-1 py-1 pl-1.5"
          >
            {leading}
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          placeholder="Search"
          className="h-9 min-w-40"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
          }}
          {...inputProps}
          data-test="list-search-input"
        />
        {isDebouncing || keyword.length > 0 ? (
          <InputGroupAddon align="inline-end">
            {isDebouncing ? <Loader className="size-4 animate-spin" /> : null}
            {keyword.length > 0 ? (
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => setKeyword("")}
                data-test="list-search-clear"
              >
                <X />
              </InputGroupButton>
            ) : null}
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </div>
  );
}

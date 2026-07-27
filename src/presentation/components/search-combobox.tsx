import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, type Href } from "expo-router";
import { ComboBox, Input, Label, ListBox, ListBoxItem, Popover } from "react-aria-components";

export interface SearchSuggestion {
  id: string;
  label: string;
  description: string;
  href: Href;
}

interface SearchComboboxProps {
  suggestions?: SearchSuggestion[];
  loadSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
  label?: string;
}

const EMPTY_SUGGESTIONS: SearchSuggestion[] = [];

export function SearchCombobox({
  suggestions = EMPTY_SUGGESTIONS,
  loadSuggestions,
  label = "商品を検索",
}: SearchComboboxProps) {
  const router = useRouter();
  const [items, setItems] = useState(suggestions);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    setItems(suggestions);
  }, [suggestions]);

  useEffect(() => {
    if (loadSuggestions === undefined) {
      return;
    }
    const requestId = ++sequence.current;
    if (inputValue.trim().length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void loadSuggestions(inputValue.trim())
        .then((result) => {
          if (sequence.current === requestId) {
            setItems(result);
          }
        })
        .finally(() => {
          if (sequence.current === requestId) {
            setLoading(false);
          }
        });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [inputValue, loadSuggestions]);

  const indexed = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  return (
    <ComboBox
      className="search-combobox"
      items={items}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={(key) => {
        if (key !== null) {
          const selected = indexed.get(String(key));
          if (selected !== undefined) {
            router.push(selected.href);
          }
        }
      }}
      menuTrigger="input"
    >
      <Label className="sr-only">{label}</Label>
      <Input
        className="search-combobox__input"
        placeholder="商品名、カテゴリ、ブランドで検索"
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            event.currentTarget.value.trim().length > 0 &&
            event.currentTarget.getAttribute("aria-expanded") !== "true"
          ) {
            router.push(`/search?q=${encodeURIComponent(event.currentTarget.value.trim())}`);
          }
        }}
      />
      <Popover className="search-combobox__popover">
        <ListBox<SearchSuggestion> className="search-combobox__list">
          {(item) => (
            <ListBoxItem id={item.id} textValue={item.label}>
              <span>{item.label}</span>
              <small>{item.description}</small>
            </ListBoxItem>
          )}
        </ListBox>
        {loading && (
          <p className="search-combobox__status" role="status">
            候補を検索しています
          </p>
        )}
        {!loading && inputValue.trim().length >= 2 && items.length === 0 && (
          <p className="search-combobox__status">候補がありません</p>
        )}
      </Popover>
    </ComboBox>
  );
}

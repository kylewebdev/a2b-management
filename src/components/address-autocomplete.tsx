"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

let optionsSet = false;
function loadPlaces(): Promise<google.maps.PlacesLibrary> | null {
  if (!API_KEY) return null;
  if (!optionsSet) {
    setOptions({ key: API_KEY, libraries: ["places"] });
    optionsSet = true;
  }
  return importLibrary("places");
}

interface Suggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  placePrediction: google.maps.places.PlacePrediction;
}

interface AddressAutocompleteProps {
  name?: string;
  id?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export function AddressAutocomplete({
  name,
  id,
  value,
  onChange,
  placeholder,
  inputClassName,
}: AddressAutocompleteProps) {
  const isControlled = value !== undefined;
  const [inputValue, setInputValue] = useState(value ?? "");
  const [committedValue, setCommittedValue] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [sdkReady, setSdkReady] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = id ? `${id}-listbox` : "address-listbox";

  // Sync controlled value into internal state
  useEffect(() => {
    if (isControlled && value !== inputValue) {
      setInputValue(value);
      setCommittedValue(value);
    }
    // Only sync when the controlled value prop changes externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Load SDK
  useEffect(() => {
    const promise = loadPlaces();
    if (!promise) return;
    promise.then(() => setSdkReady(true)).catch((err) => {
      console.error("[AddressAutocomplete] Failed to load Places SDK:", err);
      setSdkReady(true); // allow free-text typing even if SDK fails
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    try {
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }

      const response = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
      });

      const mapped: Suggestion[] = (response.suggestions ?? [])
        .filter((s) => s.placePrediction)
        .map((s, i) => ({
          id: `suggestion-${i}`,
          mainText: s.placePrediction!.mainText?.text ?? "",
          secondaryText: s.placePrediction!.secondaryText?.text ?? "",
          placePrediction: s.placePrediction!,
        }));

      setSuggestions(mapped);
      setOpen(mapped.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      console.error("[AddressAutocomplete] Suggestion fetch failed:", err);
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);

    // Update committed value for free-text typing
    setCommittedValue(val);
    if (isControlled && onChange) {
      onChange(val);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  async function selectSuggestion(suggestion: Suggestion) {
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress"] });
      const formatted = place.formattedAddress ?? `${suggestion.mainText}, ${suggestion.secondaryText}`;
      setInputValue(formatted);
      setCommittedValue(formatted);
      if (isControlled && onChange) {
        onChange(formatted);
      }
    } catch {
      // Fallback to prediction text
      const fallback = `${suggestion.mainText}, ${suggestion.secondaryText}`;
      setInputValue(fallback);
      setCommittedValue(fallback);
      if (isControlled && onChange) {
        onChange(fallback);
      }
    }

    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    // Consume session token
    sessionTokenRef.current = null;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  // Fallback: no API key → plain input
  if (!API_KEY) {
    return (
      <input
        id={id}
        name={name}
        type="text"
        data-1p-ignore
        value={isControlled ? value : undefined}
        onChange={isControlled && onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className={inputClassName}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? suggestions[activeIndex]?.id : undefined}
        autoComplete="off"
        data-1p-ignore
        disabled={!sdkReady}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={sdkReady ? placeholder : "Loading..."}
        className={inputClassName}
      />
      {name && <input type="hidden" name={name} value={committedValue} />}

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-surface shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={s.id}
              role="option"
              aria-selected={i === activeIndex}
              className={`min-h-[44px] cursor-pointer px-3 py-2 ${
                i === activeIndex ? "bg-surface-raised text-text-primary" : "text-text-secondary"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="font-medium text-text-primary">{s.mainText}</span>{" "}
              <span className="text-text-muted">{s.secondaryText}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

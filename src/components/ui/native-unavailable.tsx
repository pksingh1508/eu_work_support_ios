import type { JSX } from "react";

import type { NativeUnavailableProps } from "@/components/ui/native-unavailable.types";

/** iOS only (see native-unavailable.ios.tsx); other platforms use MessageState's card. */
export const NativeUnavailable: ((props: NativeUnavailableProps) => JSX.Element) | null = null;

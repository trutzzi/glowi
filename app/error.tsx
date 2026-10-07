"use client"; // Error boundaries must be Client Components

import { ErrorScreen } from "@/components/ErrorScreen";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen {...props} />;
}

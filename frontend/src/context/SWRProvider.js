"use client";

import { SWRConfig } from "swr";

export function SWRProvider({ children }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
        dedupingInterval: 60000,
      }}
    >
      {children}
    </SWRConfig>
  );
}

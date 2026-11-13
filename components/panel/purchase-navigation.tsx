"use client";
import { createContext } from "react";
import type { RecordWorkspaceController, RecordWorkspaceMode } from "./record-workspace";

// UI navigation only. No business records, tenant information or cached queries.
export const PurchaseNavigation = createContext<{
  register: (controller: RecordWorkspaceController | null) => void;
  onModeChange: (mode: RecordWorkspaceMode) => void;
} | null>(null);

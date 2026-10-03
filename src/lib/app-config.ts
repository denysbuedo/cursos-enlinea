import { PLATFORM_CONFIG } from "@/lib/platform-config";

export const APP_NAME = PLATFORM_CONFIG.displayName;
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const APP_DESCRIPTION = PLATFORM_CONFIG.description;

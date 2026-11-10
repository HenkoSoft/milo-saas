"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin requests; server configuration stays on the server.
export const authClient = createAuthClient();

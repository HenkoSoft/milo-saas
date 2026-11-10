export type CompanySettings = {
  commercialName: string | null;
  address: string | null;
  contactText: string | null;
  currency: string | null;
  locale: string | null;
  timeZone: string | null;
  priceVisibility: "PUBLIC" | "AUTHENTICATED_CUSTOMERS";
  version: string;
};

export type CompanyFormState = {
  status: "idle" | "saved" | "invalid" | "forbidden" | "conflict" | "error";
  message?: string;
  nameError?: string;
  values?: { commercialName: string; version: string };
};

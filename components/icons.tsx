export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CapabilityIcon({ kind = "grid" }: { kind?: "grid" | "people" | "branch" | "box" | "order" | "shield" }) {
  const paths = {
    grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
    people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7a4 4 0 0 1 0 8",
    branch: "M12 3v7M5 21v-7h14v7M12 14v7M8 3h8v5H8V3Z",
    box: "m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8m-9 5v9M7 5.8l9 5",
    order: "M7 3h10v3H7V3ZM5 5H3v16h18V5h-2M7 11h10M7 16h6",
    shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-4 10 3 3 5-6",
  };
  return <svg className="capability-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={paths[kind]} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export type Role = "client" | "admin";
// email is null for clients who only have a phone.
export type User = { email: string | null; role: Role };


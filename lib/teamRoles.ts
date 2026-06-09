export type TeamRole = "CAPTAIN" | "EDITOR" | "PLAYER";

export function isTeamCaptain(role?: string | null): boolean {
  return role === "CAPTAIN";
}

export function isTeamEditor(role?: string | null): boolean {
  return role === "CAPTAIN" || role === "EDITOR";
}

export function teamRoleLabel(role?: string | null): string | null {
  if (role === "CAPTAIN") return "Captain";
  if (role === "EDITOR") return "Editor";
  return null;
}

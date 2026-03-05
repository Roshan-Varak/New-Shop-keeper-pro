export function useRole() {
  return { role: "admin" as const, isAdmin: true, roleLoading: false };
}

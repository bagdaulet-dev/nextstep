export const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export const formatDate = (date: string, full = false) =>
  new Intl.DateTimeFormat(undefined, {
    month: full ? "long" : "short",
    day: "numeric",
    ...(full ? { year: "numeric" } : {}),
  }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
export const firstName = (name: string) => name.trim().split(/\s+/)[0];
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const companyColor = (name: string) =>
  [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 6;
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

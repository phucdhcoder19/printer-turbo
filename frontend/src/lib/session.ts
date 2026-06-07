// Team hiện tại. Tạm hardcode (team demo của bạn) — sau khi có JWT auth sẽ
// lấy từ token. Ưu tiên: localStorage > biến môi trường > default.
const DEFAULT_TEAM_ID = 'b1b7bece-bc89-4963-9883-84718502c5b3';

export function getTeamId(): string {
  return (
    localStorage.getItem('mpt.teamId') ||
    import.meta.env.VITE_TEAM_ID ||
    DEFAULT_TEAM_ID
  );
}

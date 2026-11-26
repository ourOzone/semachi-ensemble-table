// 팀 자동 삭제 (V-3 10차, 적용 예정 기능).
//
// 팀에도 합주처럼 due(이 날짜 이후 자동 삭제, 계속 유지는 2099-12-31)를 둔다. 아직 백엔드 팀 스키마에 due가 없어
// 팀 추가 Drawer의 "팀 자동 삭제" 칸과 서버로 보내는 due를 이 상수로 꺼 두었다.
// 백엔드에 팀 due가 생기면 true로 바꾸기만 하면 된다 (docs/archive/VIEW_REDESIGN_PLAN.md "적용 예정: 팀 자동 삭제").
//
// 읽는 쪽은 켜 두었다: 서버가 팀 due를 보내면 바로 팀 정보 Drawer에 "…까지"가 보이고, 합주 잡기의 매주 반복은
// 그 날짜까지로 막힌다 (types/response의 team due, lib/board의 toTeams). due가 없으면 계속 유지로 본다.

/** 팀 추가 Drawer의 "팀 자동 삭제" 칸을 보이고, 서버에 due를 보낼지 */
export const TEAM_DUE_ENABLED: boolean = false;

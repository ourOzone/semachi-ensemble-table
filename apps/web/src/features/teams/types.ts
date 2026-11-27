import type { TeamType } from '@/types/index';

// teams/index가 하위 Drawer들에 내려주는 콜백 타입.
// index.tsx에 두면 Drawer → index 순환 import가 생겨 별도 파일로 둔다.

/** 팀이 아직 있으면 true. 삭제됐으면 경고를 띄우고 상태·Drawer를 초기화한 뒤 false */
export type CheckTeamExists = (id: string) => Promise<boolean>;

/** 팀 추가 Drawer에서 입력한 것 (V-3 10차) */
export interface AddTeamInput {
    type: TeamType;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    pin: string;
    /** 팀 자동 삭제 'YYYY-MM-DD' (계속 유지는 2099-12-31). TEAM_DUE_ENABLED가 꺼져 있으면 없다 (teamDue.ts) */
    due?: string;
}

/** 저장에 성공하면 true (실패하면 Drawer에 머문다: ISSUES F3) */
export type HandleAddTeam = (input: AddTeamInput) => Promise<boolean>;

/** 팀 수정 Drawer에서 고친 것 (V-3 13차, PIN 없음: 팀 정보에서 확인했다) */
export type UpdateTeamInput = Omit<AddTeamInput, 'pin'>;

/** 저장에 성공하면 true (실패하면 Drawer에 머문다) */
export type HandleUpdateTeam = (id: string, input: UpdateTeamInput) => Promise<boolean>;

export type HandleDeleteTeam = (id: string) => Promise<void>;

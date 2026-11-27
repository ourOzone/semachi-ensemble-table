import type { Dayjs } from 'dayjs';
import { create } from 'zustand';
import { useDrawerStore } from '@/stores/drawer';

// 팀 수정 Drawer(팀 추가 Drawer의 수정 모드, V-3 13차)를 열 때 채울 지금 값.
// 팀 정보 Drawer에서 PIN이 맞으면 openUpdateTeam으로 연다. 입력값 자체는 Drawer 안의 로컬 상태다 (합주 수정과 같은 방식)

export interface EditTeamTarget {
    id: string;
    /** 서버의 팀 종류 그대로 (옛 종류일 수 있다: Drawer가 새 종류로 바꿔 채운다) */
    type: string;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    /** 팀 자동 삭제 날짜. 계속 유지면 null (적용 예정: teamDue.ts) */
    due: Dayjs | null;
    /** 팀 정보의 PIN 단계에서 맞은 PIN. 저장할 때 서버가 다시 확인한다 (백엔드 개편 B-6) */
    pin: string;
}

export const useEditTeamStore = create<{ target: EditTeamTarget | null }>()(() => ({
    target: null,
}));

/** 팀 수정 Drawer를 연다. 저장하거나 닫으면 팀 정보 Drawer로 돌아간다 */
export function openUpdateTeam(target: EditTeamTarget) {
    useEditTeamStore.setState({ target });
    useDrawerStore.getState().setOpenedDrawers(['updateTeam']);
}

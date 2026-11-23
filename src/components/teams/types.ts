import type { Dayjs } from 'dayjs';
import type { TimeSlot } from '@/types';

// teams/index가 하위 Drawer들에 내려주는 콜백 타입.
// index.tsx에 두면 Drawer → index 순환 import가 생겨 별도 파일로 둔다.

/** 팀이 아직 있으면 true. 삭제됐으면 경고를 띄우고 상태·Drawer를 초기화한 뒤 false */
export type CheckTeamExists = (id: string) => Promise<boolean>;

/** 저장에 성공하면 true (완료 화면은 성공했을 때만 연다: ISSUES F3) */
export type HandleAddTeam = (
    type: string,
    name: string,
    desc: string[],
    pin: string,
) => Promise<boolean>;

export type HandleUpdateTeam = (
    id: string,
    type: string,
    name: string,
    desc: string[],
) => Promise<void>;

export type HandleDeleteTeam = (id: string) => Promise<void>;

/**
 * 합주 추가. 인자는 Ensemble context 값을 그대로 받으므로 null 허용 타입이지만,
 * Drawer에서 날짜·시간 선택을 마친 뒤에만 호출된다. 저장에 성공하면 true (완료 화면은 성공했을 때만 연다: ISSUES F3)
 */
export type HandleAddEnsemble = (
    id: string,
    name: string,
    repeat: boolean,
    nextDate: Dayjs | null,
    startTime: TimeSlot | null,
    endTime: TimeSlot | null,
) => Promise<boolean>;

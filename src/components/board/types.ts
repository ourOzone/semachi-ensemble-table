import type { Dayjs } from 'dayjs';
import type { TimeSlot } from '@/types';

// board/index가 하위 Drawer들에 내려주는 콜백 타입.
// index.tsx에 두면 Drawer → index 순환 import가 생겨 별도 파일로 둔다.

/** 합주가 아직 있으면 true. 삭제됐으면 경고를 띄우고 상태·Drawer를 초기화한 뒤 false */
export type CheckEnsembleExists = (id: string) => Promise<boolean>;

/** 합주 정보 Drawer에서 "팀 정보 보기" (teamId로 팀 정보 Drawer를 연다) */
export type HandleClickTeamInfo = (teamId: string) => void;

/**
 * 합주 수정·미루기. 인자는 Ensemble context 값을 그대로 받으므로 null 허용 타입이지만,
 * Drawer에서 날짜·시간 선택을 마친 뒤에만 호출된다.
 */
export type HandleUpdateEnsemble = (
    id: string,
    teamId: string,
    repeat: boolean,
    nextDate: Dayjs | null,
    startTime: TimeSlot | null,
    endTime: TimeSlot | null,
) => Promise<void>;

export type HandleSkipEnsemble = HandleUpdateEnsemble;

export type HandleDeleteEnsemble = (id: string) => Promise<void>;

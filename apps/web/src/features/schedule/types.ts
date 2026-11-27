import type { Dayjs } from 'dayjs';
import type { TimeSlot } from '@/types/index';

// board/index가 하위 Drawer들에 내려주는 콜백 타입.
// index.tsx에 두면 Drawer → index 순환 import가 생겨 별도 파일로 둔다.

/** 합주가 아직 있으면 true. 삭제됐으면 경고를 띄우고 상태·Drawer를 초기화한 뒤 false */
export type CheckEnsembleExists = (id: string) => Promise<boolean>;

/** 합주 정보 Drawer에서 팀 이름 클릭 (teamId로 팀 정보 Drawer로 바꾼다) */
export type HandleClickTeamInfo = (teamId: string) => void;

type EnsembleArgs = [
    id: string,
    teamId: string,
    repeat: boolean,
    nextDate: Dayjs | null,
    startTime: TimeSlot | null,
    endTime: TimeSlot | null,
    /** PIN 단계에서 맞은 팀 PIN (서버가 다시 확인한다, 백엔드 개편 B-6) */
    pin: string,
];

/** 합주 정보 Drawer의 PIN 단계 뒤 처리: 미루기(nextDate 7일 뒤) · 바로 하기(미루기 취소) · 매주 반복으로 바꾸기. 저장에 성공하면 true */
export type HandleSkipEnsemble = (...args: EnsembleArgs) => Promise<boolean>;

/** 삭제. 결과와 관계없이 Drawer를 모두 닫는다 (성공·실패 알림) */
export type HandleDeleteEnsemble = (id: string, pin: string) => Promise<void>;

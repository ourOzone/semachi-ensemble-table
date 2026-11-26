import type { Dayjs } from 'dayjs';
import type { DayIndex, TimeSlot } from './domain';

// 서버(api.js)로 보내는 요청 본문. Dayjs 값은 JSON 직렬화 시 ISO 문자열로 바뀐다.

export interface TeamCreateRequest {
    type: string;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    pin: string;
    publishDate: Dayjs;
    /** 팀 자동 삭제 날짜 'YYYY-MM-DD' (계속 유지는 2099-12-31). 백엔드 스키마에 생기면 보낸다 (TEAM_DUE_ENABLED, V-3 10차) */
    due?: string;
}

export type TeamUpdateRequest = Pick<TeamCreateRequest, 'type' | 'name' | 'desc'>;

export interface EnsembleUpdateRequest {
    teamId: string;
    day: DayIndex;
    nextDate: Dayjs;
    startTime: TimeSlot;
    endTime: TimeSlot;
    repeat: boolean;
    /** 레거시 필드. repeat에서 파생 (TODO 삭제) */
    type: '무기한' | '일회성';
    /** 레거시 필드. 'YYYY-MM-DD', 반복 합주는 '2099-12-31' (TODO 삭제) */
    due: string;
}

export interface EnsembleCreateRequest extends EnsembleUpdateRequest {
    teamName: string;
}

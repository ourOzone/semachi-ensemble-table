import type { Dayjs } from 'dayjs';

// 앱 내부에서 쓰는 도메인 타입. 서버 응답(response.ts)을 context/fetch에서 정제한 형태다.

/** 요일 인덱스. 월요일 0 ~ 일요일 6 (dayjs의 day()와 다르다) */
export type DayIndex = number;

/** 시간칸 인덱스. constants의 idx2hour 기준 0 ~ 29 (09:00부터 30분 단위) */
export type TimeSlot = number;

/** 팀 추가·수정 화면에서 고를 수 있는 팀 종류 */
export type TeamType =
    '세마치공연(정기/연말)' | '교내공연(축제/버스킹)' | '외부공연(연합/대외)' | '기타 등등';

export interface Team {
    id: string;
    /** 보통 TeamType 중 하나지만, 서버의 기존 데이터를 보장할 수 없어 string으로 둔다 */
    type: string;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
}

/** 합주표 한 칸(요일 × 시간칸)에 들어가는 합주 하나. 합주가 여러 칸에 걸치면 칸마다 하나씩 만들어진다. */
export interface EnsembleBlock {
    id: string;
    day: DayIndex;
    startTime: TimeSlot;
    endTime: TimeSlot;
    teamId: string;
    /** 팀 이름 */
    name: string;
    repeat: boolean;
    /** 다음 합주 날짜. 반복 합주는 오늘 기준으로 다시 계산된 값 */
    nextDate: Dayjs;
    due: string;
    /** 합주의 첫 칸에만 팀 이름, 나머지 칸은 빈 문자열 */
    displayName: string;
    /** 팀 색상. 색상 매핑에 없는 팀(삭제된 팀 등)이면 theme.blueGray */
    teamColor: string;
}

/** 합주표 전체. [요일 0~6][시간칸 0~29][그 칸에 겹치는 합주들] */
export type EnsembleBoard = EnsembleBlock[][][];

export interface Note {
    id: string;
    text: string;
}

export interface Notice {
    id: string;
    /** 서버 필드명은 content */
    text: string;
}

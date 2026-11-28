// 앱 내부에서 쓰는 도메인 타입. 서버 응답(response.ts)을 context/fetch에서 정제한 형태다.

/** 요일 인덱스. 월요일 0 ~ 일요일 6 (dayjs의 day()와 다르다) */
export type DayIndex = number;

/** 시간칸 인덱스. constants의 idx2hour 기준 0 ~ 29 (09:00부터 30분 단위) */
export type TimeSlot = number;

/** 팀 추가 화면에서 고를 수 있는 팀 종류 (V-3 10차: 서버에도 이 문자열 그대로 보낸다) */
export type TeamType = '교내 공연' | '외부 공연' | '기타 팀';

/**
 * 옛 팀 종류 (V-3 10차 전). 라이브 데이터에 남아 있고(DB에서 일괄 수정 예정), 팀 수정 Drawer가 새 종류로 바꿔 채운다.
 * 새 종류와 함께 쓴다 (Team.type은 string)
 */
export type LegacyTeamType =
    '세마치공연(정기/연말)' | '교내공연(축제/버스킹)' | '외부공연(연합/대외)' | '기타 등등';

export interface Team {
    id: string;
    /** 보통 TeamType 중 하나지만, 서버의 기존 데이터를 보장할 수 없어 string으로 둔다 */
    type: string;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    /**
     * 팀 자동 삭제 날짜 (V-3 10차, 합주의 due와 같은 형식, 서버는 백엔드 개편 B-9부터). 옛 팀은 없다 = 계속 유지.
     * 없거나 2099년 이후면 계속 유지 (lib/ensemble의 getRepeatEnd로 읽는다)
     */
    due?: string;
}

export interface Note {
    id: string;
    text: string;
    /** 작성 시각 (ms, id(ObjectId)에서 읽음, V-4). id가 ObjectId 형식이 아니면 null */
    createdAt: number | null;
}

export interface Notice {
    id: string;
    /** 서버 필드명은 content */
    text: string;
    /** 올린 시각 (ms, id(ObjectId)에서 읽음, V-5). id가 ObjectId 형식이 아니면 null */
    createdAt: number | null;
}

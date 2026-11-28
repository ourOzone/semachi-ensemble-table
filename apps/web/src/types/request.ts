import type { Dayjs } from 'dayjs';
import type { TimeSlot } from './domain';

// 서버(apps/server)로 보내는 요청 본문. Dayjs 값은 JSON 직렬화 시 ISO 문자열로 바뀐다.
// 서버는 packages/shared의 요청 스키마(request.ts)로 검사하고, 맞지 않으면 400 (백엔드 개편 B-8).

export interface TeamCreateRequest {
    type: string;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    pin: string;
    publishDate: Dayjs;
    /** 팀 자동 삭제 날짜 'YYYY-MM-DD' (계속 유지는 2099-12-31). 지나면 서버가 팀과 그 팀의 합주를 지운다 (백엔드 개편 B-9) */
    due: string;
}

export type TeamUpdateRequest = Pick<TeamCreateRequest, 'type' | 'name' | 'desc' | 'due'>;

/**
 * 합주 잡기·수정. 서버가 packages/shared의 ensembleCreateBodySchema·ensembleUpdateBodySchema로 검사한다.
 * 팀 이름(teamName)·요일(day)은 서버가 채우고, type은 없앴다 (백엔드 개편 B-8 D3)
 */
export interface EnsembleUpdateRequest {
    /** 잡을 때만 쓰인다 (수정은 팀을 바꾸지 않는다) */
    teamId: string;
    nextDate: Dayjs;
    startTime: TimeSlot;
    endTime: TimeSlot;
    repeat: boolean;
    /** 'YYYY-MM-DD'. 반복은 반복 종료 날짜(계속 반복은 '2099-12-31'), 일회성은 그 날짜 */
    due: string;
}

export type EnsembleCreateRequest = EnsembleUpdateRequest;

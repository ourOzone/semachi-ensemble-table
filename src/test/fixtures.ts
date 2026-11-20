import { http, HttpResponse } from 'msw';
import { url } from '@/constants';
import type { EnsembleResponse, NoteResponse, NoticeResponse, TeamResponse } from '@/types';
import { server } from './server';

// 테스트 공용 서버 응답 데이터. App 첫 로딩(src/queries의 조회 훅)이 요청하는 4개 목록이다.

export const teams: TeamResponse[] = [
    {
        _id: 'team-1',
        type: '세마치공연(정기/연말)',
        name: '테스트밴드',
        desc: ['보컬A', '기타B', '베이스C', '드럼D', '키보드E', '매니저F', '셋리스트'],
    },
];

export const ensembles: EnsembleResponse[] = [
    {
        _id: 'ensemble-1',
        day: 0,
        startTime: 2,
        endTime: 3,
        teamId: 'team-1',
        teamName: '테스트밴드',
        repeat: true,
        nextDate: '2026-11-23T00:00:00.000Z',
        due: '2099-12-31T00:00:00.000Z',
    },
];

export const notes: NoteResponse[] = [{ _id: 'note-1', text: '메모입니다' }];

export const notices: NoticeResponse[] = [{ _id: 'notice-1', content: '첫 공지\n둘째 줄' }];

/** App 첫 로딩에 필요한 4개 목록 API를 모킹한다 */
export function mockInitialData() {
    server.use(
        http.get(`${url}/teams`, () => HttpResponse.json(teams)),
        http.get(`${url}/ensembles`, () => HttpResponse.json(ensembles)),
        http.get(`${url}/notes`, () => HttpResponse.json(notes)),
        http.get(`${url}/notices`, () => HttpResponse.json(notices)),
    );
}

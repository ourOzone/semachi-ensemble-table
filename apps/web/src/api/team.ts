import {
    teamResponseSchema,
    type IdResponse,
    type TeamCreateRequest,
    type TeamUpdateRequest,
} from '@/types';
import { del, exists, getList, post, put } from '.';
import { checkPin } from './pin';

/*
공부: getTeams등 에는 async/await 안해도 되는 이유
get이 async로 정의되어 있어서, getTeams()도 자동으로 promise를 리턴함

즉 내부적으로 다음과 동치임:
export const getTeams = async () => {
    return await get('/teams');
};
그런데 굳이 이럴 필요 없음
필요한 경우는 내부에서 에러 처리(try/catch)를 따로 하고 싶을때
*/

/*
공부: POST시 데이터 정제를 컴포넌트에서 할까, API 함수 내에서 할까
일반적인 방식은 컴포넌트에서 정제하고 딱 필요한 데이터만 넘겨줌
이유:
1. API 함수는 실제 API의 shape에 딱 맞게 유지하는게 좋음(테스트 및 유지보수 편함)
2. 컴포넌트가 데이터 흐름의 출발점이기 때문 (어떤 식으로 가공해서 API에 보낼지는 컴포넌트에서 명확히 보여주는게 좋다는 패턴)
*/

export const getTeams = () => getList('/teams', teamResponseSchema);
export const addTeam = (team: TeamCreateRequest) => post<IdResponse>('/teams', team);
// 수정·삭제는 서버가 PIN(팀 PIN 또는 마스터 PIN)을 확인한다. 틀리면 403 (백엔드 개편 B-6). 삭제는 204 (B-10)
export const updateTeam = (id: string, team: TeamUpdateRequest, pin: string) =>
    put<IdResponse>(`/teams/${id}`, { ...team, pin });
export const deleteTeam = (id: string, pin: string) => del<void>(`/teams/${id}`, { pin });
export const teamExists = (id: string) => exists(`/teams/${id}`);
export const checkTeamPin = (teamId: string, pin: string) =>
    checkPin(`/teams/${teamId}/check-pin`, { pin });

import {
    ensembleResponseSchema,
    type EnsembleCreateRequest,
    type EnsembleUpdateRequest,
    type IdResponse,
} from '@/types';
import { del, exists, getList, post, put } from '.';

// 잡기·수정·삭제는 서버가 그 합주 팀의 PIN(또는 마스터 PIN)을 확인한다. 틀리면 403 (백엔드 개편 B-6)
// 주소는 /ensembles/:id, 잡기 201·삭제 204 (B-10)

export const getEnsembles = () => getList('/ensembles', ensembleResponseSchema);
export const addEnsemble = (ensemble: EnsembleCreateRequest, pin: string) =>
    post<IdResponse>('/ensembles', { ...ensemble, pin });
export const updateEnsemble = (id: string, ensemble: EnsembleUpdateRequest, pin: string) =>
    put<IdResponse>(`/ensembles/${id}`, { ...ensemble, pin });
export const deleteEnsemble = (id: string, pin: string) => del<void>(`/ensembles/${id}`, { pin });
export const ensembleExists = (id: string) => exists(`/ensembles/${id}`);

import {
    ensembleResponseSchema,
    existsResponseSchema,
    type EnsembleCreateRequest,
    type EnsembleUpdateRequest,
    type IdResponse,
    type MessageResponse,
} from '@/types';
import { get, getList, post, put, del } from '.';

// 잡기·수정·삭제는 서버가 그 합주 팀의 PIN(또는 마스터 PIN)을 확인한다. 틀리면 403 (백엔드 개편 B-6)

export const getEnsembles = () => getList('/ensembles', ensembleResponseSchema);
export const addEnsemble = (ensemble: EnsembleCreateRequest, pin: string) =>
    post<IdResponse>('/ensemble', { ...ensemble, pin });
export const updateEnsemble = (id: string, ensemble: EnsembleUpdateRequest, pin: string) =>
    put<IdResponse & MessageResponse>(`/ensemble?id=${id}`, { ...ensemble, pin });
export const deleteEnsemble = (id: string, pin: string) =>
    del<IdResponse>(`/ensemble?id=${id}`, { pin });
export const ensembleExists = async (id: string) =>
    existsResponseSchema.parse(await get(`/ensemble/${id}`));

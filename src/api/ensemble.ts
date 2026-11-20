import {
    ensembleResponseSchema,
    existsResponseSchema,
    type EnsembleCreateRequest,
    type EnsembleUpdateRequest,
    type IdResponse,
    type MessageResponse,
} from '@/types';
import { get, getList, post, put, del } from '.';

export const getEnsembles = () => getList('/ensembles', ensembleResponseSchema);
export const addEnsemble = (ensemble: EnsembleCreateRequest) =>
    post<IdResponse>('/ensemble', ensemble);
export const updateEnsemble = (id: string, ensemble: EnsembleUpdateRequest) =>
    put<IdResponse & MessageResponse>(`/ensemble?id=${id}`, ensemble);
export const deleteEnsemble = (id: string) => del<IdResponse>(`/ensemble?id=${id}`);
export const ensembleExists = async (id: string) =>
    existsResponseSchema.parse(await get(`/ensemble/${id}`));

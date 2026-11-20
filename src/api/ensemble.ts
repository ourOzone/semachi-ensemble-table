import type {
    EnsembleCreateRequest,
    EnsembleResponse,
    EnsembleUpdateRequest,
    ExistsResponse,
    IdResponse,
    MessageResponse,
} from '@/types';
import { get, post, put, del } from '.';

export const getEnsembles = () => get<EnsembleResponse[]>('/ensembles');
export const addEnsemble = (ensemble: EnsembleCreateRequest) =>
    post<IdResponse>('/ensemble', ensemble);
export const updateEnsemble = (id: string, ensemble: EnsembleUpdateRequest) =>
    put<IdResponse & MessageResponse>(`/ensemble?id=${id}`, ensemble);
export const deleteEnsemble = (id: string) => del<IdResponse>(`/ensemble?id=${id}`);
export const ensembleExists = (id: string) => get<ExistsResponse>(`/ensemble/${id}`);

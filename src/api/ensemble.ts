import type {
    EnsembleCreateRequest,
    EnsembleResponse,
    EnsembleUpdateRequest,
    ExistsResponse,
    IdResponse,
    MessageResponse,
} from '@/types';
import { get, post, put, del } from '.';

// update·delete 경로는 앞에 '/'가 빠져 있지만 baseURL과 합쳐져 동작한다. (3단계 정리 대상)

export const getEnsembles = () => get<EnsembleResponse[]>('/ensembles');
export const addEnsemble = (ensemble: EnsembleCreateRequest) =>
    post<IdResponse>('/ensemble', ensemble);
export const updateEnsemble = (id: string, ensemble: EnsembleUpdateRequest) =>
    put<IdResponse & MessageResponse>(`ensemble?id=${id}`, ensemble);
export const deleteEnsemble = (id: string) => del<IdResponse>(`ensemble?id=${id}`);
export const ensembleExists = (id: string) => get<ExistsResponse>(`/ensemble/${id}`);

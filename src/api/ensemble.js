import { get, post, put, del } from '.';

export const getEnsembles = () => get('/ensembles');
export const addEnsemble = (ensemble) => post('/ensemble', ensemble);
export const updateEnsemble = (id, ensemble) => put(`ensemble?id=${id}`, ensemble);
export const deleteEnsemble = (id) => del(`ensemble?id=${id}`);
export const ensembleExists = (id) => get(`/ensemble/${id}`);
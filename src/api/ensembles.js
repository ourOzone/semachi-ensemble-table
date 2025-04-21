import { get, post } from '.';

export const getEnsembles = () => get('/ensembles');
export const addEnsemble = (ensemble) => post('/ensembles', ensemble);
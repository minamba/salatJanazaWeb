import { combineReducers } from 'redux';
import authReducer from './authReducer';
import mosqueeReducer from './mosqueeReducer';
import priereJanazaReducer from './priereJanazaReducer';
import contactReducer from './contactReducer';
import utilisateurReducer from './utilisateurReducer';
import featuresReducer from './featuresReducer';

export default combineReducers({
  auth: authReducer,
  mosquee: mosqueeReducer,
  priereJanaza: priereJanazaReducer,
  contact: contactReducer,
  utilisateur: utilisateurReducer,
  features: featuresReducer,
});

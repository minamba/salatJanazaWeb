import { call, put, takeLatest } from 'redux-saga/effects';
import * as api from '../api/utilisateurApi';
import {
  FETCH_UTILISATEURS_REQUEST, FETCH_UTILISATEURS_SUCCESS, FETCH_UTILISATEURS_FAILURE,
  CREATE_UTILISATEUR_REQUEST, CREATE_UTILISATEUR_SUCCESS, CREATE_UTILISATEUR_FAILURE,
  UPDATE_UTILISATEUR_REQUEST, UPDATE_UTILISATEUR_SUCCESS, UPDATE_UTILISATEUR_FAILURE,
  DELETE_UTILISATEUR_REQUEST, DELETE_UTILISATEUR_SUCCESS, DELETE_UTILISATEUR_FAILURE,
} from '../actions/utilisateurActions';

function* fetchSaga() {
  try {
    const res = yield call(api.getUtilisateurs);
    yield put({ type: FETCH_UTILISATEURS_SUCCESS, payload: res.data });
  } catch {
    yield put({ type: FETCH_UTILISATEURS_FAILURE, payload: 'Erreur chargement des utilisateurs.' });
  }
}

function* createSaga(action) {
  try {
    const res = yield call(api.adminCreateUtilisateur, action.payload);
    yield put({ type: CREATE_UTILISATEUR_SUCCESS, payload: res.data });
  } catch (err) {
    yield put({ type: CREATE_UTILISATEUR_FAILURE, payload: err.response?.data?.error ?? 'Erreur création utilisateur.' });
  }
}

function* updateSaga(action) {
  try {
    const { id, data } = action.payload;
    const res = yield call(api.updateUtilisateur, id, data);
    yield put({ type: UPDATE_UTILISATEUR_SUCCESS, payload: res.data });
  } catch (err) {
    yield put({ type: UPDATE_UTILISATEUR_FAILURE, payload: err.response?.data?.error ?? 'Erreur mise à jour.' });
  }
}

function* deleteSaga(action) {
  try {
    yield call(api.deleteUtilisateur, action.payload);
    yield put({ type: DELETE_UTILISATEUR_SUCCESS, payload: action.payload });
  } catch {
    yield put({ type: DELETE_UTILISATEUR_FAILURE, payload: 'Erreur suppression utilisateur.' });
  }
}

export default function* utilisateurSaga() {
  yield takeLatest(FETCH_UTILISATEURS_REQUEST, fetchSaga);
  yield takeLatest(CREATE_UTILISATEUR_REQUEST, createSaga);
  yield takeLatest(UPDATE_UTILISATEUR_REQUEST, updateSaga);
  yield takeLatest(DELETE_UTILISATEUR_REQUEST, deleteSaga);
}

import { call, put, takeLatest, fork, delay, select } from 'redux-saga/effects';
import * as priereApi from '../api/priereJanazaApi';
import {
  FETCH_PRIERES_REQUEST, FETCH_PRIERES_SUCCESS, FETCH_PRIERES_FAILURE,
  FETCH_PRIERES_UPCOMING_REQUEST,
  FETCH_PRIERES_BY_USER_REQUEST,
  CREATE_PRIERE_REQUEST, CREATE_PRIERE_SUCCESS, CREATE_PRIERE_FAILURE, SHOW_JANAZA_TOAST,
  UPDATE_PRIERE_REQUEST, UPDATE_PRIERE_SUCCESS, UPDATE_PRIERE_FAILURE,
  DELETE_PRIERE_REQUEST, DELETE_PRIERE_SUCCESS, DELETE_PRIERE_FAILURE,
  POLL_PRIERES_SUCCESS, MY_PRIERES_LOADED,
} from '../actions/priereJanazaActions';

function* fetchPrieresSaga() {
  try {
    const res = yield call(priereApi.getPrieres);
    yield put({ type: FETCH_PRIERES_SUCCESS, payload: res.data });
  } catch {
    yield put({ type: FETCH_PRIERES_FAILURE, payload: 'Erreur chargement des prières.' });
  }
}

function* fetchPrieresUpcomingSaga() {
  try {
    const res = yield call(priereApi.getPrieresUpcoming);
    yield put({ type: FETCH_PRIERES_SUCCESS, payload: res.data });
  } catch {
    yield put({ type: FETCH_PRIERES_FAILURE, payload: 'Erreur chargement des prières.' });
  }
}

function* fetchPrieresByUserSaga(action) {
  try {
    const res = yield call(priereApi.getPrieresByUtilisateur, action.payload);
    yield put({ type: MY_PRIERES_LOADED, payload: res.data });
  } catch {
    yield put({ type: FETCH_PRIERES_FAILURE, payload: 'Erreur chargement de l\'historique.' });
  }
}

function* createPriereSaga(action) {
  try {
    const res = yield call(priereApi.createPriere, action.payload);
    yield put({ type: CREATE_PRIERE_SUCCESS, payload: res.data });
  } catch (err) {
    yield put({ type: CREATE_PRIERE_FAILURE, payload: err.response?.data?.message ?? 'Erreur lors de la déclaration.' });
  }
}

function* updatePriereSaga(action) {
  try {
    const { id, data } = action.payload;
    const res = yield call(priereApi.updatePriere, id, data);
    yield put({ type: UPDATE_PRIERE_SUCCESS, payload: res.data });
  } catch (err) {
    yield put({ type: UPDATE_PRIERE_FAILURE, payload: err.response?.data?.message ?? 'Erreur mise à jour prière.' });
  }
}

function* deletePriereSaga(action) {
  try {
    yield call(priereApi.deletePriere, action.payload);
    yield put({ type: DELETE_PRIERE_SUCCESS, payload: action.payload });
  } catch {
    yield put({ type: DELETE_PRIERE_FAILURE, payload: 'Erreur suppression prière.' });
  }
}

function* pollPrieresSaga() {
  yield delay(30000);
  while (true) {
    try {
      const currentList = yield select((state) => state.priereJanaza.list);
      const knownIds = new Set(currentList.map((p) => p.id));
      const hasData = knownIds.size > 0;

      const res = yield call(priereApi.getPrieresUpcoming);
      const freshList = res.data;
      const newPrieres = hasData ? freshList.filter((p) => !knownIds.has(p.id)) : [];

      yield put({ type: POLL_PRIERES_SUCCESS, payload: { list: freshList, newPrieres } });
    } catch {
      // silent — ne pas perturber l'UI si le poll échoue
    }
    yield delay(30000);
  }
}

export default function* priereJanazaSaga() {
  yield takeLatest(FETCH_PRIERES_REQUEST, fetchPrieresSaga);
  yield takeLatest(FETCH_PRIERES_UPCOMING_REQUEST, fetchPrieresUpcomingSaga);
  yield takeLatest(FETCH_PRIERES_BY_USER_REQUEST, fetchPrieresByUserSaga);
  yield takeLatest(CREATE_PRIERE_REQUEST, createPriereSaga);
  yield takeLatest(UPDATE_PRIERE_REQUEST, updatePriereSaga);
  yield takeLatest(DELETE_PRIERE_REQUEST, deletePriereSaga);
  yield fork(pollPrieresSaga);
}

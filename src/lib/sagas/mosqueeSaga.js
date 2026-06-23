import { call, put, takeLatest } from 'redux-saga/effects';
import * as mosqueeApi from '../api/mosqueeApi';
import {
  FETCH_MOSQUEES_REQUEST, FETCH_MOSQUEES_SUCCESS, FETCH_MOSQUEES_FAILURE,
  FETCH_MOSQUEES_NEARBY_REQUEST,
  CREATE_MOSQUEE_REQUEST, CREATE_MOSQUEE_SUCCESS, CREATE_MOSQUEE_FAILURE,
  DELETE_MOSQUEE_REQUEST, DELETE_MOSQUEE_SUCCESS, DELETE_MOSQUEE_FAILURE,
  UPDATE_MOSQUEE_REQUEST, UPDATE_MOSQUEE_SUCCESS, UPDATE_MOSQUEE_FAILURE,
} from '../actions/mosqueeActions';

function* fetchMosqueesSaga() {
  try {
    const res = yield call(mosqueeApi.getMosquees);
    yield put({ type: FETCH_MOSQUEES_SUCCESS, payload: res.data });
  } catch {
    yield put({ type: FETCH_MOSQUEES_FAILURE, payload: 'Erreur lors du chargement des mosquées.' });
  }
}

function* fetchMosqueesNearbySaga(action) {
  try {
    const { lat, lng, radiusKm } = action.payload;
    const res = yield call(mosqueeApi.getMosqueesNearby, lat, lng, radiusKm);
    yield put({ type: FETCH_MOSQUEES_SUCCESS, payload: res.data });
  } catch {
    yield put({ type: FETCH_MOSQUEES_FAILURE, payload: 'Erreur lors du chargement des mosquées.' });
  }
}

function* createMosqueeSaga(action) {
  try {
    const res = yield call(mosqueeApi.createMosquee, action.payload);
    yield put({ type: CREATE_MOSQUEE_SUCCESS, payload: res.data });
  } catch (err) {
    yield put({ type: CREATE_MOSQUEE_FAILURE, payload: err.response?.data?.message ?? 'Erreur création mosquée.' });
  }
}

function* deleteMosqueeSaga(action) {
  try {
    yield call(mosqueeApi.deleteMosquee, action.payload);
    yield put({ type: DELETE_MOSQUEE_SUCCESS, payload: action.payload });
  } catch {
    yield put({ type: DELETE_MOSQUEE_FAILURE, payload: 'Erreur suppression mosquée.' });
  }
}

function* updateMosqueeSaga(action) {
  try {
    const { id, data } = action.payload;
    const res = yield call(mosqueeApi.updateMosquee, id, data);
    yield put({ type: UPDATE_MOSQUEE_SUCCESS, payload: res.data });
  } catch {
    yield put({ type: UPDATE_MOSQUEE_FAILURE, payload: 'Erreur modification mosquée.' });
  }
}

export default function* mosqueeSaga() {
  yield takeLatest(FETCH_MOSQUEES_REQUEST, fetchMosqueesSaga);
  yield takeLatest(FETCH_MOSQUEES_NEARBY_REQUEST, fetchMosqueesNearbySaga);
  yield takeLatest(CREATE_MOSQUEE_REQUEST, createMosqueeSaga);
  yield takeLatest(DELETE_MOSQUEE_REQUEST, deleteMosqueeSaga);
  yield takeLatest(UPDATE_MOSQUEE_REQUEST, updateMosqueeSaga);
}

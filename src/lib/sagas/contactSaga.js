import { call, put, takeLatest } from 'redux-saga/effects';
import { sendContact } from '../api/contactApi';
import {
  CONTACT_SUBMIT_REQUEST,
  CONTACT_SUBMIT_SUCCESS,
  CONTACT_SUBMIT_FAILURE,
} from '../actions/contactActions';

function* contactSaga(action) {
  try {
    yield call(sendContact, action.payload);
    yield put({ type: CONTACT_SUBMIT_SUCCESS });
  } catch {
    yield put({ type: CONTACT_SUBMIT_FAILURE, payload: 'Erreur lors de l\'envoi. Veuillez réessayer.' });
  }
}

export default function* watchContactSaga() {
  yield takeLatest(CONTACT_SUBMIT_REQUEST, contactSaga);
}

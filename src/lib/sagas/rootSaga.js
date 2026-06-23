import { all } from 'redux-saga/effects';
import authSaga from './authSaga';
import mosqueeSaga from './mosqueeSaga';
import priereJanazaSaga from './priereJanazaSaga';
import watchContactSaga from './contactSaga';
import utilisateurSaga from './utilisateurSaga';

export default function* rootSaga() {
  yield all([authSaga(), mosqueeSaga(), priereJanazaSaga(), watchContactSaga(), utilisateurSaga()]);
}

import { call, put, select, takeLatest } from 'redux-saga/effects';
import * as authApi from '../api/authApi';
import * as utilisateurApi from '../api/utilisateurApi';
import { authStorage } from '../storage/authStorage';
import {
  LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE,
  LOGIN_GOOGLE_REQUEST, LOGIN_APPLE_REQUEST,
  LOGOUT,
  REGISTER_REQUEST, REGISTER_SUCCESS, REGISTER_FAILURE,
  FORGOT_PASSWORD_REQUEST, FORGOT_PASSWORD_SUCCESS, FORGOT_PASSWORD_FAILURE,
  RESET_PASSWORD_REQUEST, RESET_PASSWORD_SUCCESS, RESET_PASSWORD_FAILURE,
  REFRESH_USER_PROFILE_REQUEST, REFRESH_USER_PROFILE_SUCCESS,
} from '../actions/authActions';

function parseJwtUser(accessToken) {
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      prenom: decoded.prenom,
      nom: decoded.nom,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

function* handleLoginSuccess(response) {
  const { access_token, refresh_token } = response.data;
  const user = parseJwtUser(access_token);
  authStorage.setAccessToken(access_token);
  if (refresh_token) authStorage.setRefreshToken(refresh_token);

  let dbId = null;
  let canImportFlyer = false;
  if (user?.id) {
    try {
      const profileRes = yield call(utilisateurApi.getUtilisateurByIdentityId, user.id);
      dbId = profileRes.data?.id ?? null;
      canImportFlyer = profileRes.data?.canImportFlyer ?? false;
    } catch {}
  }
  const enrichedUser = user ? { ...user, dbId, canImportFlyer } : null;
  if (enrichedUser) authStorage.setUser(enrichedUser);
  yield put({ type: LOGIN_SUCCESS, payload: { token: access_token, user: enrichedUser } });
}

function* loginSaga(action) {
  try {
    const { email, password } = action.payload;
    const response = yield call(authApi.loginWithPassword, email, password);
    yield* handleLoginSuccess(response);
  } catch (err) {
    const message = err.response?.data?.error_description ?? 'Email ou mot de passe incorrect.';
    yield put({ type: LOGIN_FAILURE, payload: message });
  }
}

function* loginGoogleSaga(action) {
  try {
    const response = yield call(authApi.loginWithGoogle, action.payload.accessToken);
    yield* handleLoginSuccess(response);
  } catch (err) {
    const message = err.response?.data?.error_description ?? 'Connexion Google échouée.';
    yield put({ type: LOGIN_FAILURE, payload: message });
  }
}

function* loginAppleSaga(action) {
  try {
    const response = yield call(authApi.loginWithApple, action.payload.idToken);
    yield* handleLoginSuccess(response);
  } catch (err) {
    const message = err.response?.data?.error_description ?? 'Connexion Apple échouée.';
    yield put({ type: LOGIN_FAILURE, payload: message });
  }
}

function* logoutSaga() {
  yield authStorage.clear();
}

function* registerSaga(action) {
  try {
    yield call(authApi.register, action.payload);
    yield put({ type: REGISTER_SUCCESS });
  } catch (err) {
    const errors = err.response?.data?.errors;
    const message = errors
      ? Object.values(errors).flat().join(' ')
      : err.response?.data?.error ?? 'Erreur lors de la création du compte.';
    yield put({ type: REGISTER_FAILURE, payload: message });
  }
}

function* forgotPasswordSaga(action) {
  try {
    yield call(authApi.forgotPassword, action.payload.email);
    yield put({ type: FORGOT_PASSWORD_SUCCESS });
  } catch {
    yield put({ type: FORGOT_PASSWORD_FAILURE, payload: 'Erreur lors de l\'envoi de l\'email.' });
  }
}

function* resetPasswordSaga(action) {
  try {
    yield call(authApi.resetPassword, action.payload);
    yield put({ type: RESET_PASSWORD_SUCCESS });
  } catch (err) {
    const message = err.response?.data?.error ?? 'Code invalide ou expiré.';
    yield put({ type: RESET_PASSWORD_FAILURE, payload: message });
  }
}

function* refreshUserProfileSaga() {
  try {
    const user = yield select(state => state.auth.user);
    if (!user?.id) return;
    const res = yield call(utilisateurApi.getUtilisateurByIdentityId, user.id);
    yield put({ type: REFRESH_USER_PROFILE_SUCCESS, payload: res.data });
  } catch {}
}

export default function* authSaga() {
  yield takeLatest(LOGIN_REQUEST, loginSaga);
  yield takeLatest(LOGIN_GOOGLE_REQUEST, loginGoogleSaga);
  yield takeLatest(LOGIN_APPLE_REQUEST, loginAppleSaga);
  yield takeLatest(LOGOUT, logoutSaga);
  yield takeLatest(REGISTER_REQUEST, registerSaga);
  yield takeLatest(FORGOT_PASSWORD_REQUEST, forgotPasswordSaga);
  yield takeLatest(RESET_PASSWORD_REQUEST, resetPasswordSaga);
  yield takeLatest(REFRESH_USER_PROFILE_REQUEST, refreshUserProfileSaga);
}

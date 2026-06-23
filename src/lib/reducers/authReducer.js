import { authStorage } from '../storage/authStorage';
import {
  LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE,
  LOGIN_GOOGLE_REQUEST, LOGIN_APPLE_REQUEST,
  LOGOUT,
  REGISTER_REQUEST, REGISTER_SUCCESS, REGISTER_FAILURE,
  FORGOT_PASSWORD_REQUEST, FORGOT_PASSWORD_SUCCESS, FORGOT_PASSWORD_FAILURE,
  RESET_PASSWORD_REQUEST, RESET_PASSWORD_SUCCESS, RESET_PASSWORD_FAILURE,
  AUTH_RESET, RESTORE_AUTH,
} from '../actions/authActions';

const savedUser = authStorage.getUser();
const savedToken = authStorage.getAccessToken();

const initialState = {
  user: savedUser,
  token: savedToken,
  isAuthenticated: !!(savedUser && savedToken),
  loading: false,
  error: null,
  registerSuccess: false,
  forgotSuccess: false,
  resetSuccess: false,
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case LOGIN_REQUEST:
    case LOGIN_GOOGLE_REQUEST:
    case LOGIN_APPLE_REQUEST:
      return { ...state, loading: true, error: null };

    case LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case LOGIN_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case LOGOUT:
      return {
        ...initialState,
        user: null,
        token: null,
        isAuthenticated: false,
      };

    case REGISTER_REQUEST:
      return { ...state, loading: true, error: null, registerSuccess: false };
    case REGISTER_SUCCESS:
      return { ...state, loading: false, registerSuccess: true };
    case REGISTER_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case FORGOT_PASSWORD_REQUEST:
      return { ...state, loading: true, error: null, forgotSuccess: false };
    case FORGOT_PASSWORD_SUCCESS:
      return { ...state, loading: false, forgotSuccess: true };
    case FORGOT_PASSWORD_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case RESET_PASSWORD_REQUEST:
      return { ...state, loading: true, error: null, resetSuccess: false };
    case RESET_PASSWORD_SUCCESS:
      return { ...state, loading: false, resetSuccess: true };
    case RESET_PASSWORD_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case AUTH_RESET:
      return {
        ...state,
        loading: false,
        error: null,
        registerSuccess: false,
        forgotSuccess: false,
        resetSuccess: false,
      };

    case RESTORE_AUTH:
      return {
        ...state,
        user: authStorage.getUser(),
        token: authStorage.getAccessToken(),
        isAuthenticated: !!(authStorage.getUser() && authStorage.getAccessToken()),
      };

    default:
      return state;
  }
}

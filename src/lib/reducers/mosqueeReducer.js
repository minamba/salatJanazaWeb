import {
  FETCH_MOSQUEES_REQUEST, FETCH_MOSQUEES_SUCCESS, FETCH_MOSQUEES_FAILURE,
  FETCH_MOSQUEES_NEARBY_REQUEST,
  CREATE_MOSQUEE_SUCCESS, CREATE_MOSQUEE_FAILURE,
  DELETE_MOSQUEE_SUCCESS, DELETE_MOSQUEE_FAILURE,
  UPDATE_MOSQUEE_SUCCESS, UPDATE_MOSQUEE_FAILURE,
} from '../actions/mosqueeActions';

const initialState = { list: [], loading: false, error: null };

export default function mosqueeReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_MOSQUEES_REQUEST:
    case FETCH_MOSQUEES_NEARBY_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_MOSQUEES_SUCCESS:
      return { ...state, loading: false, list: action.payload };

    case FETCH_MOSQUEES_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case CREATE_MOSQUEE_SUCCESS:
      return { ...state, list: [...state.list, action.payload] };

    case CREATE_MOSQUEE_FAILURE:
      return { ...state, error: action.payload };

    case DELETE_MOSQUEE_SUCCESS:
      return { ...state, list: state.list.filter((m) => m.id !== action.payload) };

    case DELETE_MOSQUEE_FAILURE:
      return { ...state, error: action.payload };

    case UPDATE_MOSQUEE_SUCCESS:
      return { ...state, list: state.list.map((m) => m.id === action.payload.id ? action.payload : m) };

    case UPDATE_MOSQUEE_FAILURE:
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

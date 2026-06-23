import {
  FETCH_UTILISATEURS_REQUEST, FETCH_UTILISATEURS_SUCCESS, FETCH_UTILISATEURS_FAILURE,
  CREATE_UTILISATEUR_REQUEST, CREATE_UTILISATEUR_SUCCESS, CREATE_UTILISATEUR_FAILURE,
  UPDATE_UTILISATEUR_REQUEST, UPDATE_UTILISATEUR_SUCCESS, UPDATE_UTILISATEUR_FAILURE,
  DELETE_UTILISATEUR_SUCCESS, DELETE_UTILISATEUR_FAILURE,
} from '../actions/utilisateurActions';

const initialState = {
  list: [],
  loading: false,
  error: null,
  saving: false,
  saveError: null,
};

export default function utilisateurReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_UTILISATEURS_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_UTILISATEURS_SUCCESS:
      return { ...state, loading: false, list: action.payload };
    case FETCH_UTILISATEURS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case CREATE_UTILISATEUR_REQUEST:
    case UPDATE_UTILISATEUR_REQUEST:
      return { ...state, saving: true, saveError: null };

    case CREATE_UTILISATEUR_SUCCESS:
      return { ...state, saving: false, list: [...state.list, action.payload] };

    case UPDATE_UTILISATEUR_SUCCESS:
      return {
        ...state,
        saving: false,
        list: state.list.map((u) => (u.id === action.payload.id ? action.payload : u)),
      };

    case CREATE_UTILISATEUR_FAILURE:
    case UPDATE_UTILISATEUR_FAILURE:
      return { ...state, saving: false, saveError: action.payload };

    case DELETE_UTILISATEUR_SUCCESS:
      return { ...state, list: state.list.filter((u) => u.id !== action.payload) };

    case DELETE_UTILISATEUR_FAILURE:
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

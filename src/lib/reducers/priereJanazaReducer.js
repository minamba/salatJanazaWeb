import {
  FETCH_PRIERES_REQUEST, FETCH_PRIERES_SUCCESS, FETCH_PRIERES_FAILURE,
  FETCH_PRIERES_UPCOMING_REQUEST, FETCH_PRIERES_BY_USER_REQUEST,
  CREATE_PRIERE_REQUEST, CREATE_PRIERE_SUCCESS, CREATE_PRIERE_FAILURE, CREATE_PRIERE_RESET,
  UPDATE_PRIERE_REQUEST, UPDATE_PRIERE_SUCCESS, UPDATE_PRIERE_FAILURE,
  DELETE_PRIERE_SUCCESS, DELETE_PRIERE_FAILURE,
  POLL_PRIERES_SUCCESS, DISMISS_JANAZA_TOAST, SHOW_JANAZA_TOAST, MY_PRIERES_LOADED,
  FETCH_PRIERES_PENDING_REQUEST, FETCH_PRIERES_PENDING_SUCCESS, FETCH_PRIERES_PENDING_FAILURE,
  JANAZA_EXPIRE,
} from '../actions/priereJanazaActions';
import { REFUSER_MOSQUEE_SUCCESS } from '../actions/mosqueeActions';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const CACHE_KEY = 'qabr_prieres_list';

// Persiste la liste dans sessionStorage pour repopuler le store instantanément
// lors d'un rechargement de page (F5, navigation), sans attendre le serveur.
function saveList(list) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch {}
  return list;
}

function loadCachedList() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Garde commune : ne jamais écraser une liste non vide avec une liste vide.
// Couvre les réponses vides transitoires (cold start, redémarrage backend).
// Le poll corrige dans les 30 s si la liste est réellement vide côté serveur.
function mergeList(fresh, current) {
  return fresh.length > 0 || current.length === 0 ? fresh : current;
}

const initialState = {
  list: loadCachedList(),
  myPrieres: [],
  myPrieresLoading: false,
  pendingList: [],
  pendingLoading: false,
  loading: false,
  error: null,
  createLoading: false,
  createSuccess: false,
  createError: null,
  saving: false,
  saveError: null,
  toasts: [],
};

export default function priereJanazaReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_PRIERES_REQUEST:
    case FETCH_PRIERES_UPCOMING_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_PRIERES_BY_USER_REQUEST:
      return { ...state, myPrieresLoading: true };

    case FETCH_PRIERES_SUCCESS: {
      const nextList = mergeList(action.payload, state.list);
      return { ...state, loading: false, list: saveList(nextList) };
    }

    case MY_PRIERES_LOADED:
      return { ...state, myPrieresLoading: false, myPrieres: action.payload };

    case FETCH_PRIERES_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case FETCH_PRIERES_PENDING_REQUEST:
      return { ...state, pendingLoading: true };
    case FETCH_PRIERES_PENDING_SUCCESS:
      return { ...state, pendingLoading: false, pendingList: action.payload };
    case FETCH_PRIERES_PENDING_FAILURE:
      return { ...state, pendingLoading: false };

    case REFUSER_MOSQUEE_SUCCESS:
      return { ...state, pendingList: state.pendingList.filter((p) => p.mosqueeId !== action.payload) };

    case CREATE_PRIERE_REQUEST:
      return { ...state, createLoading: true, createSuccess: false, createError: null };

    case CREATE_PRIERE_SUCCESS: {
      const nextList = [action.payload, ...state.list];
      return {
        ...state,
        createLoading: false,
        createSuccess: true,
        list: saveList(nextList),
        myPrieres: [action.payload, ...state.myPrieres],
      };
    }

    case CREATE_PRIERE_FAILURE:
      return { ...state, createLoading: false, createError: action.payload };

    case CREATE_PRIERE_RESET:
      return { ...state, createLoading: false, createSuccess: false, createError: null };

    case UPDATE_PRIERE_REQUEST:
      return { ...state, saving: true, saveError: null };

    case UPDATE_PRIERE_SUCCESS: {
      const nextList = state.list.map((p) => (p.id === action.payload.id ? action.payload : p));
      return {
        ...state,
        saving: false,
        list: saveList(nextList),
        myPrieres: state.myPrieres.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    }

    case UPDATE_PRIERE_FAILURE:
      return { ...state, saving: false, saveError: action.payload };

    case DELETE_PRIERE_SUCCESS: {
      const nextList = state.list.filter((p) => p.id !== action.payload);
      return {
        ...state,
        list: saveList(nextList),
        myPrieres: state.myPrieres.filter((p) => p.id !== action.payload),
      };
    }

    case DELETE_PRIERE_FAILURE:
      return { ...state, error: action.payload };

    case POLL_PRIERES_SUCCESS: {
      const nextList = mergeList(action.payload.list, state.list);
      return {
        ...state,
        list: saveList(nextList),
        toasts: [
          ...action.payload.newPrieres.map((p) => ({ ...p, toastId: `${p.id}-${Date.now()}` })),
          ...state.toasts,
        ],
      };
    }

    case SHOW_JANAZA_TOAST:
      return {
        ...state,
        toasts: [{ ...action.payload, toastId: `${action.payload.id}-${Date.now()}` }, ...state.toasts],
      };

    case DISMISS_JANAZA_TOAST:
      return { ...state, toasts: state.toasts.filter((t) => t.toastId !== action.payload) };

    case JANAZA_EXPIRE: {
      const nextList = state.list.filter((p) => {
        if (!p.dateHeurePriere) return false;
        const trueUtcMs = new Date(p.dateHeurePriere + 'Z').getTime() - (p.utcOffsetMinutes ?? 0) * 60_000;
        return Date.now() - trueUtcMs < TWO_HOURS_MS;
      });
      // Ne jamais vider entièrement la liste côté client (le serveur gère l'expiration).
      // Ne pas sauvegarder dans sessionStorage — le cache reflète l'état serveur, pas le filtrage local.
      return { ...state, list: nextList.length > 0 ? nextList : state.list };
    }

    default:
      return state;
  }
}

export const FETCH_PRIERES_REQUEST = 'FETCH_PRIERES_REQUEST';
export const FETCH_PRIERES_SUCCESS = 'FETCH_PRIERES_SUCCESS';
export const FETCH_PRIERES_FAILURE = 'FETCH_PRIERES_FAILURE';
export const FETCH_PRIERES_UPCOMING_REQUEST = 'FETCH_PRIERES_UPCOMING_REQUEST';
export const FETCH_PRIERES_BY_USER_REQUEST = 'FETCH_PRIERES_BY_USER_REQUEST';
export const CREATE_PRIERE_REQUEST = 'CREATE_PRIERE_REQUEST';
export const CREATE_PRIERE_SUCCESS = 'CREATE_PRIERE_SUCCESS';
export const CREATE_PRIERE_FAILURE = 'CREATE_PRIERE_FAILURE';
export const CREATE_PRIERE_RESET = 'CREATE_PRIERE_RESET';
export const UPDATE_PRIERE_REQUEST = 'UPDATE_PRIERE_REQUEST';
export const UPDATE_PRIERE_SUCCESS = 'UPDATE_PRIERE_SUCCESS';
export const UPDATE_PRIERE_FAILURE = 'UPDATE_PRIERE_FAILURE';
export const DELETE_PRIERE_REQUEST = 'DELETE_PRIERE_REQUEST';
export const DELETE_PRIERE_SUCCESS = 'DELETE_PRIERE_SUCCESS';
export const DELETE_PRIERE_FAILURE = 'DELETE_PRIERE_FAILURE';
export const POLL_PRIERES_SUCCESS = 'POLL_PRIERES_SUCCESS';
export const DISMISS_JANAZA_TOAST = 'DISMISS_JANAZA_TOAST';
export const SHOW_JANAZA_TOAST    = 'SHOW_JANAZA_TOAST';
export const MY_PRIERES_LOADED    = 'MY_PRIERES_LOADED';
export const FETCH_PRIERES_PENDING_REQUEST = 'FETCH_PRIERES_PENDING_REQUEST';
export const FETCH_PRIERES_PENDING_SUCCESS = 'FETCH_PRIERES_PENDING_SUCCESS';
export const FETCH_PRIERES_PENDING_FAILURE = 'FETCH_PRIERES_PENDING_FAILURE';

export const fetchPrieres = () => ({ type: FETCH_PRIERES_REQUEST });
export const fetchPrieresUpcoming = () => ({ type: FETCH_PRIERES_UPCOMING_REQUEST });
export const fetchPrieresByUser = (utilisateurId) => ({
  type: FETCH_PRIERES_BY_USER_REQUEST,
  payload: utilisateurId,
});
export const createPriere = (data) => ({ type: CREATE_PRIERE_REQUEST, payload: data });
export const resetCreatePriere = () => ({ type: CREATE_PRIERE_RESET });
export const updatePriere = (id, data) => ({ type: UPDATE_PRIERE_REQUEST, payload: { id, data } });
export const deletePriere = (id) => ({ type: DELETE_PRIERE_REQUEST, payload: id });
export const dismissJanazaToast = (toastId) => ({ type: DISMISS_JANAZA_TOAST, payload: toastId });
export const fetchPrieresEnAttente = () => ({ type: FETCH_PRIERES_PENDING_REQUEST });

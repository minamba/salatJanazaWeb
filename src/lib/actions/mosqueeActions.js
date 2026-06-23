export const FETCH_MOSQUEES_REQUEST = 'FETCH_MOSQUEES_REQUEST';
export const FETCH_MOSQUEES_SUCCESS = 'FETCH_MOSQUEES_SUCCESS';
export const FETCH_MOSQUEES_FAILURE = 'FETCH_MOSQUEES_FAILURE';
export const FETCH_MOSQUEES_NEARBY_REQUEST = 'FETCH_MOSQUEES_NEARBY_REQUEST';
export const CREATE_MOSQUEE_REQUEST = 'CREATE_MOSQUEE_REQUEST';
export const CREATE_MOSQUEE_SUCCESS = 'CREATE_MOSQUEE_SUCCESS';
export const CREATE_MOSQUEE_FAILURE = 'CREATE_MOSQUEE_FAILURE';
export const DELETE_MOSQUEE_REQUEST = 'DELETE_MOSQUEE_REQUEST';
export const DELETE_MOSQUEE_SUCCESS = 'DELETE_MOSQUEE_SUCCESS';
export const DELETE_MOSQUEE_FAILURE = 'DELETE_MOSQUEE_FAILURE';
export const UPDATE_MOSQUEE_REQUEST = 'UPDATE_MOSQUEE_REQUEST';
export const UPDATE_MOSQUEE_SUCCESS = 'UPDATE_MOSQUEE_SUCCESS';
export const UPDATE_MOSQUEE_FAILURE = 'UPDATE_MOSQUEE_FAILURE';

export const fetchMosquees = () => ({ type: FETCH_MOSQUEES_REQUEST });
export const fetchMosqueesNearby = (lat, lng, radiusKm) => ({
  type: FETCH_MOSQUEES_NEARBY_REQUEST,
  payload: { lat, lng, radiusKm },
});
export const createMosquee = (data) => ({ type: CREATE_MOSQUEE_REQUEST, payload: data });
export const deleteMosquee = (id) => ({ type: DELETE_MOSQUEE_REQUEST, payload: id });
export const updateMosquee = (id, data) => ({ type: UPDATE_MOSQUEE_REQUEST, payload: { id, data } });

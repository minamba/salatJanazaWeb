import {
  CONTACT_SUBMIT_REQUEST,
  CONTACT_SUBMIT_SUCCESS,
  CONTACT_SUBMIT_FAILURE,
  CONTACT_RESET,
} from '../actions/contactActions';

const initialState = { loading: false, success: false, error: null };

export default function contactReducer(state = initialState, action) {
  switch (action.type) {
    case CONTACT_SUBMIT_REQUEST:
      return { loading: true, success: false, error: null };
    case CONTACT_SUBMIT_SUCCESS:
      return { loading: false, success: true, error: null };
    case CONTACT_SUBMIT_FAILURE:
      return { loading: false, success: false, error: action.payload };
    case CONTACT_RESET:
      return initialState;
    default:
      return state;
  }
}

export const CONTACT_SUBMIT_REQUEST = 'CONTACT_SUBMIT_REQUEST';
export const CONTACT_SUBMIT_SUCCESS = 'CONTACT_SUBMIT_SUCCESS';
export const CONTACT_SUBMIT_FAILURE = 'CONTACT_SUBMIT_FAILURE';
export const CONTACT_RESET = 'CONTACT_RESET';

export const submitContact = (data) => ({ type: CONTACT_SUBMIT_REQUEST, payload: data });
export const resetContact = () => ({ type: CONTACT_RESET });

const initialState = { donationButtonVisible: true };

export default function featuresReducer(state = initialState, action) {
  switch (action.type) {
    case 'FEATURES_LOADED':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

import { LandingPageState, LandingPageAction } from './types';

export const landingPageContentReducer = (state: LandingPageState, action: LandingPageAction): LandingPageState => {
    switch (action.type) {
        case 'SET_LAYOUT':
            return {
                ...state,
                layout: action.payload,
            };
        case 'SET_SECTION_CONTENT':
            return {
                ...state,
                content: {
                    ...state.content,
                    [action.payload.sectionId]: action.payload.content,
                },
            };
        default:
            return state;
    }
};

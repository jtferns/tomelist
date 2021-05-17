import { useCallback, useReducer } from "react";
import { useLocalStorage } from "react-use";

const LOCAL_STORAGE_KEY = "tomelist";

type ExchangeSelections = Record<string, number>;
type State = {
  exchangeSelections: ExchangeSelections;
  currentTomestones: number;
};
type Actions =
  | { type: "setTomes"; payload: number }
  | {
      type: "applyObjectiveRun";
      payload: { name: string; tomes: number; type: "add" | "remove" };
    }
  | {
      type: "applyExchangeSelection";
      payload: { name: string; type: "add" | "remove" };
    };

const INITIAL_STATE: State = {
  exchangeSelections: {},
  currentTomestones: 0,
};

const reducer = (state: State, action: Actions) => {
  switch (action.type) {
    case "setTomes":
      return { ...state, currentTomestones: action.payload };
    case "applyObjectiveRun":
      switch (action.payload.type) {
        case "add":
          return {
            ...state,
            currentTomestones: state.currentTomestones + action.payload.tomes,
          };
        case "remove":
          return {
            ...state,
            currentTomestones: Math.max(
              state.currentTomestones - action.payload.tomes,
              0
            ),
          };
        default:
          return state;
      }
    case "applyExchangeSelection":
      switch (action.payload.type) {
        case "add":
          return {
            ...state,
            exchangeSelections: {
              ...state.exchangeSelections,
              [action.payload.name]:
                (state.exchangeSelections[action.payload.name] || 0) + 1,
            },
          };
        case "remove":
          return {
            ...state,
            exchangeSelections: {
              ...state.exchangeSelections,
              [action.payload.name]: Math.max(
                (state.exchangeSelections[action.payload.name] || 0) - 1,
                0
              ),
            },
          };
        default:
          return state;
      }
    default:
      return state;
  }
};

export const usePersistReducer = () => {
  // grab saved value from `localStorage` and
  // a function to update it. if
  // no value is retrieved, use `INITIAL_STATE`
  const [savedState, saveState] = useLocalStorage(
    LOCAL_STORAGE_KEY,
    INITIAL_STATE
  );

  // wrap `reducer` with a memoized function that
  // syncs the `newState` to `localStorage` before
  // returning `newState`. memoizing is important!
  const reducerLocalStorage = useCallback(
    (state: State, action: Actions) => {
      const newState = reducer(state, action);

      saveState(newState);

      return newState;
    },
    [saveState]
  );

  // use wrapped reducer and the saved value from
  // `localStorage` as params to `useReducer`.
  // this will return `[state, dispatch]`
  return useReducer(reducerLocalStorage, savedState || INITIAL_STATE);
};

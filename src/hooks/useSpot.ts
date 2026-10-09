import { spotStore } from '../state/app';
import { useStore } from '../state/store';

export const useSpot = () => useStore(spotStore);

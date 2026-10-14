import { backend } from '#backend';

/** Keeps spotStore on the shop's live price: Artifact DB doc or the API, depending on the build. */
export const watchSpot = () => backend.watchSpot();

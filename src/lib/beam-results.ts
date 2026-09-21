// The article and experiment use the same generated result, without copied metrics.
import results from '../../public/data/beam-surrogate/results.json';

export const beam = results;
export const format = (value: number, digits: number) => value.toFixed(digits);

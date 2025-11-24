/**
 * Représente l'état d'une donnée asynchrone.
 * @template T Le type de la donnée attendue.
 */
export interface DataState<T> {
  data?: T;
  loading: boolean;
  error?: any;
}
export type StoreFactory<TState> = () => TState;

export function createStoreFactory<TState>(factory: StoreFactory<TState>) {
  return factory;
}

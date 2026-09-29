export const toggleSetMember = <Value>(set: ReadonlySet<Value>, value: Value): Set<Value> => {
  const next = new Set(set);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next;
};

export function isSubsetOf<T>(subSet: Set<T>, set: Set<T>) {
  for (const elt of subSet) {
    if (!set.has(elt)) return false
  }
  return true
}

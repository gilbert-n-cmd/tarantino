// scripts/pagination.js
// Small helper: keeps track of the last doc for startAfter()
// and appends new results to the list.

export function createPaginator() {
  let lastDoc = null;
  let exhausted = false;

  return {
    get lastDoc() { return lastDoc; },
    get exhausted() { return exhausted; },
    setLastDoc(doc) { lastDoc = doc; },
    markExhausted() { exhausted = true; },
    reset() { lastDoc = null; exhausted = false; }
  };
}


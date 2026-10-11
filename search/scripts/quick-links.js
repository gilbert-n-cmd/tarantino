// scripts/quick-links.js

/**
 * Wire quick-link tiles so clicking one filters the search by category.
 * `onPick(category)` is called with the clicked tile's data-category.
 * Tiles with a `data-page` attribute are left alone (they link elsewhere).
 */
export function initQuickLinks(onPick) {
  const tiles = document.querySelectorAll(".quick-tile");
  tiles.forEach(tile => {
    // Skip tiles that link to another page
    if (tile.dataset.page) return;

    tile.addEventListener("click", (e) => {
      e.preventDefault();
      const category = tile.dataset.category;
      if (category) onPick(category);
    });
  });
}


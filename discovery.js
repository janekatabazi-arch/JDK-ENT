/* JDK Enterprises v12 — local discovery, wishlist and recommendation engine */
(function () {
  const key = { wishlist: "jdkWishlist", recent: "jdkRecentlyViewed" };
  const read = (name, fallback = []) => { try { const value = JSON.parse(localStorage.getItem(name)); return Array.isArray(value) ? value : fallback; } catch { return fallback; } };
  const write = (name, value) => (localStorage.setItem(name, JSON.stringify(value)), value);
  const normalize = value => String(value || "").toLowerCase().trim();
  const searchable = item => [item.name, item.category, item.description, item.service, item.shopName, ...(item.searchTokens || [])].map(normalize).join(" ");

  const Discovery = {
    wishlistIds() { return read(key.wishlist); },
    isWishlisted(id) { return this.wishlistIds().includes(String(id)); },
    toggleWishlist(item) {
      if (!item?.id) return false;
      const id = String(item.id); let ids = this.wishlistIds();
      ids = ids.includes(id) ? ids.filter(value => value !== id) : [id, ...ids].slice(0, 100);
      write(key.wishlist, ids); window.dispatchEvent(new CustomEvent("jdk:wishlist-changed", { detail: ids }));
      return ids.includes(id);
    },
    wishlistItems() { const ids = this.wishlistIds(); return ids.map(id => JDKStore.findItem(id)).filter(Boolean); },
    recordView(item) {
      if (!item?.id || item.type !== "product") return;
      const ids = [String(item.id), ...read(key.recent).filter(id => String(id) !== String(item.id))].slice(0, 12);
      write(key.recent, ids);
    },
    recentlyViewed(limit = 8) { return read(key.recent).map(id => JDKStore.findItem(String(id))).filter(Boolean).slice(0, limit); },
    search(items, query) {
      const terms = normalize(query).split(/\s+/).filter(Boolean);
      if (!terms.length) return [...items];
      return items.map(item => {
        const haystack = searchable(item);
        const name = normalize(item.name);
        const score = terms.reduce((sum, term) => sum + (name === term ? 10 : name.startsWith(term) ? 7 : name.includes(term) ? 5 : haystack.includes(term) ? 2 : -20), 0);
        return { item, score };
      }).filter(entry => entry.score >= 0).sort((a, b) => b.score - a.score).map(entry => entry.item);
    },
    recommendations(item, limit = 6) {
      if (!item) return [];
      const recentCategories = this.recentlyViewed(12).map(product => product.category);
      return JDKStore.items.filter(candidate => candidate.type === "product" && candidate.id !== item.id && Number(candidate.stock || 0) > 0)
        .map(candidate => ({ item: candidate, score: (candidate.category === item.category ? 8 : 0) + (candidate.sellerId && candidate.sellerId === item.sellerId ? 3 : 0) + recentCategories.filter(category => category === candidate.category).length }))
        .sort((a, b) => b.score - a.score).slice(0, limit).map(entry => entry.item);
    }
  };
  window.JDKDiscovery = Discovery;
})();

/* JDK Enterprises v3.0 — single local repository and compatibility API */
(function () {
  function read(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; }

  const store = {
    read, write,
    items: [],
    setItems(items) { this.items = Array.isArray(items) ? items : []; return this.items; },
    findItem(idOrName) { return this.items.find(item => item.id === idOrName || item.name === idOrName); },
    getCart() { const cart = read("cart", []); return Array.isArray(cart) ? cart : []; },
    saveCart(cart) { write("cart", cart); if (typeof window.updateCartCounter === "function") window.updateCartCounter(); return cart; },
    addToCart(product) {
      if (!product || product.type !== "product" || Number(product.stock ?? 1) <= 0) return false;
      const cart = this.getCart();
      const existing = cart.find(item => item.id === product.id || item.name === product.name);
      if (existing) { if (Number(existing.quantity || 0) >= Number(product.stock ?? Infinity)) return false; existing.quantity = Number(existing.quantity || 0) + 1; }
      else cart.push({ id: product.id, name: product.name, price: Number(product.price), image: product.image, quantity: 1, sellerId: product.sellerId || null, shopName: product.shopName || "JDK Enterprises", stock: Number(product.stock ?? 0), variants: product.variants || { sizes: [], colors: [] } });
      this.saveCart(cart); return true;
    },
    selectItem(item) { if (item) write("selectedProduct", item); },
    customer: {
      get() { return read("jdkCustomer", { name: "", phone: "", location: "" }); },
      save(customer) { return write("jdkCustomer", { name: String(customer.name || "").trim(), phone: String(customer.phone || "").trim(), location: String(customer.location || "").trim() }); }
    },
    orders: {
      getAll() { const orders = read("jdkOrders", []); return Array.isArray(orders) ? orders : []; },
      save(order) { const orders = this.getAll(); orders.unshift(order); write("jdkOrders", orders); write("lastOrder", order); return order; },
      replaceAll(orders) { return write("jdkOrders", Array.isArray(orders) ? orders : []); }
    },
    auth: {
      getUser() { return read("jdkAuthUser", null); },
      setUser(user) { return user ? write("jdkAuthUser", user) : (localStorage.removeItem("jdkAuthUser"), null); },
      isSignedIn() { return Boolean(this.getUser()); },
      signOut() { localStorage.removeItem("jdkAuthUser"); }
    },
    session: {
      get() { return read("jdkSession", { guestId: "", createdAt: "" }); },
      ensure() { let session = this.get(); if (!session.guestId) { session = { guestId: "GUEST-" + Date.now().toString(36).toUpperCase(), createdAt: new Date().toISOString() }; write("jdkSession", session); } return session; }
    }
  };
  window.JDKStore = store;
  store.session.ensure();
  window.JDKCustomer = { get: () => store.customer.get(), save: customer => store.customer.save(customer) };
  window.JDKOrders = { getAll: () => store.orders.getAll(), save: order => store.orders.save(order) };
})();

/* Shared JDK ENT marketplace data. Keep product and worker records here. */
window.JDK_DATA = {
  items: [
    { id:"phone-001", name:"Smart Phone", price:950000, image:"phone.jpg", category:"electronics", type:"product", description:"A quality smartphone for everyday communication and entertainment." },
    { id:"laptop-001", name:"Laptop", price:1850000, image:"laptop.jpg", category:"electronics", type:"product", description:"A dependable laptop for study, office work and everyday tasks." },
    { id:"speaker-001", name:"Bluetooth Speaker", price:120000, image:"speaker.jpg", category:"electronics", type:"product", description:"Portable wireless audio for home and travel." },
    { id:"rice-001", name:"Rice 5kg", price:45000, image:"rice.jpg", category:"groceries", type:"product", description:"A 5kg pack of rice for everyday meals." },
    { id:"chair-001", name:"Plastic Chair", price:35000, image:"chair.jpg", category:"furniture", type:"product", description:"A practical lightweight chair for home or events." },
    { id:"cement-001", name:"Cement 50kg", price:42000, image:"cement.jpg", category:"building", type:"product", description:"50kg bag of cement for construction projects." },
    { id:"worker-electrician-001", name:"John Electrician", service:"Electrical Installation", image:"electrician.jpg", category:"workers", type:"worker", phone:"+256700000001", description:"Electrical installation and basic repair services." },
    { id:"worker-plumber-001", name:"Peter Plumber", service:"Plumbing and Repairs", image:"plumber.jpg", category:"workers", type:"worker", phone:"+256700000002", description:"Plumbing installation, maintenance and repairs." },
    { id:"worker-carpenter-001", name:"David Carpenter", service:"Furniture and Wood Work", image:"carpenter.jpg", category:"workers", type:"worker", phone:"+256700000003", description:"Furniture and general woodwork services." }
  ],
  categories: {
    all:"All Products", electronics:"Electronics", groceries:"Groceries",
    furniture:"Furniture", workers:"Manual Workers", building:"Building Materials"
  }
};
window.JDKStore = {
  items: window.JDK_DATA.items,
  findItem(idOrName) { return this.items.find(item => item.id === idOrName || item.name === idOrName); },
  getCart() { try { const value = JSON.parse(localStorage.getItem("cart")); return Array.isArray(value) ? value : []; } catch { return []; } },
  saveCart(cart) { localStorage.setItem("cart", JSON.stringify(cart)); if (typeof window.updateCartCounter === "function") window.updateCartCounter(); },
  addToCart(product) {
    if (!product || product.type !== "product") return false;
    const cart = this.getCart();
    const existing = cart.find(item => item.id === product.id || item.name === product.name);
    if (existing) existing.quantity = Number(existing.quantity || 0) + 1;
    else cart.push({ id:product.id, name:product.name, price:Number(product.price), image:product.image, quantity:1 });
    this.saveCart(cart); return true;
  },
  selectItem(item) { if (item) localStorage.setItem("selectedProduct", JSON.stringify(item)); }
};


/* Shared conversation helpers */
window.JDKMessages = {
  defaults: [
    { id:"support", name:"JDK Support", image:"support.png", message:"Hello! How can we help you?", time:"Support" },
    { id:"electronics-seller", name:"Electronics Seller", image:"seller.png", message:"Ask us about electronics and availability.", time:"Seller" },
    { id:"delivery-team", name:"Delivery Team", image:"delivery.png", message:"We can help with delivery questions.", time:"Delivery" }
  ],
  getConversations() {
    let custom = [];
    try { custom = JSON.parse(localStorage.getItem("jdkConversations")) || []; } catch { custom = []; }
    return [...custom, ...this.defaults.filter(d => !custom.some(c => String(c.id) === String(d.id)))];
  },
  saveConversations(list) { localStorage.setItem("jdkConversations", JSON.stringify(list)); },
  openConversation(chat) {
    const list = this.getConversations();
    const custom = list.filter(c => !this.defaults.some(d => String(d.id) === String(c.id)));
    const index = custom.findIndex(c => String(c.id) === String(chat.id));
    if (index >= 0) custom[index] = { ...custom[index], ...chat };
    else custom.unshift(chat);
    this.saveConversations(custom);
    localStorage.setItem("selectedChat", JSON.stringify(chat));
  }
};


/* Public data API backed by JDKStore */
window.JDKCustomer = {
    get() {
        return window.JDKStore
            ? JDKStore.customer.get()
            : { name: "", phone: "", location: "" };
    },
    save(customer) {
        return JDKStore.customer.save(customer);
    }
};

window.JDKOrders = {
    getAll() {
        return window.JDKStore ? JDKStore.orders.getAll() : [];
    },
    save(order) {
        return JDKStore.orders.save(order);
    }
};

/* JDK Enterprises v18.0 — Firebase marketplace service adapter */
(function () {
  const Backend = {
    app: null, auth: null, db: null, storage: null, functions: null, connected: false,
    ready: Promise.resolve(null),

    init() {
      const config = window.JDK_FIREBASE_CONFIG || {};
      const configured = Boolean(config.apiKey && config.projectId && !String(config.apiKey).startsWith("YOUR_") && !String(config.projectId).startsWith("YOUR_"));
      if (!configured || !window.firebase) return false;

      this.app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.storage = firebase.storage?.() || null;
      this.functions = firebase.functions?.() || null;
      this.connected = true;
      this.ready = new Promise(resolve => {
        this.auth.onAuthStateChanged(user => {
          if (user) {
            JDKStore.auth.setUser({
              id: user.uid, uid: user.uid, email: user.email || "",
              name: user.displayName || JDKStore.customer.get().name || "",
              phone: JDKStore.customer.get().phone || ""
            });
          } else JDKStore.auth.signOut();
          resolve(user || null);
        });
      });
      return true;
    },

    isConnected() { return this.connected; },
    async waitForAuth() { return this.ready; },

    async signUp({ email, password, name, phone }) {
      if (!this.auth) throw new Error("Firebase is not configured. Add your project keys in firebase-config.js.");
      const credential = await this.auth.createUserWithEmailAndPassword(email, password);
      await credential.user.updateProfile({ displayName: name });
      const profile = { name, phone, email, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      await this.db.collection("users").doc(credential.user.uid).set(profile, { merge: true });
      JDKCustomer.save({ ...JDKCustomer.get(), name, phone });
      const user = { id: credential.user.uid, uid: credential.user.uid, email, name, phone };
      JDKStore.auth.setUser(user);
      return user;
    },

    async signIn({ email, password }) {
      if (!this.auth) throw new Error("Firebase is not configured. Add your project keys in firebase-config.js.");
      const credential = await this.auth.signInWithEmailAndPassword(email, password);
      const snap = await this.db.collection("users").doc(credential.user.uid).get();
      const profile = snap.exists ? snap.data() : {};
      JDKCustomer.save({ ...JDKCustomer.get(), name: profile.name || credential.user.displayName || "", phone: profile.phone || "" });
      const user = { id: credential.user.uid, uid: credential.user.uid, email: credential.user.email || email, name: profile.name || credential.user.displayName || "", phone: profile.phone || "" };
      JDKStore.auth.setUser(user);
      return user;
    },

    async signOut() {
      if (this.auth) await this.auth.signOut();
      JDKStore.auth.signOut();
    },

    async getUser() {
      await this.waitForAuth();
      return this.auth?.currentUser || JDKStore.auth.getUser();
    },

    async getNotifications(limit = 50) {
      const user = await this.getUser();
      if (!this.db || !user) return [];
      const snap = await this.db.collection("notifications").where("userId", "==", user.uid).orderBy("createdAt", "desc").limit(limit).get();
      return snap.docs.map(doc => ({ id:doc.id, ...doc.data() }));
    },

    async markNotificationRead(notificationId) {
      const user = await this.getUser(); if (!this.db || !user) throw new Error("Sign in to manage notifications.");
      await this.db.collection("notifications").doc(notificationId).update({ read:true });
    },

    async markAllNotificationsRead() {
      const rows = (await this.getNotifications(100)).filter(row => !row.read);
      const batch = this.db.batch(); rows.forEach(row => batch.update(this.db.collection("notifications").doc(row.id), { read:true }));
      if (rows.length) await batch.commit(); return rows.length;
    },

    async registerPushNotifications() {
      const user = await this.getUser();
      if (!user || !firebase.messaging || !this.db) throw new Error("Push notifications are unavailable.");
      if (!("Notification" in window) || !("serviceWorker" in navigator)) throw new Error("This browser does not support web push notifications.");
      const permission = await Notification.requestPermission(); if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const vapidKey = String(window.JDK_FIREBASE_VAPID_KEY || ""); if (!vapidKey || vapidKey.startsWith("YOUR_")) throw new Error("Add your Firebase Web Push VAPID key in firebase-config.js.");
      const registration = await navigator.serviceWorker.register("firebase-messaging-sw.js");
      const token = await firebase.messaging().getToken({ vapidKey, serviceWorkerRegistration:registration }); if (!token) throw new Error("Firebase did not return a push token.");
      const tokenId = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)).then(buf => Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""));
      await this.db.collection("users").doc(user.uid).collection("fcmTokens").doc(tokenId).set({ token, platform:navigator.userAgent.slice(0,250), updatedAt:firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
      return token;
    },

    async loadCatalog() {
      if (!this.db) return JDKStore.items;
      try {
        const snap = await this.db.collection("products").where("active", "==", true).where("approvalStatus", "==", "approved").orderBy("createdAt", "desc").get();
        if (snap.empty) return JDKStore.items;
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        JDKStore.setItems(items);
        window.dispatchEvent(new CustomEvent("jdk:catalog-ready", { detail: items }));
        return items;
      } catch (error) {
        console.warn("JDK catalog fallback active:", error.message);
        return JDKStore.items;
      }
    },

    async isAdmin(forceRefresh = false) {
      const user = await this.getUser();
      if (!this.auth || !user || typeof user.getIdTokenResult !== "function") return false;
      const token = await user.getIdTokenResult(forceRefresh);
      return token.claims?.admin === true;
    },

    async requireAdmin() {
      if (!await this.isAdmin()) throw new Error("Administrator access required.");
      return this.auth.currentUser;
    },

    async getAdminDashboard() {
      await this.requireAdmin();
      const [productsSnap, sellersSnap, ordersSnap, financeSnap, reviewsSnap, casesSnap, conversationsSnap, promotionsSnap] = await Promise.all([
        this.db.collection("products").get(),
        this.db.collection("sellers").get(),
        this.db.collection("orders").get(),
        this.db.collection("financeLedger").get(),
        this.db.collection("reviews").get(),
        this.db.collection("supportCases").get(),
        this.db.collection("conversations").where("supportStatus", "==", "escalated").get(),
        this.db.collection("promotions").get()
      ]);
      const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sellers = sellersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const finance = financeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const reviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const cases = casesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const escalations = conversationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const promotions = promotionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return {
        products, sellers, orders, finance, reviews, cases, escalations, promotions,
        stats: {
          pending: products.filter(item => item.approvalStatus === "pending").length,
          approved: products.filter(item => item.approvalStatus === "approved" && item.active === true).length,
          sellers: sellers.length, orders: orders.length,
          revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
          paidVolume: orders.filter(order => order.paymentStatus === "paid").reduce((sum, order) => sum + Number(order.total || 0), 0),
          commissionEarned: finance.reduce((sum, row) => sum + Number(row.amount || 0), 0)
        }
      };
    },

    async reviewProduct(productId, decision) {
      await this.requireAdmin();
      if (!productId || !["approved", "rejected"].includes(decision)) throw new Error("Invalid review decision.");
      const ref = this.db.collection("products").doc(productId);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Product no longer exists.");
      await ref.update({
        approvalStatus: decision, active: decision === "approved",
        reviewedBy: this.auth.currentUser.uid,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { id: productId, approvalStatus: decision, active: decision === "approved" };
    },

    async getSellerProfile() {
      const user = await this.getUser();
      if (!this.db || !user) return null;
      const snap = await this.db.collection("sellers").doc(user.uid).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    },

    async registerSeller({ shopName, phone }) {
      const user = await this.getUser();
      if (!this.db || !user) throw new Error("Sign in before opening a seller account.");
      const seller = {
        ownerId: user.uid, shopName: String(shopName || "").trim(), phone: String(phone || "").trim(),
        status: "active", createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (!seller.shopName || !seller.phone) throw new Error("Shop name and phone are required.");
      await this.db.collection("sellers").doc(user.uid).set(seller, { merge: true });
      return seller;
    },

    async uploadProductImage(file) {
      const user = await this.getUser();
      if (!this.storage || !user) throw new Error("Sign in before uploading product images.");
      if (!file) throw new Error("Choose a product image.");
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Product images must be 5 MB or smaller.");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `product-images/${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const ref = this.storage.ref().child(path);
      await ref.put(file, { contentType: file.type });
      return { url: await ref.getDownloadURL(), path };
    },

    async validateCartStock(cart) {
      if (!this.db) return cart;
      for (const item of cart || []) {
        if (!item.id || !item.sellerId) continue;
        const snap = await this.db.collection("products").doc(item.id).get();
        if (!snap.exists) throw new Error(`${item.name} is no longer available.`);
        const product = snap.data();
        const stock = Number(product.stock || 0);
        if (!product.active || product.approvalStatus !== "approved") throw new Error(`${item.name} is not currently available.`);
        if (Number(item.quantity || 0) > stock) throw new Error(`Only ${stock} unit(s) of ${item.name} are currently in stock.`);
      }
      return cart;
    },

    async publishProduct(product) {
      const user = await this.getUser();
      if (!this.db || !user) throw new Error("Sign in before publishing products.");
      const seller = await this.getSellerProfile();
      if (!seller || seller.status !== "active") throw new Error("Activate your seller account first.");
      const payload = {
        name: String(product.name || "").trim(), price: Number(product.price),
        image: String(product.image || "").trim(), imagePath: String(product.imagePath || "").trim(), stock: Number(product.stock), variants: product.variants || { sizes: [], colors: [] }, category: String(product.category || "").trim(),
        type: "product", description: String(product.description || "").trim(), sellerId: user.uid,
        shopName: seller.shopName, active: false, approvalStatus: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (!payload.name || !Number.isFinite(payload.price) || payload.price <= 0 || !Number.isInteger(payload.stock) || payload.stock < 0 || !payload.image || !payload.category || !payload.description)
        throw new Error("Complete all required product fields with a valid price.");
      const ref = await this.db.collection("products").add(payload);
      return { id: ref.id, ...payload };
    },

    async getSellerProducts() {
      const user = await this.getUser();
      if (!this.db || !user) return [];
      const snap = await this.db.collection("products").where("sellerId", "==", user.uid).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(b.id).localeCompare(String(a.id)));
    },

    async updateSellerProduct(productId, product) {
      const user = await this.getUser();
      if (!this.db || !user) throw new Error("Sign in before editing products.");
      const ref = this.db.collection("products").doc(productId);
      const snap = await ref.get();
      if (!snap.exists || snap.data().sellerId !== user.uid) throw new Error("You can only edit your own products.");
      const payload = {
        name: String(product.name || "").trim(), price: Number(product.price),
        image: String(product.image || "").trim(), imagePath: String(product.imagePath || "").trim(), stock: Number(product.stock), variants: product.variants || { sizes: [], colors: [] }, category: String(product.category || "").trim(),
        description: String(product.description || "").trim(), active: false, approvalStatus: "pending",
        reviewedBy: firebase.firestore.FieldValue.delete(), reviewedAt: firebase.firestore.FieldValue.delete(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (!payload.name || !Number.isFinite(payload.price) || payload.price <= 0 || !Number.isInteger(payload.stock) || payload.stock < 0 || !payload.image || !payload.category || !payload.description)
        throw new Error("Complete all required product fields with a valid price.");
      await ref.update(payload);
      return { id: productId, ...payload };
    },

    async getSellerOrders() {
      const user = await this.getUser();
      if (!this.db || !user) return [];
      const snap = await this.db.collection("orders").where("sellerIds", "array-contains", user.uid).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data(), products: (doc.data().products || []).filter(item => item.sellerId === user.uid) }))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    },

    async updateSellerFulfilment(orderId, status, trackingNumber = "", carrier = "") {
      const user = await this.getUser();
      if (!user || !this.functions) throw new Error("Sign in and load Firebase Functions before updating fulfilment.");
      const result = await this.functions.httpsCallable("updateSellerFulfilment")({ orderId, status, trackingNumber, carrier });
      return result.data;
    },

    async recordDeliveryEvidence(orderId, reference, note = "") {
      await this.requireAdmin();
      if (!this.functions) throw new Error("Firebase Cloud Functions is not loaded.");
      const result = await this.functions.httpsCallable("recordDeliveryEvidence")({ orderId, reference, note });
      return result.data;
    },

    async updateOrderStatus(orderId, status) {
      await this.requireAdmin();
      if (!this.functions) throw new Error("Firebase Cloud Functions is not loaded.");
      const callable = this.functions.httpsCallable("updateOrderStatus");
      const result = await callable({ orderId, status });
      return result.data;
    },


    async initiateMobileMoneyPayment(orderId) {
      const user = await this.getUser();
      if (!user || !this.functions) throw new Error("Sign in and load Firebase Functions before starting payment.");
      const result = await this.functions.httpsCallable("initiateMobileMoneyPayment")({ orderId });
      return result.data;
    },

    async reconcilePayment(orderId) {
      await this.requireAdmin();
      const result = await this.functions.httpsCallable("reconcilePayment")({ orderId });
      return result.data;
    },

    async settlePayment(orderId, reference) {
      await this.requireAdmin();
      if (!this.functions) throw new Error("Firebase Cloud Functions is not loaded.");
      const result = await this.functions.httpsCallable("settlePayment")({ orderId, reference });
      return result.data;
    },

    async getSellerEarnings() {
      const user = await this.getUser();
      if (!this.db || !user) return [];
      const snap = await this.db.collection("sellerLedger").where("sellerId", "==", user.uid).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async createPromotion(data) { await this.requireAdmin(); const result = await this.functions.httpsCallable("createPromotion")(data); return result.data; },
    async setPromotionStatus(promotionId, status) { await this.requireAdmin(); const result = await this.functions.httpsCallable("setPromotionStatus")({ promotionId, status }); return result.data; },

    async getDeliveryOptions() {
      if (!this.functions) throw new Error("Firebase Cloud Functions is not loaded.");
      const result = await this.functions.httpsCallable("getDeliveryOptions")({});
      return result.data;
    },

    async getAddresses() {
      const user = await this.getUser(); if (!this.db || !user) return [];
      const snap = await this.db.collection("users").doc(user.uid).collection("addresses").get();
      return snap.docs.map(doc => ({ id:doc.id, ...doc.data() }));
    },

    async saveAddress(address) {
      const user = await this.getUser(); if (!this.db || !user) throw new Error("Sign in to save an address.");
      const clean = { label:String(address.label||"").trim().slice(0,50), location:String(address.location||"").trim().slice(0,250), zoneId:String(address.zoneId||""), updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
      if (!clean.label || !clean.location || !clean.zoneId) throw new Error("Address label, location and delivery zone are required.");
      const ref = address.id ? this.db.collection("users").doc(user.uid).collection("addresses").doc(address.id) : this.db.collection("users").doc(user.uid).collection("addresses").doc();
      await ref.set(clean, { merge:true }); return { id:ref.id, ...clean };
    },

    async deleteAddress(id) {
      const user = await this.getUser(); if (!this.db || !user) throw new Error("Sign in to manage addresses.");
      await this.db.collection("users").doc(user.uid).collection("addresses").doc(id).delete();
    },

    async saveOrder(order) {
      const user = await this.getUser();
      if (!this.db || !user) throw new Error("Sign in before placing an online order.");
      if (!this.functions) throw new Error("Firebase Cloud Functions is not loaded on checkout.");
      const callable = this.functions.httpsCallable("createOrder");
      const result = await callable({
        products: (order.products || []).map(item => ({ id: item.id, quantity: Number(item.quantity || 0), selectedSize: item.selectedSize || null, selectedColor: item.selectedColor || null })),
        customer: order.customer,
        payment: order.payment,
        mobileMoneyProvider: order.mobileMoneyProvider || null,
        couponCode: order.couponCode || "",
        deliveryMethod: order.deliveryMethod,
        deliveryZoneId: order.deliveryZoneId || null,
        pickupPointId: order.pickupPointId || null
      });
      const saved = { ...order, ...result.data.order };
      JDKOrders.save(saved);
      return saved;
    },

    async cancelOrder(orderId) {
      const user = await this.getUser();
      if (!user || !this.functions) throw new Error("Sign in before cancelling an order.");
      const result = await this.functions.httpsCallable("cancelOrder")({ orderId });
      return result.data;
    },


    async getProductReviews(productId) {
      if (!this.db || !productId) return [];
      const snap = await this.db.collection("reviews").where("productId", "==", productId).where("moderationStatus", "==", "published").get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    },

    async createReview({ productId, rating, message }) {
      const user = await this.getUser(); if (!user || !this.functions) throw new Error("Sign in before reviewing a product.");
      const result = await this.functions.httpsCallable("createReview")({ productId, rating, message }); return result.data;
    },

    async moderateReview(reviewId, status) {
      await this.requireAdmin();
      const result = await this.functions.httpsCallable("moderateReview")({ reviewId, status }); return result.data;
    },

    async getConversations() {
      const user = await this.getUser();
      if (!this.db || !user) return [];
      const snap = await this.db.collection("conversations").where("participantIds", "array-contains", user.uid).get();
      return snap.docs.map(doc => ({ id:doc.id, ...doc.data() })).sort((a,b) => Number(b.lastMessageAt?.seconds || 0) - Number(a.lastMessageAt?.seconds || 0));
    },

    async createConversation({ sellerId = "", productId = "", orderId = "", type = "buyer_seller" } = {}) {
      const user = await this.getUser();
      if (!user || !this.functions) throw new Error("Sign in to start a secure conversation.");
      const result = await this.functions.httpsCallable("createConversation")({ sellerId, productId, orderId, type });
      return result.data;
    },

    listenToConversation(conversationId, onMessages, onError) {
      if (!this.db || !conversationId) return () => {};
      return this.db.collection("conversations").doc(conversationId).collection("messages").orderBy("createdAt", "asc").limit(200)
        .onSnapshot(snap => onMessages(snap.docs.map(doc => ({ id:doc.id, ...doc.data() }))), onError);
    },

    async sendMessage(conversationId, text) {
      const user = await this.getUser();
      if (!user || !this.functions) throw new Error("Sign in to send messages.");
      const result = await this.functions.httpsCallable("sendConversationMessage")({ conversationId, text });
      return result.data;
    },

    async markConversationRead(conversationId) {
      const user = await this.getUser();
      if (!user || !this.functions) return;
      await this.functions.httpsCallable("markConversationRead")({ conversationId });
    },

    async createDispute(orderId, conversationId, reason) { const result = await this.functions.httpsCallable("createDispute")({ orderId, conversationId, reason }); return result.data; },
    async addCaseEvidence(caseId, note, url = "") { const result = await this.functions.httpsCallable("addCaseEvidence")({ caseId, note, url }); return result.data; },
    async resolveSupportCase(caseId, status, resolution, adminNote = "") { const result = await this.functions.httpsCallable("resolveSupportCase")({ caseId, status, resolution, adminNote }); return result.data; },
    async issueOrderRefund(caseId, reference, note = "") { const result = await this.functions.httpsCallable("issueOrderRefund")({ caseId, reference, note }); return result.data; },

    async escalateConversation(conversationId, reason = "") {
      const user = await this.getUser();
      if (!user || !this.functions) throw new Error("Sign in to request JDK support.");
      const result = await this.functions.httpsCallable("escalateConversation")({ conversationId, reason });
      return result.data;
    },

    async trackEvent(type, details = {}) {
      if (!this.functions) return false;
      let sessionId = sessionStorage.getItem("jdk_analytics_session");
      if (!sessionId) { sessionId = (crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`).replace(/[^a-zA-Z0-9_-]/g, ""); sessionStorage.setItem("jdk_analytics_session", sessionId); }
      try { await this.functions.httpsCallable("trackMarketplaceEvent")({ type, sessionId, ...details }); return true; } catch (error) { console.warn("JDK analytics event skipped:", error.message); return false; }
    },

    async getMarketplaceAnalytics() { await this.requireAdmin(); const result = await this.functions.httpsCallable("getMarketplaceAnalytics")({}); return result.data; },
    async getSellerAnalytics() { const user = await this.getUser(); if (!user || !this.functions) throw new Error("Seller sign-in required."); const result = await this.functions.httpsCallable("getSellerAnalytics")({}); return result.data; },

    async getOrders() {
      const user = await this.getUser();
      if (!this.db || !user) return JDKOrders.getAll();
      const snap = await this.db.collection("orders").where("userId", "==", user.uid).get();
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      JDKStore.orders.replaceAll(orders);
      return orders;
    }
  };

  window.JDKBackend = Backend;
  Backend.init();
})();

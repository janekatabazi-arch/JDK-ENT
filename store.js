
/* JDK ENT v2.4 — data repository layer
   Replace these methods with fetch/API calls when the backend is connected. */
window.JDKStore = {
    read(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch {
            return fallback;
        }
    },

    write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        return value;
    },

    customer: {
        get() {
            return JDKStore.read("jdkCustomer", { name: "", phone: "", location: "" });
        },
        save(customer) {
            return JDKStore.write("jdkCustomer", {
                name: String(customer.name || "").trim(),
                phone: String(customer.phone || "").trim(),
                location: String(customer.location || "").trim()
            });
        }
    },

    orders: {
        getAll() {
            return JDKStore.read("jdkOrders", []);
        },
        save(order) {
            const orders = this.getAll();
            orders.unshift(order);
            JDKStore.write("jdkOrders", orders);
            JDKStore.write("lastOrder", order);
            return order;
        }
    },


    auth: {
        getUser() {
            return JDKStore.read("jdkAuthUser", null);
        },
        register(details) {
            const user = {
                id: "USR-" + Date.now().toString(36).toUpperCase(),
                name: String(details.name || "").trim(),
                phone: String(details.phone || "").trim(),
                createdAt: new Date().toISOString()
            };
            JDKStore.write("jdkAuthUser", user);
            JDKStore.write("jdkAuthSession", { userId: user.id, signedInAt: new Date().toISOString() });
            return user;
        },
        signIn(phone) {
            const user = this.getUser();
            if (!user || user.phone !== String(phone || "").trim()) return null;
            JDKStore.write("jdkAuthSession", { userId: user.id, signedInAt: new Date().toISOString() });
            return user;
        },
        isSignedIn() {
            const user = this.getUser();
            const session = JDKStore.read("jdkAuthSession", null);
            return Boolean(user && session && session.userId === user.id);
        },
        signOut() {
            localStorage.removeItem("jdkAuthSession");
        }
    },

    session: {
        get() {
            return JDKStore.read("jdkSession", { guestId: "", createdAt: "" });
        },
        ensure() {
            let session = this.get();
            if (!session.guestId) {
                session = {
                    guestId: "GUEST-" + Date.now().toString(36).toUpperCase(),
                    createdAt: new Date().toISOString()
                };
                JDKStore.write("jdkSession", session);
            }
            return session;
        }
    }
};

JDKStore.session.ensure();

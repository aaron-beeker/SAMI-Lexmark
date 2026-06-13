import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchAdmins = async () => {
    if (!auth.currentUser) return;
    setLoadingAdmins(true);
    try {
      const adminsColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "administradores");
      const snapshot = await getDocs(adminsColRef);
      const list = [];
      snapshot.forEach(doc => {
        list.push({
          email: doc.id,
          ...doc.data()
        });
      });
      setAdmins(list);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAdmins();
    } else {
      setAdmins([]);
    }
  }, [user]);

  const addAdmin = async (newEmail) => {
    if (!user || !newEmail) return false;
    const cleanEmail = newEmail.trim().toLowerCase();
    try {
      const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "administradores", cleanEmail);
      await setDoc(docRef, {
        email: cleanEmail,
        fecha_creacion: new Date(),
        creado_por: user.email
      });
      await fetchAdmins();
      return true;
    } catch (error) {
      console.error("Error adding admin:", error);
      return false;
    }
  };

  const removeAdmin = async (adminEmail) => {
    if (!user || !adminEmail) return false;
    const cleanEmail = adminEmail.trim().toLowerCase();
    if (cleanEmail === user.email.toLowerCase()) {
      return false;
    }
    try {
      const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "administradores", cleanEmail);
      await deleteDoc(docRef);
      await fetchAdmins();
      return true;
    } catch (error) {
      console.error("Error removing admin:", error);
      return false;
    }
  };

  const loginWithGoogle = async () => {
    setLoginError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      
      const adminsColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "administradores");
      const snapshot = await getDocs(adminsColRef);
      
      if (snapshot.empty) {
        // Bootstrap first admin automatically
        await setDoc(doc(adminsColRef, email.toLowerCase()), {
          email: email.toLowerCase(),
          fecha_creacion: new Date(),
          creado_por: "Sistema (Autocreado)"
        });
      } else {
        const userDocRef = doc(adminsColRef, email.toLowerCase());
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          let found = false;
          snapshot.forEach(doc => {
            if (doc.data().email?.toLowerCase() === email.toLowerCase()) {
              found = true;
            }
          });
          if (!found) {
            await signOut(auth);
            setLoginError(`El correo ${email} no está autorizado como administrador.`);
            return false;
          }
        }
      }
      
      setIsLoginModalOpen(false);
      return true;
    } catch (error) {
      console.error("Auth Google login error:", error);
      let friendlyMessage = "Error al iniciar sesión con Google.";
      if (error.code === "auth/popup-closed-by-user") {
        friendlyMessage = "La ventana de inicio de sesión fue cerrada.";
      } else if (error.code === "auth/blocked-by-popup-killer") {
        friendlyMessage = "El navegador bloqueó la ventana emergente de inicio de sesión.";
      } else if (error.code === "auth/operation-not-allowed") {
        friendlyMessage = "El proveedor de inicio de sesión de Google no está habilitado en la consola de Firebase.";
      }
      setLoginError(friendlyMessage);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Auth logout error:", error);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    loading,
    loginError,
    setLoginError,
    isLoginModalOpen,
    setIsLoginModalOpen,
    loginWithGoogle,
    logout,
    admins,
    loadingAdmins,
    addAdmin,
    removeAdmin,
    fetchAdmins
  };
}

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users,
  ReceiptIndianRupee, 
  Settings,
  LogOut,
  Moon,
  Sun,
  X,
} from "lucide-react";
import logoImg from "./assets/logo.png";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";

const transition = { duration: 0.15, ease: [0.22, 1, 0.36, 1] };

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/products", label: "Products", icon: Package },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/transactions", label: "Transactions", icon: ReceiptIndianRupee },
  { path: "/settings", label: "Settings", icon: Settings },
];

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const { signOut, user } = useAuth();
  const { showToast } = useToast();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      navigate("/");
      showToast("You have been logged out.", "info");
    } catch (err) {
      showToast(err.message || "Could not log out. Please try again.", "error");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNav = () => {
    onMobileClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      )}
      <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="app-sidebar__brand">
          <img src={logoImg} alt="SellerSync" className="brand-mark" style={{ width: "24px", height: "24px", borderRadius: "50%" }} />
          <span>SellerSync</span>
          <button type="button" className="sidebar-close-mobile" onClick={onMobileClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="app-sidebar__nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNav}
                className={({ isActive }) =>
                  `app-sidebar__link ${isActive ? "is-active" : ""}`
                }
              >
                {({ isActive }) => (
                  <motion.span
                    className="app-sidebar__link-inner"
                    whileTap={{ scale: 0.98 }}
                    transition={transition}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                    <span>{item.label}</span>
                  </motion.span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__user">{user?.email || "User"}</div>
          <div className="app-sidebar__plan">Seller account</div>

          <button
            type="button"
            className="app-sidebar__theme"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>

          <motion.button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="app-sidebar__logout"
            whileTap={{ scale: 0.98 }}
            transition={transition}
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </motion.button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

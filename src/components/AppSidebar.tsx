import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  Store,
  LogOut,
  Users,
  IndianRupee,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: false },
  { title: "Products", url: "/products", icon: Package, adminOnly: false },
  { title: "New Sale", url: "/billing", icon: ShoppingCart, adminOnly: false },
  { title: "Sales History", url: "/sales", icon: Receipt, adminOnly: false },
  { title: "Reports", url: "/reports", icon: BarChart3, adminOnly: true },
  { title: "Credit / Udhari", url: "/credit", icon: IndianRupee, adminOnly: true },
  { title: "Users", url: "/users", icon: Users, adminOnly: true },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { isAdmin, role } = useRole();

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Store className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-accent-foreground font-heading">
              Pravinkumar
            </h2>
            <p className="text-xs text-sidebar-foreground/60">General Store</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-4">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-sidebar-foreground/60 truncate">
            {user?.email}
          </span>
          {role && (
            <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px]">
              {role}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, User, Settings } from "lucide-react";

interface AuthNavProps {
  isAuthenticated: boolean;
  userEmail?: string;
}

export default function AuthNav({ isAuthenticated, userEmail }: AuthNavProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      // Redirect to home page
      window.location.href = "/";
    } catch (err) {
    } finally {
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <nav className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <a href="/login">Zaloguj się</a>
        </Button>
        <Button asChild size="sm">
          <a href="/register">Zarejestruj się</a>
        </Button>
      </nav>
    );
  }

  return (
    <>
      <nav className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <User className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{userEmail}</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <a href="/account">
            <Settings />
            <span className="hidden sm:inline">Moje konto</span>
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsLogoutDialogOpen(true)}
        >
          <LogOut />
          <span className="hidden sm:inline">Wyloguj</span>
        </Button>
      </nav>

      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wylogowanie</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz się wylogować?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              disabled={isLoggingOut}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


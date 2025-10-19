import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/db/supabase.client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email || !password) {
      setError("Proszę wypełnić wszystkie pola.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Proszę podać prawidłowy adres e-mail.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Map Supabase errors to user-friendly messages
        if (authError.message.includes("Invalid login credentials")) {
          setError("Nieprawidłowy adres e-mail lub hasło.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Proszę potwierdzić swój adres e-mail przed zalogowaniem.");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.user) {
        // Redirect to dashboard on success
        window.location.href = "/dashboard";
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd podczas logowania.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6" data-testid="login-form">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold" data-testid="login-heading">
          Zaloguj się
        </h1>
        <p className="text-muted-foreground">Wprowadź swoje dane, aby uzyskać dostęp do konta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            aria-invalid={error ? "true" : "false"}
            autoComplete="email"
            data-testid="login-email-input"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Hasło</Label>
            <a
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
              data-testid="forgot-password-link"
            >
              Zapomniałeś hasła?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            aria-invalid={error ? "true" : "false"}
            autoComplete="current-password"
            data-testid="login-password-input"
          />
        </div>

        {error && (
          <Alert variant="destructive" data-testid="login-error-alert">
            <AlertCircle />
            <AlertTitle>Błąd logowania</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isLoading} className="w-full" data-testid="login-submit-button">
          {isLoading ? "Logowanie..." : "Zaloguj się"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Nie masz jeszcze konta? </span>
        <a href="/register" className="text-primary hover:underline font-medium" data-testid="register-link">
          Zarejestruj się
        </a>
      </div>
    </div>
  );
}
